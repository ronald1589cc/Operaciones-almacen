// ============================================================
// Componente: Button
// Genera el HTML de un botón con variantes, tamaños e iconos consistentes.
// ============================================================

const VARIANTS = ['primary', 'secondary', 'success', 'danger', 'ghost'];
const SIZES = ['sm', 'md', 'lg'];

/**
 * Genera el HTML de un botón con variantes, tamaños e iconos consistentes.
 * @param {string} label - Texto del botón
 * @param {Object} [options]
 * @param {'primary'|'secondary'|'success'|'danger'|'ghost'} [options.variant='primary']
 * @param {'sm'|'md'|'lg'} [options.size='md']
 * @param {'button'|'submit'|'reset'} [options.type='button']
 * @param {string} [options.icon=''] - Icono o emoji opcional
 * @param {boolean} [options.disabled=false]
 * @param {string} [options.className=''] - Clases CSS adicionales
 * @param {string} [options.extraAttrs=''] - Atributos HTML adicionales (data-*, id, etc.)
 * @returns {string} HTML string del botón
 */
export function buttonHtml(label, {
  variant = 'primary',
  size = 'md',
  type = 'button',
  icon = '',
  disabled = false,
  className = '',
  extraAttrs = '',
} = {}) {
  const safeVariant = VARIANTS.includes(variant) ? variant : 'primary';
  const sizeClass = size !== 'md' && SIZES.includes(size) ? `btn-${size}` : '';
  const classes = ['btn', `btn-${safeVariant}`, sizeClass, className].filter(Boolean).join(' ');

  const iconHtml = icon ? `<span class="btn-icon">${icon}</span>` : '';
  const disabledAttr = disabled ? 'disabled' : '';

  return `<button type="${type}" class="${classes}" ${disabledAttr} ${extraAttrs}>${iconHtml}${label}</button>`.trim();
}