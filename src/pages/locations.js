// ============================================================
// Página: Almacén
// Lista de posiciones del almacén (warehouse_locations) y su
// estado de ocupación.
// ============================================================

import { listLocations, createLocation } from '../services/locationsService.js';
import { dataTableHtml, bindDataTablePagination } from '../components/datatable.js';
import { buttonHtml } from '../components/button.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let tableContainerEl = null;
let tablePage = 1;

/**
 * Inicializa y monta la vista principal del Almacén en el contenedor indicado.
 * Crea la interfaz (título, barra de herramientas, botón de agregar) y gestiona los eventos globales.
 */
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

  // Redibujar la tabla automáticamente cuando se redimensiona la ventana
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      refreshTable(tablePage);
    }, 150);
  });

  container.querySelector('#new-location-btn').addEventListener('click', openLocationForm);
}

/**
 * Consulta las posiciones de almacén al servicio y actualiza el HTML de la tabla 
 * según la página actual, incluyendo los bindings de paginación.
 */
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

/**
 * Despliega la ventana modal con el formulario para registrar una nueva ubicación física.
 * Gestiona la autogeneración dinámica del código (`Rack_Posición`) y el envío a la BD.
 */
function openLocationForm() {
  openModal(`
    <h3>Nueva ubicación</h3>
    <form id="location-form" class="form">
      <label>Código (se genera automáticamente)
        <input name="code" class="input" readonly value="" placeholder="Se completa según Rack + Posición" />
      </label>
      <label>Zona <input name="zone" class="input" placeholder="Ej. Almacen A" /></label>
      <label>Rack <input name="rack" class="input" placeholder="Ej. Rack-03" required /></label>
      <label>Posición <input name="position" class="input" placeholder="Ej. A-03-02" required /></label>
      <label>Capacidad <input name="capacity" type="number" min="1" class="input" value="1" /></label>

      <div class="modal-actions">
        ${buttonHtml('Cancelar', { variant: 'ghost', extraAttrs: 'data-close-modal' })}
        ${buttonHtml('Crear ubicación', { type: 'submit' })}
      </div>
    </form>
  `);

  const form = document.getElementById('location-form');
  const codeInput = form.querySelector('[name="code"]');
  const rackInput = form.querySelector('[name="rack"]');
  const positionInput = form.querySelector('[name="position"]');

  // Regenera el código en vivo cada vez que cambian rack o posición
  function updateCodePreview() {
    const rack = rackInput.value.trim();
    const position = positionInput.value.trim();
    codeInput.value = rack && position ? `${rack}_${position}` : '';
  }
  rackInput.addEventListener('input', updateCodePreview);
  positionInput.addEventListener('input', updateCodePreview);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));

    try {
      await createLocation({
        code: `${formData.rack}_${formData.position}`,
        zone: formData.zone,
        rack: formData.rack,
        position: formData.position,
        capacity: Number(formData.capacity) || 1,
      });
      showToast('Ubicación creada');
      closeModal();
      tablePage = 1;
      await refreshTable();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}