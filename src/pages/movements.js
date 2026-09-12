// ============================================================
// Página: Movimientos
// Tabla de movimientos + formulario de creación (Entrada/Salida/
// Ajuste) + botones Aprobar/Rechazar conectados a las funciones
// RPC approve_movement / reject_movement del paso 2.
// ============================================================

import { listMovements, createMovement, approveMovement, rejectMovement } from '../services/movementsService.js';
import { listInventoryWithItems } from '../services/inventoryService.js';
import { dataTableHtml, bindDataTablePagination } from '../components/dataTable.js';
import { buttonHtml } from '../components/button.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatDate, formatNumber } from '../utils/formatters.js';
import { getStatusPillClass } from '../utils/status.js';

let tableContainerEl = null;
let tablePage = 1;

export async function renderMovements(container) {
  container.innerHTML = `
    <h2 class="page-title">Movimientos</h2>
    <div class="toolbar">
      ${buttonHtml('+ Nuevo movimiento', { extraAttrs: 'id="new-movement-btn"' })}
    </div>
    <div id="table-container"></div>
  `;

  tableContainerEl = container.querySelector('#table-container');
  await refreshTable();

  // Redibujar la tabla automáticamente cuando se redimensiona la ventana
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      refreshTable(tablePage);
    }, 150);
  });

  container.querySelector('#new-movement-btn').addEventListener('click', openMovementForm);
}

async function refreshTable(page = tablePage) {
  tablePage = page;
  const movements = await listMovements();

  tableContainerEl.innerHTML = dataTableHtml({
    columns: [
      { key: 'created_at', label: 'Fecha', render: (m) => formatDate(m.created_at) },
      { key: 'sku', label: 'SKU', render: (m) => `<span class="mono">${m.inventory_items?.sku ?? ''}</span>` },
      { key: 'name', label: 'Artículo', render: (m) => m.inventory_items?.name ?? '' },
      { key: 'movement_type', label: 'Tipo' },
      { key: 'quantity', label: 'Cantidad', render: (m) => formatNumber(m.quantity) },
      { key: 'reason', label: 'Motivo' },
      { key: 'status', label: 'Estado', render: (m) => `<span class="pill ${getStatusPillClass(m.status)}">${m.status}</span>` },
    ],
    rows: movements,
    pagination: { page: tablePage },
    actions: (m) =>
      m.status === 'Pendiente'
        ? `
          ${buttonHtml('Aprobar', { variant: 'success', size: 'sm', extraAttrs: `data-approve="${m.id}"` })}
          ${buttonHtml('Rechazar', { variant: 'danger', size: 'sm', extraAttrs: `data-reject="${m.id}"` })}
        `
        : '<span class="text-dim">—</span>',
  });

  bindDataTablePagination(tableContainerEl, (nextPage) => refreshTable(nextPage));

  tableContainerEl.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', () => handleDecision(approveMovement, btn.dataset.approve, 'Movimiento aprobado'));
  });
  tableContainerEl.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', () => handleDecision(rejectMovement, btn.dataset.reject, 'Movimiento rechazado'));
  });
}

async function handleDecision(action, movementId, successMessage) {
  try {
    await action(movementId);
    showToast(successMessage);
    tablePage = 1;
    await refreshTable();
  } catch (err) {
    // La función RPC responde con error si quien llama no es admin,
    // o si el movimiento ya fue procesado.
    showToast(err.message, 'error');
  }
}

async function openMovementForm() {
  const inventoryRows = await listInventoryWithItems();

  openModal(`
    <h3>Nuevo movimiento</h3>
    <form id="movement-form" class="form">
      <label>Artículo
        <select name="inventory_row" class="input" required>
          <option value="">Selecciona un artículo</option>
          ${inventoryRows
            .map((r) => `<option value="${r.id}|${r.item_id}|${r.location_id ?? ''}">${r.inventory_items?.sku} — ${r.inventory_items?.name}</option>`)
            .join('')}
        </select>
      </label>

      <label>Tipo
        <div class="radio-group">
          <label><input type="radio" name="movement_type" value="Entrada" required /> Entrada</label>
          <label><input type="radio" name="movement_type" value="Salida" /> Salida</label>
          <label><input type="radio" name="movement_type" value="Ajuste" /> Ajuste</label>
        </div>
      </label>

      <label>Cantidad <input name="quantity" type="number" min="1" class="input" required /></label>
      <label>Motivo <input name="reason" class="input" placeholder="Ej. Compra de mercadería" /></label>
      <label>Notas <textarea name="notes" class="input"></textarea></label>

      <div class="modal-actions">
        ${buttonHtml('Cancelar', { variant: 'ghost', extraAttrs: 'data-close-modal' })}
        ${buttonHtml('Crear movimiento', { type: 'submit' })}
      </div>
    </form>
  `);

  document.getElementById('movement-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));
    const [inventory_id, item_id, location_id] = formData.inventory_row.split('|');

    try {
      await createMovement({
        item_id,
        inventory_id,
        movement_type: formData.movement_type,
        quantity: Number(formData.quantity),
        reason: formData.reason,
        notes: formData.notes,
        location_id: location_id || null,
      });
      showToast('Movimiento creado, queda Pendiente de aprobación');
      closeModal();
      tablePage = 1;
      await refreshTable();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}