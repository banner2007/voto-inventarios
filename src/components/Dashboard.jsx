import React, { useState, useEffect } from 'react';
import { Package, Users, DollarSign, AlertTriangle, RefreshCw, Activity } from 'lucide-react';

/**
 * Vista de Dashboard General
 */
export default function Dashboard({ token, showToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al cargar estadísticas.');
      setStats(data);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flexGrow: 1, justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <RefreshCw className="spinner" size={40} style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Cargando datos del Dashboard...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="header-bar">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Resumen operacional en tiempo real</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchStats}>
          <RefreshCw size={16} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Grid de Tarjetas de Métricas */}
      <div className="metrics-grid">
        {/* Total Productos */}
        <div className="card metric-card">
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Package size={24} />
          </div>
          <div className="metric-details">
            <span className="metric-val">{stats?.totalProductos || 0}</span>
            <span className="metric-label">Productos Registrados</span>
          </div>
        </div>

        {/* Total Proveedores */}
        <div className="card metric-card">
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <Users size={24} />
          </div>
          <div className="metric-details">
            <span className="metric-val">{stats?.totalProveedores || 0}</span>
            <span className="metric-label">Proveedores Activos</span>
          </div>
        </div>

        {/* Inventario Valorizado */}
        <div className="card metric-card">
          <div className="metric-icon-box" style={{ backgroundColor: 'var(--warning-light)', color: 'var(--warning)' }}>
            <DollarSign size={24} />
          </div>
          <div className="metric-details">
            <span className="metric-val">{formatCurrency(stats?.inventarioValorizado || 0)}</span>
            <span className="metric-label">Valorización de Inventario</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        {/* Alertas de Stock Bajo */}
        <div className="card">
          <h3 className="card-title" style={{ color: 'var(--danger)' }}>
            <AlertTriangle size={20} />
            <span>Alertas de Stock Bajo (Menos de 5 u.)</span>
          </h3>
          {(!stats?.alertasStockBajo || stats.alertasStockBajo.length === 0) ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No hay alertas de stock bajo. Todos los productos tienen buen stock.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '380px', overflowY: 'auto' }}>
              {stats.alertasStockBajo.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                  <img src={p.FotoUrl} alt={p.Nombre} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                  <div style={{ flexGrow: 1 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{p.Nombre}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ref: {p.Referencia}</span>
                  </div>
                  <span className="stock-alert-badge low">
                    Stock: {p.StockActual}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos Movimientos */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <h3 className="card-title">
            <Activity size={20} style={{ color: 'var(--primary)' }} />
            <span>Últimos Movimientos de Inventario</span>
          </h3>
          {(!stats?.ultimosMovimientos || stats.ultimosMovimientos.length === 0) ? (
            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No se han registrado movimientos recientes en el sistema.
            </div>
          ) : (
            <div className="table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Documento</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.ultimosMovimientos.map((m, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: '0.825rem', whiteSpace: 'nowrap' }}>
                        {new Date(m.Fecha).toLocaleDateString()} {new Date(m.Fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td>
                        <span className={`stock-alert-badge ${m.Tipo === 'ENTRADA' ? 'ok' : 'low'}`} style={{ fontSize: '0.7rem' }}>
                          {m.Tipo}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{m.ReferenciaProducto}</td>
                      <td>{m.Cantidad}</td>
                      <td>{formatCurrency(m.PrecioUnitario)}</td>
                      <td>{m.ReferenciaDocumento}</td>
                      <td>{m.Usuario}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
