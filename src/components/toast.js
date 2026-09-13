// ============================================================
// Componente: Toast
// Notificación breve de éxito o error (ej. "Movimiento aprobado").
// ============================================================

let toastRoot = null;

/**
 * Guarda el contenedor HTML donde se mostrarán las notificaciones.
 */
export function initToast(root) {
  toastRoot = root;
}

/**
 * Crea la notificación con el mensaje y tipo (éxito o error), 
 * la muestra en pantalla y la elimina automáticamente a los 3.5 segundos.
 */
export function showToast(message, type = 'ok') {
  if (!toastRoot) return;

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  toastRoot.appendChild(el);

  setTimeout(() => el.remove(), 3500);
}