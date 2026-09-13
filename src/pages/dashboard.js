// ============================================================
// Página: Dashboard
// ============================================================

import { getDashboardStats } from '../services/dashboardService.js';
import { kpiCardHtml } from '../components/kpicard.js';
import { formatCurrency, formatNumber } from '../utils/formatters.js';
import { getStatusPillClass } from '../utils/status.js';

/**
 * Consulta las estadísticas del inventario y arma el HTML de la vista 
 * con los totales principales y el historial reciente de movimientos.
 */
export async function renderDashboard(container) {
  const stats = await getDashboardStats();

  container.innerHTML = `
    <h2 class="page-title">Dashboard</h2>

    <div class="status-grid">
      ${kpiCardHtml({ label: 'Total de artículos', value: formatNumber(stats.totalItems) })}
      ${kpiCardHtml({ label: 'Stock total', value: formatNumber(stats.totalStock) })}
      ${kpiCardHtml({ label: 'Bajo stock mínimo', value: formatNumber(stats.belowMin) })}
      ${kpiCardHtml({ label: 'Valor del inventario', value: formatCurrency(stats.totalValue) })}
    </div>

    <h3 class="section-title">Movimientos recientes</h3>
    <ul class="recent-list">
      ${
        stats.recentMovements.length === 0
          ? '<li class="empty-row">Sin movimientos todavía</li>'
          : stats.recentMovements
              .map(
                (m) => `
            <li>
              <span class="mono">${m.inventory_items?.sku ?? '—'}</span>
              — ${m.inventory_items?.name ?? ''}
              · ${m.movement_type} ${formatNumber(m.quantity)}
              · <span class="pill ${getStatusPillClass(m.status)}">${m.status}</span>
            </li>`
              )
              .join('')
      }
    </ul>
  `;
}