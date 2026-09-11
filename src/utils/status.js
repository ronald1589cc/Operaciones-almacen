// ============================================================
// utils/status.js — Mapeo de estados y estilos visuales
// ============================================================

/**
 * Obtiene la clase CSS para el badge/pill según el estado del movimiento.
 * @param {'Aprobado'|'Rechazado'|'Pendiente'|string} status
 * @returns {'ok'|'error'|'loading'}
 */
export function getStatusPillClass(status) {
  switch (status) {
    case 'Aprobado':
      return 'ok';
    case 'Rechazado':
      return 'error';
    case 'Pendiente':
    default:
      return 'loading';
  }
}

/**
 * Determina el estado del inventario comparando el stock actual con el mínimo.
 * @param {number} quantity - Stock actual
 * @param {number} minStock - Stock mínimo requerido
 * @returns {{ text: string, className: string }}
 */
export function getStockStatus(quantity, minStock = 0) {
  const isLow = Number(quantity) < Number(minStock);
  return {
    text: isLow ? 'Bajo mínimo' : 'Normal',
    className: isLow ? 'error' : 'ok',
  };
}

