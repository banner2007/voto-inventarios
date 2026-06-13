import { readTable, appendRows, updateRow } from './googleSheets.js';
import { logAudit } from './audit.js';
import { Mutex } from 'async-mutex';
import crypto from 'crypto';

const inventoryMutex = new Mutex();

// --- 1. GESTIÓN DE PROVEEDORES ---

export async function getSuppliers() {
  return await readTable('Proveedores');
}

export async function createSupplier(data, username) {
  return await inventoryMutex.runExclusive(async () => {
    const suppliers = await readTable('Proveedores');
    
    // Generar ID Secuencial único no editable
    let maxId = 0;
    suppliers.forEach(s => {
      const match = s.IdProveedor.match(/PROV-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxId) maxId = num;
      }
    });
    const newId = `PROV-${String(maxId + 1).padStart(4, '0')}`;

    const newSupplier = {
      IdProveedor: newId,
      Nombre: data.nombre.trim(),
      Telefono: data.telefono.trim(),
      Direccion: data.direccion.trim(),
      LogoUrl: data.logoUrl || '',
      FechaRegistro: new Date().toISOString()
    };

    await appendRows('Proveedores', [newSupplier]);
    await logAudit(username, `Creó proveedor ${newSupplier.Nombre} (${newSupplier.IdProveedor})`);
    
    return newSupplier;
  });
}

export async function updateSupplier(id, data, username) {
  return await inventoryMutex.runExclusive(async () => {
    const updated = {
      Nombre: data.nombre.trim(),
      Telefono: data.telefono.trim(),
      Direccion: data.direccion.trim(),
      LogoUrl: data.logoUrl || ''
    };
    
    await updateRow('Proveedores', 'IdProveedor', id, updated);
    await logAudit(username, `Editó proveedor ${updated.Nombre} (${id})`);
    return { IdProveedor: id, ...updated };
  });
}


// --- 2. CATÁLOGO DE PRODUCTOS ---

export async function getProducts() {
  const products = await readTable('Productos');
  // Asegurar que los tipos de datos sean correctos (numéricos para precios y stock)
  return products.map(p => ({
    ...p,
    PrecioCompra: parseFloat(p.PrecioCompra) || 0,
    PrecioVenta: parseFloat(p.PrecioVenta) || 0,
    StockActual: parseInt(p.StockActual, 10) || 0
  }));
}

export async function createProduct(data, username) {
  return await inventoryMutex.runExclusive(async () => {
    const products = await readTable('Productos');
    const reference = data.referencia.trim().toUpperCase();
    
    // Validar referencia única
    const exists = products.some(p => p.Referencia.toUpperCase() === reference);
    if (exists) {
      throw new Error(`Ya existe un producto con la referencia ${reference}.`);
    }

    const uuid = crypto.randomUUID();
    const precioCompra = parseFloat(data.precioCompra) || 0;
    
    // Regla: Precio venta inicial = Precio compra * 1.40
    const precioVenta = precioCompra > 0 ? precioCompra * 1.40 : 0;

    const newProduct = {
      IdProducto: uuid,
      Referencia: reference,
      Nombre: data.nombre.trim(),
      Caracteristicas: data.caracteristicas ? data.caracteristicas.trim() : '',
      FotoUrl: data.fotoUrl, // Obligatorio en catálogo
      PrecioCompra: precioCompra,
      PrecioVenta: precioVenta,
      StockActual: 0, // Inicia en cero, se alimenta por Compras
      FechaRegistro: new Date().toISOString()
    };

    await appendRows('Productos', [newProduct]);
    await logAudit(username, `Creó producto ${newProduct.Nombre} (Ref: ${newProduct.Referencia})`);
    
    return newProduct;
  });
}

export async function updateProduct(id, data, username) {
  return await inventoryMutex.runExclusive(async () => {
    const products = await readTable('Productos');
    const product = products.find(p => p.IdProducto === id);
    if (!product) throw new Error('Producto no encontrado.');

    const updated = {
      Nombre: data.nombre.trim(),
      Caracteristicas: data.caracteristicas ? data.caracteristicas.trim() : '',
      FotoUrl: data.fotoUrl || product.FotoUrl
    };

    await updateRow('Productos', 'IdProducto', id, updated);
    await logAudit(username, `Editó detalles del producto ${updated.Nombre} (Ref: ${product.Referencia})`);
    
    return { ...product, ...updated };
  });
}


// --- 3. INGRESO DE COMPRAS ---

