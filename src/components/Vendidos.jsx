import React, { useState, useEffect } from 'react';
import { Calendar, Search, ShoppingBag, DollarSign, User, FileText } from 'lucide-react';

/**
2026-06-23 - Componente de Ventas Realizadas (Vendidos)
*/
export default function Vendidos({ token, showToast }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily'); // 'daily' o 'period'

  // Filtros de periodo
  const [fechaInicio, setFechaInicio] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default 7 días atrás
    return d.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => new Date().toISOString().split('T')[0]);

  // Lista filtrada en base a la búsqueda del periodo
  const [filteredSales, setFilteredSales] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/sales', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al obtener listado de vendidos.');
      setSales(data);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // Helper para obtener fecha local en formato YYYY-MM-DD
  const getLocalDateString = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 1. Filtrar ventas del día de hoy
  const todayStr = new Date().toISOString().split('T')[0];
  const dailySales = sales.filter(s => getLocalDateString(s.Fecha) === todayStr);

  // 2. Filtrar ventas por periodo al hacer clic en buscar
  const handleSearchPeriod = (e) => {
    if (e) e.preventDefault();
    if (!fechaInicio || !fechaFin) {
      showToast('Seleccione ambas fechas.', 'warning');
      return;
    }
    if (fechaInicio > fechaFin) {
      showToast('La fecha inicial no puede ser posterior a la fecha final.', 'warning');
      return;
    }

    const results = sales.filter(s => {
      const saleDate = getLocalDateString(s.Fecha);
      return saleDate >= fechaInicio && saleDate <= fechaFin;
    });

    setFilteredSales(results);
    setHasSearched(true);
  };

  // Ejecutar búsqueda por defecto cuando cambian las ventas
  useEffect(() => {
    if (sales.length > 0 && activeTab === 'period' && !hasSearched) {
      handleSearchPeriod();
    }
  }, [sales, activeTab]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
  };

  // Calcular métricas
  const getMetrics = (itemsList) => {
    const totalUnits = itemsList.reduce((sum, s) => sum + s.Cantidad, 0);
    const totalValue = itemsList.reduce((sum, s) => sum + s.Total, 0);
    return { totalUnits, totalValue };
  };

  const dailyMetrics = getMetrics(dailySales);
  const periodMetrics = getMetrics(filteredSales);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
        Cargando listado de productos vendidos...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Historial de Vendidos</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Consulte los productos egresados y vendidos del inventario</p>
        </div>
      </div>

      {/* Selector de pestañas */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button 
          className={`btn ${activeTab === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('daily')}
        >
          Ventas del Día
        </button>
        <button 
          className={`btn ${activeTab === 'period' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('period')}
        >
          Ventas por Período
        </button>
      </div>

      {activeTab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Métricas del día */}
          <div className="metrics-grid">
            <div className="card metric-card">
              <div className="metric-icon-box" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                <ShoppingBag size={24} />
              </div>
              <div className="metric-details">
                <span className="metric-val">{dailyMetrics.totalUnits}</span>
                <span className="metric-label">Unidades Vendidas Hoy</span>
              </div>
            </div>
            <div className="card metric-card">
              <div className="metric-icon-box" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                <DollarSign size={24} />
              </div>
              <div className="metric-details">
                <span className="metric-val">{formatCurrency(dailyMetrics.totalValue)}</span>
                <span className="metric-label">Total Ingreso Hoy</span>
              </div>
            </div>
          </div>

          {/* Listado del día */}
          <div className="card">
            <h3 className="card-title">Detalle de Ventas de Hoy</h3>
            {dailySales.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No se han registrado ventas el día de hoy.
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th style={{ whiteSpace: 'nowrap' }}>Foto</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Referencia</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Producto</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Cantidad</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Precio Unitario</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Total</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Usuario</th>
                      <th style={{ whiteSpace: 'nowrap' }}>Fecha y Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySales.map((s) => (
                      <tr key={s.IdMovimiento}>
                        <td>
                          {s.FotoUrl ? (
                            <img 
                              src={s.FotoUrl} 
                              alt={s.NombreProducto} 
                              style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} 
                            />
                          ) : (
                            <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              -
                            </div>
                          )}
                        </td>
                        <td style={{ fontWeight: 600 }}>{s.ReferenciaProducto}</td>
                        <td>{s.NombreProducto}</td>
                        <td>{s.Cantidad}</td>
                        <td>{formatCurrency(s.PrecioUnitario)}</td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(s.Total)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <User size={14} style={{ color: 'var(--text-secondary)' }} />
                            <span>{s.Usuario}</span>
                          </div>
                        </td>
                        <td>{formatDateTime(s.Fecha)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'period' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Panel de Filtros */}
          <div className="card">
            <h3 className="card-title">
              <Calendar size={18} style={{ color: 'var(--primary)' }} />
              <span>Seleccionar Período</span>
            </h3>
            <form onSubmit={handleSearchPeriod} className="form-grid" style={{ marginBottom: 0, alignItems: 'end' }}>
              <div className="form-group">
                <label className="required">Fecha Inicial</label>
                <input 
                  type="date" 
                  value={fechaInicio} 
                  onChange={(e) => setFechaInicio(e.target.value)} 
                  required 
                />
              </div>
              <div className="form-group">
                <label className="required">Fecha Final</label>
                <input 
                  type="date" 
                  value={fechaFin} 
                  onChange={(e) => setFechaFin(e.target.value)} 
                  required 
                />
              </div>
              <div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '43px' }}>
                  <Search size={16} />
                  <span>Buscar Ventas</span>
                </button>
              </div>
            </form>
          </div>

          {hasSearched && (
            <>
              {/* Métricas del período */}
              <div className="metrics-grid">
                <div className="card metric-card">
                  <div className="metric-icon-box" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
                    <ShoppingBag size={24} />
                  </div>
                  <div className="metric-details">
                    <span className="metric-val">{periodMetrics.totalUnits}</span>
                    <span className="metric-label">Unidades Vendidas en Período</span>
                  </div>
                </div>
                <div className="card metric-card">
                  <div className="metric-icon-box" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
                    <DollarSign size={24} />
                  </div>
                  <div className="metric-details">
                    <span className="metric-val">{formatCurrency(periodMetrics.totalValue)}</span>
                    <span className="metric-label">Total Ingreso en Período</span>
                  </div>
                </div>
              </div>

              {/* Listado del período */}
              <div className="card">
                <h3 className="card-title">Resultados de Ventas en el Período</h3>
                {filteredSales.length === 0 ? (
                  <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No se encontraron ventas registradas en el período seleccionado.
                  </div>
                ) : (
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th style={{ whiteSpace: 'nowrap' }}>Foto</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Referencia</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Producto</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Cantidad</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Precio Unitario</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Total</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Usuario</th>
                          <th style={{ whiteSpace: 'nowrap' }}>Fecha y Hora</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSales.map((s) => (
                          <tr key={s.IdMovimiento}>
                            <td>
                              {s.FotoUrl ? (
                                <img 
                                  src={s.FotoUrl} 
                                  alt={s.NombreProducto} 
                                  style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} 
                                />
                              ) : (
                                <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  -
                                </div>
                              )}
                            </td>
                            <td style={{ fontWeight: 600 }}>{s.ReferenciaProducto}</td>
                            <td>{s.NombreProducto}</td>
                            <td>{s.Cantidad}</td>
                            <td>{formatCurrency(s.PrecioUnitario)}</td>
                            <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{formatCurrency(s.Total)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <User size={14} style={{ color: 'var(--text-secondary)' }} />
                                <span>{s.Usuario}</span>
                              </div>
                            </td>
                            <td>{formatDateTime(s.Fecha)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
