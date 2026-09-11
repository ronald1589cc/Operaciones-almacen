// ============================================================
// utils/formatters.js — Utilidades de formato
// ============================================================

/**
 * Formatea un valor numérico a moneda con separadores de miles y decimales.
 * @param {number|string} amount - Cantidad a formatear
 * @param {string} [currency='USD'] - Código ISO de moneda (ej. 'USD', 'PEN', 'EUR')
 * @returns {string} Texto formateado (ej. "$ 1,250.00")
 */
export function formatCurrency(amount, currency = 'USD') {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Formatea una fecha ISO o timestamp a formato local legible.
 * @param {string|Date} dateValue - Fecha a formatear
 * @param {boolean} [includeTime=false] - Si debe incluir la hora
 * @returns {string} Fecha formateada (ej. "10 sept 2026" o "10/09/2026, 13:15")
 */
export function formatDate(dateValue, includeTime = false) {
  if (!dateValue) return '—';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('es-PE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' }),
  });
}

/**
 * Formatea un número entero o decimal con separador de miles.
 * @param {number|string} num
 * @returns {string}
 */
export function formatNumber(num) {
  const value = Number(num) || 0;
  return new Intl.NumberFormat('es-PE').format(value);
}