export async function registerPurchase(header, items, username) {
  return await inventoryMutex.runExclusive(async () => {
    const products = await getProducts();
    const suppliers = await getSuppliers();
    
    const supplier = suppliers.find(s => s.IdProveedor === header.idProveedor);
    if (!supplier) throw new Error('Proveedor no encontrado.');

    const idCompra = crypto.randomUUID();

    // 1. Validar y procesar cada artículo comprado
    const detailsToAppend = [];
    const movementsToAppend = [];
    const productsToUpdate = [];

    let calculatedTotalIva = 0;
    let calculatedTotalCompra = 0;

    for (const item of items) {
      const prod = products.find(p => p.Referencia.toUpperCase() === item.referencia.trim().toUpperCase());
      if (!prod) {
        throw new Error(`El producto con referencia ${item.referencia} no existe en el catálogo. Primero debe crearlo.`);
      }

      const cantidad = parseInt(item.cantidad, 10);
      const precioCosto = parseFloat(item.precioCosto);
      const ivaPagado = parseFloat(item.ivaPagado) || 0;
      const totalFila = (cantidad * precioCosto) + ivaPagado;

      calculatedTotalIva += ivaPagado;
      calculatedTotalCompra += totalFila;

      // Detalle de Compra
      detailsToAppend.push({
        IdCompraDetalle: crypto.randomUUID(),
        IdCompra: idCompra,
        ReferenciaProducto: prod.Referencia,
        NombreProducto: prod.Nombre,
        Cantidad: cantidad,
        PrecioCosto: precioCosto,
        IvaPagado: ivaPagado,
        Total: totalFila
      });

      // Movimiento de inventario (ENTRADA)
      movementsToAppend.push({
        IdMovimiento: crypto.randomUUID(),
        ReferenciaProducto: prod.Referencia,
        Tipo: 'ENTRADA',
        Cantidad: cantidad,
        PrecioUnitario: precioCosto,
        ReferenciaDocumento: header.facturaNum,
        Usuario: username,
        Fecha: new Date().toISOString()
      });

      // Actualizar información del producto
      const nuevoStock = prod.StockActual + cantidad;
      
      // Si el precio de compra cambia, se actualiza el PrecioCompra. 
      // Si el precio de venta nunca fue configurado manualmente (o si queremos refrescar el default),
      // actualizamos el precio de venta sugerido (PrecioCompra * 1.40)
      const nuevoPrecioVenta = prod.PrecioCompra === 0 || prod.PrecioVenta === prod.PrecioCompra * 1.40 
        ? precioCosto * 1.40 
        : prod.PrecioVenta;

      productsToUpdate.push({
        id: prod.IdProducto,
        data: {
          PrecioCompra: precioCosto, // Actualiza con el último costo
          PrecioVenta: nuevoPrecioVenta,
          StockActual: nuevoStock
        }
      });
    }

    // 2. Guardar Encabezado de Compra
    const newPurchase = {
      IdCompra: idCompra,
      IdProveedor: header.idProveedor,
      ProveedorNombre: supplier.Nombre,
      FacturaNum: header.facturaNum.trim(),
      FechaCompra: header.fechaCompra, // YYYY-MM-DD
      TotalIva: calculatedTotalIva,
      TotalCompra: calculatedTotalCompra,
      Usuario: username,
      FechaRegistro: new Date().toISOString()
    };

    await appendRows('Compras', [newPurchase]);
    await appendRows('CompraDetalles', detailsToAppend);
    await appendRows('Movimientos', movementsToAppend);

    // Actualizar los productos en Google Sheets secuencialmente
    for (const itemToUpdate of productsToUpdate) {
      await updateRow('Productos', 'IdProducto', itemToUpdate.id, itemToUpdate.data);
    }

    await logAudit(username, `Registró compra factura #${newPurchase.FacturaNum} del proveedor ${newPurchase.ProveedorNombre}. Total: $${newPurchase.TotalCompra}`);

    return { idCompra, totalCompra: calculatedTotalCompra };
  });
}


// --- 4. SALIDA / EGRESOS DE INVENTARIO ---

