import React, { useState } from 'react';
import { Shield, Lock, User } from 'lucide-react';

/**
 * Componente de Inicio de Sesión
 */
export default function Login({ setToken, setUser, showToast }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      showToast('Por favor complete todos los campos.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error de conexión.');
      }

      // Guardar en localStorage y actualizar estados en la App
      localStorage.setItem('voto_token', data.token);
      localStorage.setItem('voto_user', JSON.stringify(data.user));
      
      setToken(data.token);
      setUser(data.user);
      
      showToast(`¡Bienvenido, ${data.user.nombre}!`, 'success');
    } catch (error) {
      showToast(error.message || 'Usuario o contraseña incorrectos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="card login-card">
        <div className="login-header">
          <div style={{ display: 'inline-block' }}>
            <div className="logo-icon" style={{ width: '56px', height: '56px', fontSize: '1.75rem', margin: '0 auto' }}>
              V
            </div>
          </div>
          <h2 className="login-title">VOTO Nacional</h2>
          <p className="login-subtitle">Sistema de Control de Inventarios</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="required" htmlFor="username">Usuario</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <User size={18} />
              </span>
              <input
                id="username"
                type="text"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="required" htmlFor="password">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={18} />
              </span>
              <input
                id="password"
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem', width: '100%' }}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }} disabled={loading}>
            <Shield size={18} />
            {loading ? 'Iniciando sesión...' : 'Ingresar al sistema'}
          </button>
        </form>
      </div>
    </div>
  );
}
