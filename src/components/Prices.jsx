import React, { useState, useEffect, useRef } from 'react';
import { Search, Save, History, Calculator, Loader2 } from 'lucide-react';

/**
 * Módulo 5: Configuración de Precios e Historial
 */
export default function Prices({ token, showToast }) {
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search and selected state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // Edit State
  const [nuevoPrecioVenta, setNuevoPrecioVenta] = useState('');

  const scanInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [productsRes, historyRes] = await Promise.all([
        fetch('/api/products', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/prices/history', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const productsData = await productsRes.json();
      const historyData = await historyRes.json();

      if (!productsRes.ok) throw new Error(productsData.error || 'Error al cargar productos.');
      if (!historyRes.ok) throw new Error(historyData.error || 'Error al cargar historial.');

      setProducts(productsData);
      setHistory(historyData);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim().toUpperCase();
    if (!query) return;

    const prod = products.find(p => p.Referencia.toUpperCase() === query);

    if (prod) {
      setSelectedProduct(prod);
      setNuevoPrecioVenta(prod.PrecioVenta);
      showToast(`Producto cargado: ${prod.Nombre}`, 'success');
    } else {
      setSelectedProduct(null);
      setNuevoPrecioVenta('');
      showToast(`No se encontró producto con referencia o código: "${query}"`, 'error');
    }
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const price = parseFloat(nuevoPrecioVenta);
    if (isNaN(price) || price < 0) {
      showToast('El precio de venta debe ser un número positivo.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/prices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          referencia: selectedProduct.Referencia,
          nuevoPrecioVenta: price
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al actualizar precio.');

      showToast('Precio de venta actualizado con éxito.', 'success');
      
      // Actualizar datos locales
      await fetchData();

      // Refrescar producto seleccionado
      const updatedProducts = products.map(p => p.Referencia === selectedProduct.Referencia ? { ...p, PrecioVenta: price } : p);
      setProducts(updatedProducts);
      setSelectedProduct(prev => ({ ...prev, PrecioVenta: price }));
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getProductHistory = () => {
    if (!selectedProduct) return [];
    return history
      .filter(h => h.ReferenciaProducto.toUpperCase() === selectedProduct.Referencia.toUpperCase())
      .sort((a, b) => new Date(b.Fecha) - new Date(a.Fecha));
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const sugerido = selectedProduct ? selectedProduct.PrecioCompra * 1.40 : 0;
  const productHistory = getProductHistory();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Cargando configuración de precios...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Configuración de Precios</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Modificar márgenes y establecer precios de venta activos</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Panel Izquierdo: Formulario de Asignación */}
        <div className="card">
          <h3 className="card-title">Buscar Producto</h3>
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ position: 'relative', flexGrow: 1 }}>
              <Search className="search-icon" size={18} />
              <input 
                ref={scanInputRef}
                type="text" 
                placeholder="Escanea o escribe referencia..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
            </div>
            <button type="submit" className="btn btn-primary">Buscar</button>
          </form>

          {selectedProduct ? (
            <form onSubmit={handleSavePrice} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '1rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
                <img 
                  src={selectedProduct.FotoUrl} 
                  alt={selectedProduct.Nombre} 
                  style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} 
                />
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.25rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{selectedProduct.Nombre}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ref: {selectedProduct.Referencia}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Stock Actual: {selectedProduct.StockActual} ud.</span>
                </div>
              </div>

              <div className="form-group">
                <label>Precio de Compra (Costo - Solo Lectura)</label>
                <input 
                  type="text" 
                  value={formatCurrency(selectedProduct.PrecioCompra)} 
                  disabled 
                  readOnly 
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calculator size={14} style={{ color: 'var(--success)' }} />
                  <span>Precio de Venta Sugerido (40% Margen)</span>
                </label>
                <input 
                  type="text" 
                  value={formatCurrency(sugerido)} 
                  disabled 
                  readOnly 
                  style={{ borderLeft: '4px solid var(--success)', fontWeight: 600 }}
                />
              </div>

              <div className="form-group">
                <label className="required">Precio de Venta Activo</label>
                <input 
                  type="number" 
                  step="0.01"
                  min="0"
                  placeholder="Establecer precio personalizado..."
                  value={nuevoPrecioVenta}
                  onChange={(e) => setNuevoPrecioVenta(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-success" disabled={saving} style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
                {saving ? (
                  <>
                    <Loader2 className="spinner" size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Guardando precio...</span>
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    <span>Guardar Cambios de Precio</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Busca un producto por referencia para configurar su precio de venta.
            </div>
          )}
        </div>

        {/* Panel Derecho: Historial del Producto */}
        <div className="card">
          <h3 className="card-title">
            <History size={18} style={{ color: 'var(--primary)' }} />
            <span>Historial de Precios</span>
          </h3>

          {!selectedProduct ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Selecciona un producto para visualizar su historial de cambios.
            </div>
          ) : productHistory.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay cambios registrados en el historial para este producto.
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Costo</th>
                    <th>P. Ant.</th>
                    <th>P. Nuevo</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {productHistory.map((h, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                        {new Date(h.Fecha).toLocaleDateString()}
                      </td>
                      <td>{formatCurrency(parseFloat(h.PrecioCompra) || 0)}</td>
                      <td style={{ color: 'var(--text-muted)' }}>{formatCurrency(parseFloat(h.PrecioVentaAnterior) || 0)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success)' }}>{formatCurrency(parseFloat(h.PrecioVentaNuevo) || 0)}</td>
                      <td>{h.Usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
