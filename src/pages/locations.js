// ============================================================
// Página: Almacén
// Lista de posiciones del almacén (warehouse_locations) y su
// estado de ocupación.
// ============================================================

import { listLocations, createLocation } from '../services/locationsService.js';
import { dataTableHtml, bindDataTablePagination } from '../components/dataTable.js';
import { buttonHtml } from '../components/button.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let tableContainerEl = null;
let tablePage = 1;

export async function renderLocations(container) {
  container.innerHTML = `
    <h2 class="page-title">Almacén</h2>
    <div class="toolbar">
      ${buttonHtml('+ Nueva ubicación', { extraAttrs: 'id="new-location-btn"' })}
    </div>
    <div id="table-container"></div>
  `;

  tableContainerEl = container.querySelector('#table-container');
  await refreshTable();

  container.querySelector('#new-location-btn').addEventListener('click', openLocationForm);
}

async function refreshTable(page = tablePage) {
  tablePage = page;
  const locations = await listLocations();

  tableContainerEl.innerHTML = dataTableHtml({
    columns: [
      { key: 'code', label: 'Código', render: (l) => `<span class="mono">${l.code}</span>` },
      { key: 'zone', label: 'Zona' },
      { key: 'rack', label: 'Rack' },
      { key: 'position', label: 'Posición' },
      { key: 'capacity', label: 'Capacidad' },
      {
        key: 'is_occupied',
        label: 'Estado',
        render: (l) => (l.is_occupied ? '<span class="pill error">Ocupada</span>' : '<span class="pill ok">Libre</span>'),
      },
    ],
    rows: locations,
    pagination: { page: tablePage },
  });

  bindDataTablePagination(tableContainerEl, (nextPage) => refreshTable(nextPage));
}

function openLocationForm() {
  openModal(`
    <h3>Nueva ubicación</h3>
    <form id="location-form" class="form">
      <label>Código <input name="code" class="input" placeholder="Ej. ALM-A-R03-A0302" required /></label>
      <label>Zona <input name="zone" class="input" placeholder="Ej. Almacen A" /></label>
      <label>Rack <input name="rack" class="input" placeholder="Ej. Rack-03" /></label>
      <label>Posición <input name="position" class="input" placeholder="Ej. A-03-02" /></label>
      <label>Capacidad <input name="capacity" type="number" min="1" class="input" value="1" /></label>

      <div class="modal-actions">
        ${buttonHtml('Cancelar', { variant: 'ghost', extraAttrs: 'data-close-modal' })}
        ${buttonHtml('Crear ubicación', { type: 'submit' })}
      </div>
    </form>
  `);

  document.getElementById('location-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));

    try {
      await createLocation({ ...formData, capacity: Number(formData.capacity) || 1 });
      showToast('Ubicación creada');
      closeModal();
      tablePage = 1;
      await refreshTable();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}