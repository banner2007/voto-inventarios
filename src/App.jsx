import React, { useState, useEffect } from 'react';
import { Menu, Sun, Moon } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Suppliers from './components/Suppliers';
import Catalog from './components/Catalog';
import Purchases from './components/Purchases';
import Sales from './components/Sales';
import Prices from './components/Prices';
import Login from './components/Login';
import Toast from './components/Toast';
import Vendidos from './components/Vendidos';

/**
 * Componente principal de la Aplicación
 */
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('voto_token'));
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('voto_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentView, setView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Tema Claro / Oscuro (inicializa según localStorage o preferencia del sistema)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('voto_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    // Aplicar tema en el DOM
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('voto_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleLogout = () => {
    localStorage.removeItem('voto_token');
    localStorage.removeItem('voto_user');
    setToken(null);
    setUser(null);
    setView('dashboard');
    showToast('Sesión cerrada correctamente.', 'success');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard token={token} showToast={showToast} />;
      case 'suppliers':
        return <Suppliers token={token} showToast={showToast} />;
      case 'purchases':
        return <Purchases token={token} showToast={showToast} />;
      case 'catalog':
        return <Catalog token={token} showToast={showToast} />;
      case 'sales':
        return <Sales token={token} user={user} showToast={showToast} />;
      case 'prices':
        return <Prices token={token} showToast={showToast} />;
      case 'vendidos':
        return <Vendidos token={token} showToast={showToast} />;
      default:
        return <Dashboard token={token} showToast={showToast} />;
    }
  };

  // Si no hay token de autenticación, forzar Login
  if (!token) {
    return (
      <>
        <Login setToken={setToken} setUser={setUser} showToast={showToast} />
        {toast && (
          <div className="toast-container">
            <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
          </div>
        )}
      </>
    );
  }

  return (
    <div className="app-container">
      {/* Botón flotante para abrir sidebar en móviles */}
      <button 
        className="menu-toggle-btn"
        onClick={() => setSidebarOpen(true)}
        style={{
          position: 'fixed',
          top: '1rem',
          left: '1rem',
          zIndex: 99,
          backgroundColor: 'var(--bg-surface)',
          padding: '0.5rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <Menu size={20} />
      </button>

      {/* Navegación Lateral */}
      <Sidebar 
        currentView={currentView}
        setView={setView}
        user={user}
        onLogout={handleLogout}
        theme={theme}
        toggleTheme={toggleTheme}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Contenido de la Aplicación */}
      <main className="main-content">
        {renderView()}
      </main>

      {/* Sistema de Alertas Flotantes */}
      {toast && (
        <div className="toast-container">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}
    </div>
  );
}
