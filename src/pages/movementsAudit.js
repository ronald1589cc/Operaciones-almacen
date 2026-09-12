// ============================================================
// Página: Auditoría de Movimientos (solo admin)
// Muestra cada cambio de estado (Pendiente → Aprobado/Rechazado),
// quién lo hizo y cuándo.
// ============================================================

import { listMovementAuditLog } from '../services/auditService.js';
import { dataTableHtml } from '../components/dataTable.js';

export async function renderMovementsAudit(container) {
  const rows = await listMovementAuditLog();

  container.innerHTML = `
    <h2 class="page-title">Auditoría de Movimientos</h2>
    <div id="table-container"></div>
  `;

  container.querySelector('#table-container').innerHTML = dataTableHtml({
    columns: [
      {
        key: 'changed_at',
        label: 'Fecha',
        render: (r) => new Date(r.changed_at).toLocaleString('es-PE'),
      },
      {
        key: 'sku',
        label: 'SKU',
        render: (r) => `<span class="mono">${r.inventory_movements?.inventory_items?.sku ?? ''}</span>`,
      },
      {
        key: 'name',
        label: 'Artículo',
        render: (r) => r.inventory_movements?.inventory_items?.name ?? '',
      },
      {
        key: 'transition',
        label: 'Cambio de estado',
        render: (r) => `${r.previous_status ?? '—'} → <strong>${r.new_status}</strong>`,
      },
      {
        key: 'user',
        label: 'Realizado por',
        render: (r) => r.profiles?.full_name ?? '—',
      },
      { key: 'notes', label: 'Notas', render: (r) => r.notes ?? '' },
    ],
    rows,
  });
}