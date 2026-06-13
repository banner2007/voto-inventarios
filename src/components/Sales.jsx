import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Calendar, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

/**
 * Módulo 4: Egresos / Salida de Inventario
 */
export default function Sales({ token, user, showToast }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search Input State
  const [scanQuery, setScanQuery] = useState('');
  const scanInputRef = useRef(null);

  // Selected Product Details for Scan Feedback
  const [scannedProduct, setScannedProduct] = useState(null);

  // Cart / Items to discharge
  const [cart, setCart] = useState([]);

  // Date of Exit
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().split('T')[0]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cargar catálogo.');
      setProducts(data);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    // Enfocar el input de escaneo automáticamente al entrar
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, []);

  // Buscar coincidencia exacta al digitar o escanear
  const handleScanSubmit = (e) => {
    e.preventDefault();
    const query = scanQuery.trim().toUpperCase();
    if (!query) return;

    // Buscar por Referencia exacta
    const prod = products.find(p => p.Referencia.toUpperCase() === query);
    
    if (prod) {
      setScannedProduct(prod);
      addToCart(prod);
      setScanQuery('');
      showToast(`Producto encontrado: ${prod.Nombre}`, 'success');
    } else {
      setScannedProduct(null);
      showToast(`No se encontró ningún producto con la referencia o código: "${query}"`, 'error');
    }
    
    // Devolver foco al input
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  };

  const addToCart = (product) => {
    const existingIndex = cart.findIndex(item => item.referencia === product.Referencia);
    
    if (existingIndex !== -1) {
      // Validar stock
      const newQty = cart[existingIndex].cantidad + 1;
      if (newQty > product.StockActual) {
        showToast(`No hay suficiente stock disponible para ${product.Nombre}. Stock: ${product.StockActual}`, 'error');
        return;
      }
      
      const newCart = [...cart];
      newCart[existingIndex].cantidad = newQty;
      setCart(newCart);
    } else {
      // Validar si hay stock inicial
      if (product.StockActual < 1) {
        showToast(`No hay stock disponible para ${product.Nombre}.`, 'error');
        return;
      }
      
      setCart([
        ...cart,
        {
          referencia: product.Referencia,
          nombre: product.Nombre,
          fotoUrl: product.FotoUrl,
          precioCompra: product.PrecioCompra,
          precioVenta: product.PrecioVenta,
          stockDisponible: product.StockActual,
          cantidad: 1
        }
      ]);
    }
  };

  const handleQtyChange = (index, value) => {
    const qty = parseInt(value, 10) || 0;
    const item = cart[index];

    if (qty <= 0) {
      handleRemoveItem(index);
      return;
    }

    if (qty > item.stockDisponible) {
      showToast(`Stock insuficiente. Disponible: ${item.stockDisponible}`, 'warning');
      return;
    }

    const newCart = [...cart];
    newCart[index].cantidad = qty;
    setCart(newCart);
  };

  const handleRemoveItem = (index) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
  };

  // Calcular totales
  const totalItems = cart.reduce((sum, item) => sum + item.cantidad, 0);
  const totalEgresoValue = cart.reduce((sum, item) => sum + (item.cantidad * item.precioVenta), 0);

  const handleSaveExit = async () => {
    if (cart.length === 0) {
      showToast('Debe agregar al menos un producto al carrito de egreso.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            referencia: item.referencia,
            cantidad: item.cantidad
          }))
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al registrar egreso.');

      showToast('Egreso de inventario registrado con éxito.', 'success');
      setCart([]);
      setScannedProduct(null);
      
      // Refrescar stock de productos
      fetchProducts();
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Cargando terminal de egresos...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Egresos / Salida de Inventario</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Registrar salidas, ventas o mermas de productos</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Panel Izquierdo: Escáner y Carrito */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Lector Físico Simulador */}
          <div className="card">
            <h3 className="card-title">Escanear Referencia</h3>
            <form onSubmit={handleScanSubmit} style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ position: 'relative', flexGrow: 1 }}>
                <Search className="search-icon" size={18} />
                <input 
                  ref={scanInputRef}
                  type="text" 
                  placeholder="Escanea el código de barras o digita la referencia..." 
                  value={scanQuery}
                  onChange={(e) => setScanQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Buscar / Escanear
              </button>
            </form>

            {/* Feedback Visual del último escaneo */}
            {scannedProduct && (
              <div style={{ display: 'flex', gap: '1.25rem', padding: '1rem', marginTop: '1.25rem', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--success-light)' }}>
                <img 
                  src={scannedProduct.FotoUrl} 
                  alt={scannedProduct.Nombre} 
                  style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} 
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>Escaneado con Éxito</span>
                  </div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{scannedProduct.Nombre}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Ref: {scannedProduct.Referencia} | Venta: {formatCurrency(scannedProduct.PrecioVenta)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Tabla de Artículos a Salir */}
          <div className="card">
            <h3 className="card-title" style={{ justifyContent: 'space-between' }}>
              <span>Artículos para Salida</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{cart.length} productos agregados</span>
            </h3>

            {cart.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <ShoppingCart size={40} style={{ color: 'var(--text-muted)' }} />
                <span>La lista de salida está vacía. Escanea un código arriba para agregar artículos.</span>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Foto</th>
                      <th>Producto (Ref)</th>
                      <th>Stock Disp.</th>
                      <th>Precio Venta</th>
                      <th style={{ width: '100px' }}>Cant.</th>
                      <th>Subtotal</th>
                      <th style={{ width: '60px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, index) => (
                      <tr key={item.referencia}>
                        <td>
                          <img 
                            src={item.fotoUrl} 
                            alt={item.nombre} 
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} 
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{item.nombre}</div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ref: {item.referencia}</span>
                        </td>
                        <td>
                          <span className={`stock-alert-badge ${item.stockDisponible <= 5 ? 'low' : 'ok'}`}>
                            {item.stockDisponible} ud.
                          </span>
                        </td>
                        <td>{formatCurrency(item.precioVenta)}</td>
                        <td>
                          <input 
                            type="number" 
                            min="1"
                            max={item.stockDisponible}
                            value={item.cantidad}
                            onChange={(e) => handleQtyChange(index, e.target.value)}
                            style={{ width: '70px', padding: '0.25rem 0.5rem' }}
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {formatCurrency(item.cantidad * item.precioVenta)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="btn btn-danger btn-icon-only"
                            onClick={() => handleRemoveItem(index)}
                            style={{ padding: '4px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Panel Derecho: Datos de Cierre y Resumen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="card">
            <h3 className="card-title">Resumen de Operación</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
              <div className="form-group">
                <label><Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Fecha de Operación</label>
                <input 
                  type="date" 
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label><User size={14} style={{ marginRight: '4px', verticalAlign: 'text-bottom' }} /> Operador Responsable</label>
                <input 
                  type="text" 
                  value={user?.nombre || 'Operador'}
                  disabled
                  readOnly
                />
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  <span>Total Unidades:</span>
                  <span style={{ fontWeight: 600 }}>{totalItems}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', color: 'var(--text-primary)', borderTop: '2px solid var(--border-color)', paddingTop: '0.75rem', fontWeight: 700 }}>
                  <span>Valor Salida:</span>
                  <span>{formatCurrency(totalEgresoValue)}</span>
                </div>
              </div>

              <button 
                className="btn btn-success"
                onClick={handleSaveExit}
                disabled={saving || cart.length === 0}
                style={{ padding: '0.75rem', width: '100%', marginTop: '0.5rem' }}
              >
                {saving ? (
                  <>
                    <Loader2 className="spinner" size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Guardando Salida...</span>
                  </>
                ) : (
                  <span>Confirmar Egreso</span>
                )}
              </button>
            </div>
          </div>

          {/* Información Adicional de Reglas */}
          <div className="card" style={{ backgroundColor: 'var(--bg-secondary)', borderStyle: 'dashed' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <AlertCircle size={16} style={{ color: 'var(--primary)' }} />
              Reglas del Sistema
            </h4>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li>No se permite egresar cantidades superiores al stock disponible.</li>
              <li>El precio de venta predeterminado incluye un 40% de margen sobre el costo.</li>
              <li>Toda salida descuenta stock automáticamente y genera auditoría de usuario.</li>
            </ul>
          </div>

        </div>

      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
