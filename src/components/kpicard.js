// ============================================================
// Componente: KPI Card
// Una tarjeta de métrica del dashboard (label + valor).
// ============================================================

export function kpiCardHtml({ label, value }) {
  return `
    <div class="status-item">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
    </div>
  `;
}