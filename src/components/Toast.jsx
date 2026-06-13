import React, { useEffect } from 'react';

/**
 * Componente Toast para alertas flotantes
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de toast ('success', 'error', 'warning')
 * @param {function} onClose - Callback de cierre
 */
export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
    </div>
  );
}
