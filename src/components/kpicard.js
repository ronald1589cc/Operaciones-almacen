// ============================================================
// Componente: KPI Card
// Una tarjeta de métrica del dashboard (label + valor).
// ============================================================

/**
 * Función que arma el código HTML de una tarjeta indicadora pasando 
 * únicamente el título y el valor numérico o texto a mostrar.
 */
export function kpiCardHtml({ label, value }) {
  return `
    <div class="status-item">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
    </div>
  `;
}