import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, ShoppingBag, Loader2, Search, Edit2 } from 'lucide-react';

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

  // Historial y búsqueda
  const [activeTab, setActiveTab] = useState('form'); // 'form' o 'history'
  const [purchases, setPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchPurchases = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch('/api/purchases', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cargar historial.');
      setPurchases(data);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchPurchases();
    }
  }, [activeTab]);

  const handleEdit = async (purchase) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/purchases/${purchase.IdCompra}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cargar detalles de la compra.');
      
      setEditingPurchaseId(purchase.IdCompra);
      setIdProveedor(data.header.IdProveedor);
      setFacturaNum(data.header.FacturaNum);
      setFechaCompra(data.header.FechaCompra);
      
      setItems(data.items.map(item => ({
        referencia: item.ReferenciaProducto,
        cantidad: item.Cantidad,
        precioCosto: item.PrecioCosto,
        ivaPagado: item.IvaPagado
      })));
      
      setActiveTab('form');
      showToast('Datos de la factura cargados en el formulario.', 'info');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (idCompra, facturaNum) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar la factura #${facturaNum}? Esta acción revertirá el stock de los productos correspondientes.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/purchases/${idCompra}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al eliminar la compra.');
      
      showToast(`Factura #${facturaNum} eliminada con éxito.`, 'success');
      fetchPurchases();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingPurchaseId(null);
    setFacturaNum('');
    setFechaCompra(new Date().toISOString().split('T')[0]);
    if (suppliers.length > 0) {
      setIdProveedor(suppliers[0].IdProveedor);
    } else {
      setIdProveedor('');
    }
    setItems([{ referencia: products.length > 0 ? products[0].Referencia : '', cantidad: 1, precioCosto: 0, ivaPagado: 0 }]);
  };

  const filteredPurchases = purchases.filter(p => 
    p.FacturaNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.ProveedorNombre.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.FechaCompra) - new Date(a.FechaCompra));

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
      const url = editingPurchaseId 
        ? `/api/purchases/${editingPurchaseId}`
        : '/api/purchases';
      const method = editingPurchaseId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
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

      showToast(
        editingPurchaseId 
          ? `Factura #${facturaNum} actualizada con éxito.` 
          : `Compra registrada con éxito. Factura #${facturaNum}`, 
        'success'
      );
      
      // Limpiar Formulario
      handleCancelEdit();
      if (editingPurchaseId) {
        setActiveTab('history');
      }
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
          <h1 className="page-title">Gestión de Compras</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Alimentar inventario, registrar, editar y eliminar facturas de proveedores</p>
        </div>
      </div>

      {/* Selector de pestañas */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button 
          className={`btn ${activeTab === 'form' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('form')}
        >
          {editingPurchaseId ? 'Editar Factura' : 'Registrar Compra'}
        </button>
        <button 
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => {
            if (editingPurchaseId && !window.confirm('¿Desea salir de la edición actual? Los cambios no guardados se perderán.')) {
              return;
            }
            handleCancelEdit();
            setActiveTab('history');
          }}
        >
          Historial / Buscar Factura
        </button>
      </div>

      {activeTab === 'form' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Cabecera de Compra */}
          <div className="card">
            <h3 className="card-title">
              <ShoppingBag size={18} style={{ color: 'var(--primary)' }} />
              <span>{editingPurchaseId ? 'Editar Cabecera de Factura' : 'Encabezado de Compra'}</span>
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
            {editingPurchaseId && (
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleCancelEdit}
                style={{ padding: '0.75rem 2rem' }}
              >
                Cancelar Edición
              </button>
            )}
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={saving || products.length === 0}
              style={{ padding: '0.75rem 2rem' }}
            >
              {saving ? (
                <>
                  <Loader2 className="spinner" size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>{editingPurchaseId ? 'Actualizando Factura...' : 'Registrando Compra...'}</span>
                </>
              ) : (
                <span>{editingPurchaseId ? 'Guardar Cambios Factura' : 'Guardar Ingreso de Compra'}</span>
              )}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <h3 className="card-title">Historial de Facturas</h3>
          
          {/* Buscador */}
          <div className="search-bar-container">
            <div className="search-input-wrapper" style={{ maxWidth: '400px' }}>
              <Search className="search-icon" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por número de factura o proveedor..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loadingHistory ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Cargando historial...
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              No se encontraron facturas registradas.
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Nº Factura</th>
                    <th>Proveedor</th>
                    <th>Total IVA</th>
                    <th>Total Factura</th>
                    <th>Usuario</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((p) => (
                    <tr key={p.IdCompra}>
                      <td>{p.FechaCompra}</td>
                      <td style={{ fontWeight: 600 }}>{p.FacturaNum}</td>
                      <td>{p.ProveedorNombre}</td>
                      <td>{formatCurrency(p.TotalIva)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(p.TotalCompra)}</td>
                      <td>{p.Usuario}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button 
                            className="btn btn-secondary btn-icon-only" 
                            onClick={() => handleEdit(p)}
                            title="Editar Factura"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            className="btn btn-danger btn-icon-only" 
                            onClick={() => handleDelete(p.IdCompra, p.FacturaNum)}
                            title="Eliminar Factura"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
