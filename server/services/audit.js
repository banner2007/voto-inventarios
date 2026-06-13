import { appendRows } from './googleSheets.js';
import crypto from 'crypto';

/**
 * Registra una acción de auditoría en Google Sheets de forma asíncrona
 * @param {string} username - Nombre de usuario que realiza la acción
 * @param {string} action - Descripción de la acción realizada
 */
export async function logAudit(username, action) {
  try {
    const auditRecord = {
      IdAuditoria: crypto.randomUUID(),
      Usuario: username || 'Sistema',
      Accion: action,
      Fecha: new Date().toISOString()
    };
    // Escribimos en segundo plano sin bloquear el flujo principal
    appendRows('Auditoria', [auditRecord]).catch(err => {
      console.error('Error en appendRows de Auditoría:', err);
    });
  } catch (error) {
    console.error('Error en logAudit:', error);
  }
}
