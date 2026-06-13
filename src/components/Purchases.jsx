import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, ShoppingBag, Loader2 } from 'lucide-react';

/**
 * Módulo 2: Registro de Compras / Entrada de Inventario
 */
export default function Purchases({ token, showToast }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Header State
  const [idProveedor, setIdProveedor] = useState('');
  const [facturaNum, setFacturaNum] = useState('');
  const [fechaCompra, setFechaCompra] = useState(new Date().toISOString().split('T')[0]);

  // Items State (Dynamic Table)
  const [items, setItems] = useState([
    { referencia: '', cantidad: 1, precioCosto: 0, ivaPagado: 0 }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [suppliersRes, productsRes] = await Promise.all([
          fetch('/api/suppliers', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        const suppliersData = await suppliersRes.json();
        const productsData = await productsRes.json();

        if (!suppliersRes.ok) throw new Error(suppliersData.error || 'Error al cargar proveedores.');
        if (!productsRes.ok) throw new Error(productsData.error || 'Error al cargar catálogo de productos.');

        setSuppliers(suppliersData);
        setProducts(productsData);
        
        if (suppliersData.length > 0) {
          setIdProveedor(suppliersData[0].IdProveedor);
        }
      } catch (error) {
        showToast(error.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddItem = () => {
    setItems([
      ...items,
      { referencia: products.length > 0 ? products[0].Referencia : '', cantidad: 1, precioCosto: 0, ivaPagado: 0 }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      showToast('Debe ingresar al menos un artículo en la compra.', 'warning');
      return;
    }
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    
    if (field === 'cantidad') {
      newItems[index].cantidad = Math.max(1, parseInt(value, 10) || 0);
    } else if (field === 'precioCosto') {
      newItems[index].precioCosto = Math.max(0, parseFloat(value) || 0);
    } else if (field === 'ivaPagado') {
      newItems[index].ivaPagado = Math.max(0, parseFloat(value) || 0);
    } else {
      newItems[index][field] = value;
    }
    
    setItems(newItems);
  };

  // Cálculos dinámicos
  const calculateRowTotal = (item) => {
    return (item.cantidad * item.precioCosto) + item.ivaPagado;
  };

  const totalIva = items.reduce((sum, item) => sum + item.ivaPagado, 0);
  const totalCompra = items.reduce((sum, item) => sum + calculateRowTotal(item), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!idProveedor) {
      showToast('Seleccione un proveedor.', 'warning');
      return;
    }
    if (!facturaNum.trim()) {
      showToast('Ingrese el número de factura.', 'warning');
      return;
    }

    // Validar que todas las filas tengan referencias válidas y valores lógicos
    for (const item of items) {
      if (!item.referencia) {
        showToast('Seleccione un producto para cada fila.', 'warning');
        return;
      }
      if (item.cantidad <= 0 || item.precioCosto <= 0) {
        showToast('La cantidad y el precio de costo deben ser mayores a cero.', 'warning');
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          header: { idProveedor, facturaNum, fechaCompra },
          items
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al registrar compra.');

      showToast(`Compra registrada con éxito. Factura #${facturaNum}`, 'success');
      
      // Limpiar Formulario
      setFacturaNum('');
      setFechaCompra(new Date().toISOString().split('T')[0]);
      setItems([{ referencia: products.length > 0 ? products[0].Referencia : '', cantidad: 1, precioCosto: 0, ivaPagado: 0 }]);
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
        Cargando formulario de compra...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Ingreso de Compras</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Alimentar inventario y registrar facturas de proveedores</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Cabecera de Compra */}
        <div className="card">
          <h3 className="card-title">
            <ShoppingBag size={18} style={{ color: 'var(--primary)' }} />
            <span>Encabezado de Compra</span>
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label className="required">Proveedor</label>
              {suppliers.length === 0 ? (
                <select disabled>
                  <option>No hay proveedores creados</option>
                </select>
              ) : (
                <select value={idProveedor} onChange={(e) => setIdProveedor(e.target.value)} required>
                  {suppliers.map(s => (
                    <option key={s.IdProveedor} value={s.IdProveedor}>
                      {s.Nombre} ({s.IdProveedor})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="required">Número de Factura</label>
              <input 
                type="text" 
                placeholder="Ej: F-9281A"
                value={facturaNum}
                onChange={(e) => setFacturaNum(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="required">Fecha de Compra</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="date" 
                  value={fechaCompra}
                  onChange={(e) => setFechaCompra(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Detalle de Artículos Comprados */}
        <div className="card">
          <h3 className="card-title">Artículos Comprados</h3>
          
          {products.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Primero debe crear productos en el <strong>Catálogo</strong> para poder registrar compras.
            </div>
          ) : (
            <>
              <div className="table-container" style={{ marginBottom: '1rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '40%' }}>Producto (Referencia - Nombre)</th>
                      <th style={{ width: '12%' }}>Cantidad</th>
                      <th style={{ width: '16%' }}>Precio Costo</th>
                      <th style={{ width: '16%' }}>IVA Pagado</th>
                      <th style={{ width: '16%' }}>Total</th>
                      <th style={{ width: '8%', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          <select 
                            value={item.referencia} 
                            onChange={(e) => handleItemChange(index, 'referencia', e.target.value)}
                            required
                          >
                            <option value="" disabled>Seleccione producto...</option>
                            {products.map(p => (
                              <option key={p.IdProducto} value={p.Referencia}>
                                {p.Referencia} - {p.Nombre}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input 
                            type="number" 
                            min="1"
                            value={item.cantidad}
                            onChange={(e) => handleItemChange(index, 'cantidad', e.target.value)}
                            required
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={item.precioCosto || ''}
                            onChange={(e) => handleItemChange(index, 'precioCosto', e.target.value)}
                            required
                          />
                        </td>
                        <td>
                          <input 
                            type="number" 
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={item.ivaPagado || ''}
                            onChange={(e) => handleItemChange(index, 'ivaPagado', e.target.value)}
                          />
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {formatCurrency(calculateRowTotal(item))}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            type="button" 
                            className="btn btn-danger btn-icon-only"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Botón agregar fila y Totales */}
              <div className="dynamic-table-actions">
                <button type="button" className="btn btn-secondary" onClick={handleAddItem}>
                  <Plus size={16} />
                  <span>Agregar Artículo</span>
                </button>
              </div>

              <div className="purchase-totals-box">
                <div className="total-row">
                  <span>Total IVA:</span>
                  <span>{formatCurrency(totalIva)}</span>
                </div>
                <div className="total-row grand-total">
                  <span>Total Compra:</span>
                  <span>{formatCurrency(totalCompra)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Enviar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={saving || products.length === 0}
            style={{ padding: '0.75rem 2rem' }}
          >
            {saving ? (
              <>
                <Loader2 className="spinner" size={18} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Registrando Compra...</span>
              </>
            ) : (
              <span>Guardar Ingreso de Compra</span>
            )}
          </button>
        </div>
      </form>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
