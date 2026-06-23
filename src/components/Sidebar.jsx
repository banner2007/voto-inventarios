import React from 'react';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  TrendingDown,
  CircleDollarSign,
  LogOut,
  Sun,
  Moon,
  LineChart
} from 'lucide-react';

/**
 * Panel de navegación lateral (Sidebar)
 */
export default function Sidebar({
  currentView,
  setView,
  user,
  onLogout,
  theme,
  toggleTheme,
  sidebarOpen,
  setSidebarOpen
}) {
  const isAdmin = user?.role === 'Administrador';

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'suppliers', label: 'Proveedores', icon: <Users size={20} /> },
    { id: 'purchases', label: 'Compras', icon: <ShoppingBag size={20} /> },
    { id: 'catalog', label: 'Catálogo', icon: <Package size={20} /> },
    { id: 'sales', label: 'Egresos / Salidas', icon: <TrendingDown size={20} /> },
    { id: 'vendidos', label: 'Vendidos', icon: <LineChart size={20} /> },
    ...(isAdmin ? [{ id: 'prices', label: 'Config. Precios', icon: <CircleDollarSign size={20} /> }] : [])
  ];

  const handleItemClick = (id) => {
    setView(id);
    setSidebarOpen(false); // Cerrar sidebar en responsive
  };

  return (
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
      <div className="logo-section">
        <div className="logo-icon">V</div>
        <div className="logo-text">VOTO Nacional</div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <ul className="nav-links">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => handleItemClick(item.id)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  fontFamily: 'inherit'
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          {/* Selector de Tema Claro/Oscuro */}
          <button
            className="btn btn-secondary"
            onClick={toggleTheme}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <span>Tema {theme === 'light' ? 'Oscuro' : 'Claro'}</span>
          </button>

          {/* Perfil del Usuario */}
          <div className="user-profile-badge">
            <div className="avatar">
              {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{user?.nombre || 'Usuario'}</span>
              <span className="user-role">{user?.role || 'Operador'}</span>
            </div>
          </div>

          {/* Botón de Cerrar Sesión */}
          <button
            className="btn btn-danger"
            onClick={onLogout}
            style={{ width: '100%', padding: '0.5rem 1rem' }}
          >
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>
    </aside>
  );
}
