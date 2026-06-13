import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { readTable } from './googleSheets.js';
import dotenv from 'dotenv';
dotenv.config();

const SECRET = process.env.SESSION_SECRET || 'voto_nacional_secret_token_123';

/**
 * Verifica las credenciales e inicia sesión
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<object>} Token y datos del usuario
 */
export async function loginUser(username, password) {
  const users = await readTable('Usuarios');
  const user = users.find(u => u.Username.toLowerCase() === username.trim().toLowerCase());
  
  if (!user) {
    throw new Error('Usuario o contraseña incorrectos');
  }
  
  const isMatch = await bcrypt.compare(password, user.PasswordHash);
  if (!isMatch) {
    throw new Error('Usuario o contraseña incorrectos');
  }
  
  // Generar token JWT
  const token = jwt.sign(
    { 
      username: user.Username, 
      role: user.Role, 
      nombre: user.Nombre 
    },
    SECRET,
    { expiresIn: '12h' }
  );
  
  return {
    token,
    user: {
      username: user.Username,
      role: user.Role,
      nombre: user.Nombre
    }
  };
}

/**
 * Middleware para validar token JWT
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No autorizado.' });
  }
  
  jwt.verify(token, SECRET, (err, decodedUser) => {
    if (err) {
      return res.status(403).json({ error: 'Sesión expirada o token inválido.' });
    }
    req.user = decodedUser;
    next();
  });
}

/**
 * Middleware para validar roles
 */
export function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permisos insuficientes para realizar esta acción.' });
    }
    
    next();
  };
}