export async function registerSale(saleItems, username) {
  return await inventoryMutex.runExclusive(async () => {
    const products = await getProducts();
    const movementsToAppend = [];
    const productsToUpdate = [];

    // Validar existencias antes de realizar cualquier cambio
    for (const item of saleItems) {
      const prod = products.find(p => p.Referencia.toUpperCase() === item.referencia.trim().toUpperCase());
      if (!prod) {
        throw new Error(`Producto con referencia ${item.referencia} no encontrado.`);
      }

      const cantidadSalida = parseInt(item.cantidad, 10);
      if (cantidadSalida <= 0) {
        throw new Error(`La cantidad de salida para ${prod.Nombre} debe ser mayor a cero.`);
      }

      if (prod.StockActual < cantidadSalida) {
        throw new Error(`Stock insuficiente para ${prod.Nombre} (Ref: ${prod.Referencia}). Disponible: ${prod.StockActual}, Solicitado: ${cantidadSalida}`);
      }

      // Preparar movimiento (SALIDA)
      movementsToAppend.push({
        IdMovimiento: crypto.randomUUID(),
        ReferenciaProducto: prod.Referencia,
        Tipo: 'SALIDA',
        Cantidad: cantidadSalida,
        PrecioUnitario: prod.PrecioVenta,
        ReferenciaDocumento: 'VENTA_EGRESO',
        Usuario: username,
        Fecha: new Date().toISOString()
      });

      // Preparar actualización de stock
      productsToUpdate.push({
        id: prod.IdProducto,
        data: {
          StockActual: prod.StockActual - cantidadSalida
        }
      });
    }

    // Guardar movimientos y actualizar stocks
    await appendRows('Movimientos', movementsToAppend);
    for (const itemToUpdate of productsToUpdate) {
      await updateRow('Productos', 'IdProducto', itemToUpdate.id, itemToUpdate.data);
    }

    const refs = saleItems.map(i => `${i.referencia} (x${i.cantidad})`).join(', ');
    await logAudit(username, `Registró salida de inventario para productos: ${refs}`);

    return { success: true };
  });
}


// --- 5. CONFIGURACIÓN DE PRECIOS ---

export async function updateProductPrice(referencia, nuevoPrecioVenta, username) {
  return await inventoryMutex.runExclusive(async () => {
    const products = await getProducts();
    const prod = products.find(p => p.Referencia.toUpperCase() === referencia.trim().toUpperCase());
    
    if (!prod) {
      throw new Error(`El producto con referencia ${referencia} no existe.`);
    }

    const precioVentaNuevo = parseFloat(nuevoPrecioVenta);
    if (isNaN(precioVentaNuevo) || precioVentaNuevo < 0) {
      throw new Error('El precio de venta debe ser un número válido mayor o igual a cero.');
    }

    const precioVentaAnterior = prod.PrecioVenta;

    // Registrar historial de precios
    const priceHistoryRecord = {
      IdHistorial: crypto.randomUUID(),
      ReferenciaProducto: prod.Referencia,
      PrecioCompra: prod.PrecioCompra,
      PrecioVentaAnterior: precioVentaAnterior,
      PrecioVentaNuevo: precioVentaNuevo,
      Usuario: username,
      Fecha: new Date().toISOString()
    };

    await appendRows('PreciosHistorial', [priceHistoryRecord]);
    
    // Actualizar precio de venta en producto
    await updateRow('Productos', 'IdProducto', prod.IdProducto, {
      PrecioVenta: precioVentaNuevo
    });

    await logAudit(username, `Cambió precio de venta de ${prod.Nombre} (Ref: ${prod.Referencia}) de $${precioVentaAnterior} a $${precioVentaNuevo}`);

    return { referencia: prod.Referencia, precioVentaNuevo };
  });
}


// --- 6. CÁLCULO DE MÉTRICAS (DASHBOARD) ---

export async function getDashboardStats() {
  const products = await getProducts();
  const suppliers = await getSuppliers();
  const movements = await readTable('Movimientos');

  const totalProductos = products.length;
  const totalProveedores = suppliers.length;

  // Valorización total: suma de StockActual * PrecioCompra
  const inventarioValorizado = products.reduce((sum, p) => {
    return sum + (p.StockActual * p.PrecioCompra);
  }, 0);

  // Ordenar movimientos por fecha descendente y tomar los últimos 10
  const ultimosMovimientos = movements
    .map(m => ({
      ...m,
      Cantidad: parseInt(m.Cantidad, 10) || 0,
      PrecioUnitario: parseFloat(m.PrecioUnitario) || 0
    }))
    .sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha))
    .slice(0, 10);

  // Alertas de stock bajo: productos con stock <= 5
  const alertasStockBajo = products
    .filter(p => p.StockActual <= 5)
    .map(p => ({
      Referencia: p.Referencia,
      Nombre: p.Nombre,
      StockActual: p.StockActual,
      FotoUrl: p.FotoUrl
    }));

  return {
    totalProductos,
    totalProveedores,
    inventarioValorizado,
    ultimosMovimientos,
    alertasStockBajo
  };
}
