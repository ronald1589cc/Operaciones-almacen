// ============================================================
// Página: Auditoría de Artículos (solo admin)
// Cubre 2 tablas distinguidas por table_name:
//   - inventory_items: crear / editar / eliminar artículo
//   - inventory: crear / modificar registro de stock
// ============================================================

import { listItemAuditLog } from '../services/auditService.js';
import { dataTableHtml } from '../components/dataTable.js';
import { openModal } from '../components/modal.js';

const TABLE_LABELS = { inventory_items: 'Artículo', inventory: 'Stock' };
const ACTION_LABELS = { created: 'Creado', updated: 'Editado', deleted: 'Eliminado' };
const ACTION_PILL_CLASS = { created: 'ok', updated: 'loading', deleted: 'error' };

let currentRows = [];

/**
 * Inicializa y renderiza la vista completa de Auditoría de Artículos.
 * Carga los registros desde el servicio y construye la tabla interactiva de auditoría.
 */
export async function renderItemsAudit(container) {
  currentRows = await listItemAuditLog();

  container.innerHTML = `
    <h2 class="page-title">Auditoría de Artículos</h2>
    <div id="table-container"></div>
  `;

  const tableEl = container.querySelector('#table-container');
  tableEl.innerHTML = dataTableHtml({
    columns: [
      {
        key: 'changed_at',
        label: 'Fecha',
        render: (r) => new Date(r.changed_at).toLocaleString('es-PE'),
      },
      { key: 'sku', label: 'SKU', render: (r) => `<span class="mono">${r.sku ?? ''}</span>` },
      { key: 'name', label: 'Artículo', render: (r) => r.name ?? '' },
      {
        key: 'table_name',
        label: 'Tabla',
        render: (r) => TABLE_LABELS[r.table_name] ?? r.table_name,
      },
      {
        key: 'action',
        label: 'Acción',
        render: (r) =>
          `<span class="pill ${ACTION_PILL_CLASS[r.action]}">${ACTION_LABELS[r.action]}</span>`,
      },
      {
        key: 'user',
        label: 'Realizado por',
        render: (r) => r.profiles?.full_name ?? '—',
      },
    ],
    rows: currentRows,
    actions: (r) => `<button class="btn btn-ghost btn-sm" data-detail="${r.id}">Ver detalle</button>`,
  });

  tableEl.querySelectorAll('[data-detail]').forEach((btn) => {
    btn.addEventListener('click', () => showDetailModal(btn.dataset.detail));
  });
}

/**
 * Busca un registro de auditoría por su ID y despliega una ventana modal 
 * con la información detallada y la estructura JSON de los cambios (`changes`).
 */
function showDetailModal(rowId) {
  const row = currentRows.find((r) => r.id === rowId);
  if (!row) return;

  openModal(`
    <h3>Detalle del cambio</h3>
    <p class="text-dim" style="font-size: 13px; margin-top: -8px;">
      ${TABLE_LABELS[row.table_name]} · ${ACTION_LABELS[row.action]} · ${row.profiles?.full_name ?? '—'}
    </p>
    <pre style="white-space: pre-wrap; font-family: var(--font-mono); font-size: 12px; max-height: 400px; overflow-y: auto; background: var(--input-bg); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);">${JSON.stringify(row.changes, null, 2)}</pre>
    <div class="modal-actions">
      <button class="btn btn-ghost" type="button" data-close-modal>Cerrar</button>
    </div>
  `);
}