// ============================================================
// Componente: Toast
// Notificación breve de éxito o error (ej. "Movimiento aprobado").
// ============================================================

let toastRoot = null;

export function initToast(root) {
  toastRoot = root;
}

export function showToast(message, type = 'ok') {
  if (!toastRoot) return;

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  toastRoot.appendChild(el);

  setTimeout(() => el.remove(), 3500);
}