// ============================================================
// Página: Inventario
// Tabla principal + búsqueda por artículo/SKU + filtros por
// categoría, proveedor y estado de stock + CRUD de artículos.
// ============================================================

import { createInventoryRecord, listInventoryWithItems, updateInventoryRecord } from '../services/inventoryService.js';
import { createItem, updateItem, deactivateItem, reactivateItem } from '../services/itemsService.js';
import { listLocations } from '../services/locationsService.js';
import { dataTableHtml, bindDataTablePagination } from '../components/datatable.js';
import { buttonHtml } from '../components/button.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, formatNumber } from '../utils/formatters.js';
import { getStockStatus } from '../utils/status.js';

let allRows = [];
let tableContainerEl = null;
let tablePage = 1;
let showingInactive = false;

/**
 * Obtiene desde el servicio todos los registros de inventario e ítems,
 * filtrando únicamente los que tienen estado activo (is_active !== false).
 */
async function loadActiveRows() {
  const rows = await listInventoryWithItems();
  return rows.filter((r) => r.inventory_items?.is_active !== false);
}

/**
 * Obtiene desde el servicio todos los registros de inventario e ítems,
 * filtrando únicamente los que tienen estado inactivo (is_active === false).
 */
async function loadInactiveRows() {
  const rows = await listInventoryWithItems();
  return rows.filter((r) => r.inventory_items?.is_active === false);
}

/**
 * Restablece todos los inputs y selectores de filtrado a sus valores por defecto
 * y vuelve a renderizar la tabla desde la página 1 con todos los datos.
 */
function clearFilters(container) {
  container.querySelector('#search-input').value = '';
  container.querySelector('#category-filter').value = '';
  container.querySelector('#supplier-filter').value = '';
  container.querySelector('#stock-filter').value = '';
  tablePage = 1;
  renderTable(allRows);
}

/**
 * Alterna el estado de la vista entre "Activos" e "Inactivos".
 * Cambia la apariencia del botón (colores y texto) y recarga los datos correspondientes.
 */
async function toggleInactiveView(container) {
  showingInactive = !showingInactive;
  const btn = container.querySelector('#toggle-inactive-btn');
  btn.textContent = showingInactive ? 'Mostrar activos' : 'Mostrar inactivos';
  btn.classList.toggle('btn-danger', !showingInactive);
  btn.classList.toggle('btn-primary', showingInactive);
  tablePage = 1;

  if (showingInactive) {
    renderTable(await loadInactiveRows());
  } else {
    allRows = await loadActiveRows();
    renderTable(allRows);
  }
}

/**
 * Inicializa y monta toda la vista de Inventario dentro del contenedor especificado.
 * Renderiza el HTML estructural (título, barra de herramientas, buscador, filtros) y sus eventos.
 */
export async function renderInventory(container) {
  allRows = await loadActiveRows();

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h2 class="page-title" style="margin-bottom: 0;">Inventario</h2>
      ${buttonHtml('Mostrar inactivos', { variant: 'danger', extraAttrs: 'id="toggle-inactive-btn"' })}
    </div>
    <div class="toolbar">
      <input type="text" id="search-input" class="input" placeholder="Buscar por artículo o SKU..." />
      <select id="category-filter" class="input"><option value="">Todas las categorías</option></select>
      <select id="supplier-filter" class="input"><option value="">Todos los proveedores</option></select>
      <select id="stock-filter" class="input">
        <option value="">Todos los estados de stock</option>
        <option value="low">Bajo mínimo</option>
        <option value="ok">Normal</option>
      </select>
      ${buttonHtml('Limpiar filtros', { extraAttrs: 'id="clear-filters-btn"' })}
      ${buttonHtml('+ Nuevo artículo', { extraAttrs: 'id="new-item-btn"' })}
    </div>
    <div id="table-container"></div>
  `;

  tableContainerEl = container.querySelector('#table-container');
  populateFilterOptions(container);
  renderTable(allRows);

  // Redibujar la tabla automáticamente cuando se redimensiona la ventana
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      applyFilters(container);
    }, 150);
  });

  container.querySelector('#search-input').addEventListener('input', () => applyFilters(container));
  container.querySelector('#category-filter').addEventListener('change', () => applyFilters(container));
  container.querySelector('#supplier-filter').addEventListener('change', () => applyFilters(container));
  container.querySelector('#stock-filter').addEventListener('change', () => applyFilters(container));
  container.querySelector('#new-item-btn').addEventListener('click', () => openItemForm());
  container.querySelector('#clear-filters-btn').addEventListener('click', () => clearFilters(container));
  container.querySelector('#toggle-inactive-btn').addEventListener('click', () => toggleInactiveView(container));
}

/**
 * Extrae dinámicamente las categorías y proveedores únicos de los registros (`allRows`)
 * y rellena las opciones dentro de los elementos `<select>` correspondientes.
 */
function populateFilterOptions(container) {
  const categories = [...new Set(allRows.map((r) => r.inventory_items?.category).filter(Boolean))];
  const suppliers = [...new Set(allRows.map((r) => r.inventory_items?.supplier).filter(Boolean))];

  const categorySelect = container.querySelector('#category-filter');
  categories.forEach((c) => categorySelect.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));

  const supplierSelect = container.querySelector('#supplier-filter');
  suppliers.forEach((s) => supplierSelect.insertAdjacentHTML('beforeend', `<option value="${s}">${s}</option>`));
}

/**
 * Lee los valores del buscador por texto, filtro de categoría, proveedor y estado de stock;
 * procesa `allRows` para obtener solo los registros coincidentes y solicita re-renderizar la tabla.
 */
function applyFilters(container) {
  const search = container.querySelector('#search-input').value.trim().toLowerCase();
  const category = container.querySelector('#category-filter').value;
  const supplier = container.querySelector('#supplier-filter').value;
  const stockState = container.querySelector('#stock-filter').value;

  const filtered = allRows.filter((r) => {
    const item = r.inventory_items ?? {};
    const matchesSearch =
      !search || item.name?.toLowerCase().includes(search) || item.sku?.toLowerCase().includes(search);
    const matchesCategory = !category || item.category === category;
    const matchesSupplier = !supplier || item.supplier === supplier;
    const isLow = r.quantity < r.min_stock;
    const matchesStock = !stockState || (stockState === 'low' ? isLow : !isLow);

    return matchesSearch && matchesCategory && matchesSupplier && matchesStock;
  });

  tablePage = 1;
  renderTable(filtered);
}

/**
 * Genera el componente visual de la tabla de datos (`dataTableHtml`) con sus respectivas columnas,
 * badges de estado, formateo de moneda/números y botones de acción; además vincula los listeners a los botones.
 */
function renderTable(rows, page = tablePage) {
  tablePage = page;
  tableContainerEl.innerHTML = dataTableHtml({
    columns: [
      { key: 'sku', label: 'SKU', render: (r) => `<span class="mono">${r.inventory_items?.sku ?? ''}</span>` },
      { key: 'name', label: 'Artículo', render: (r) => r.inventory_items?.name ?? '' },
      { key: 'category', label: 'Categoría', render: (r) => r.inventory_items?.category ?? '' },
      { key: 'quantity', label: 'Stock', render: (r) => formatNumber(r.quantity) },
      { key: 'cost', label: 'Costo', render: (r) => formatCurrency(r.inventory_items?.cost) },
      { key: 'price', label: 'Precio', render: (r) => formatCurrency(r.inventory_items?.price) },
      { key: 'supplier', label: 'Proveedor', render: (r) => r.inventory_items?.supplier ?? '' },
      {
        key: 'status',
        label: 'Estado',
        render: (r) => {
          if (r.inventory_items?.is_active === false) {
            return '<span class="pill error">Inactivo</span>';
          }
          const s = getStockStatus(r.quantity, r.min_stock);
          return `<span class="pill ${s.className}">${s.text}</span>`;
        },
      },
    ],
    rows,
    pagination: { page: tablePage },
    actions: (r) =>
      showingInactive
        ? buttonHtml('Reactivar', { variant: 'ghost', size: 'sm', extraAttrs: `data-reactivate="${r.item_id}"` })
        : `
          ${buttonHtml('Editar', { variant: 'ghost', size: 'sm', extraAttrs: `data-edit="${r.id}"` })}
          ${buttonHtml('Editar stock', { variant: 'ghost', size: 'sm', extraAttrs: `data-edit-stock="${r.id}"` })}
          ${buttonHtml('<i data-lucide="trash"></i>', { variant: 'danger', size: 'sm', extraAttrs: `data-deactivate="${r.item_id}"` })}
        `,
  });

  bindDataTablePagination(tableContainerEl, (nextPage) => renderTable(rows, nextPage));

  tableContainerEl.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = allRows.find((r) => r.id === btn.dataset.edit);
      openItemForm(row);
    });
  });

  tableContainerEl.querySelectorAll('[data-edit-stock]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = allRows.find((r) => r.id === btn.dataset.editStock);
      openStockForm(row);
    });
  });

  tableContainerEl.querySelectorAll('[data-deactivate]').forEach((btn) => {
    btn.addEventListener('click', () => handleDeactivate(btn.dataset.deactivate));
  });

  tableContainerEl.querySelectorAll('[data-reactivate]').forEach((btn) => {
    btn.addEventListener('click', () => handleReactivate(btn.dataset.reactivate));
  });
}

/**
 * Despliega una ventana modal con un formulario para Crear un nuevo artículo o Editar uno existente.
 * Procesa el envío del formulario mediante la API (createItem / updateItem) y refresca la vista.
 */
function openItemForm(row = null) {
  const item = row?.inventory_items ?? {};
  const isEdit = Boolean(row);

  openModal(`
    <h3>${isEdit ? 'Editar artículo' : 'Nuevo artículo'}</h3>
    <form id="item-form" class="form">
      <label>SKU <input name="sku" class="input" value="${item.sku ?? ''}" required /></label>
      <label>Nombre <input name="name" class="input" value="${item.name ?? ''}" required /></label>
      <label>Categoría <input name="category" class="input" value="${item.category ?? ''}" /></label>
      <label>Descripción <textarea name="description" class="input">${item.description ?? ''}</textarea></label>
      <div class="form-row">
        <label>Marca <input name="brand" class="input" value="${item.brand ?? ''}" /></label>
        <label>Talla <input name="size" class="input" value="${item.size ?? ''}" /></label>
        <label>Peso <input name="weight" type="number" step="0.01" class="input" value="${item.weight ?? ''}" /></label>
        <label>Largo <input name="length" type="number" step="0.01" class="input" value="${item.length ?? ''}" /></label>
        <label>Ancho <input name="width" type="number" step="0.01" class="input" value="${item.width ?? ''}" /></label>
        <label>Alto <input name="height" type="number" step="0.01" class="input" value="${item.height ?? ''}" /></label>
      </div>
      <div class="form-row">
        <label>Precio <input name="price" type="number" step="0.01" class="input" value="${item.price ?? 0}" /></label>
        <label>Costo <input name="cost" type="number" step="0.01" class="input" value="${item.cost ?? 0}" /></label>
      </div>
      <label>Proveedor <input name="supplier" class="input" value="${item.supplier ?? ''}" /></label>

      <div class="modal-actions">
        ${buttonHtml('Cancelar', { variant: 'ghost', extraAttrs: 'data-close-modal' })}
        ${buttonHtml(isEdit ? 'Guardar cambios' : 'Crear artículo', { type: 'submit' })}
      </div>
    </form>
  `);

  document.getElementById('item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));
    const payload = {
      ...formData,
      weight: formData.weight ? Number(formData.weight) : null,
      length: formData.length ? Number(formData.length) : null,
      width: formData.width ? Number(formData.width) : null,
      height: formData.height ? Number(formData.height) : null,
      price: Number(formData.price) || 0,
      cost: Number(formData.cost) || 0,
    };

    try {
      if (isEdit) {
        await updateItem(item.id, payload);
        showToast('Artículo actualizado');
      } else {
        const newItem = await createItem(payload);
        // Relación 1:1: se crea el registro de inventario correspondiente
        await createInventoryForItem(newItem.id);
        showToast('Artículo creado');
      }
      closeModal();
      allRows = await loadActiveRows();
      tablePage = 1;
      renderTable(allRows);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

/**
 * Abre una ventana modal para editar parámetros propios del inventario
 * (ubicación física, stock mínimo y máximo), sin permitir modificar directamente las existencias (quantity).
 */
async function openStockForm(row) {
  const locations = await listLocations();

  openModal(`
    <h3>Editar stock — ${row.inventory_items?.sku ?? ''}</h3>
    <p class="text-dim" style="font-size: 13px; margin-top: -8px;">
      La cantidad (${formatNumber(row.quantity)} unidades) no se edita aquí — solo cambia
      mediante movimientos aprobados (Entrada/Salida/Ajuste), para mantener la trazabilidad.
    </p>
    <form id="stock-form" class="form">
      <label>Ubicación
        <select name="location_id" class="input">
          <option value="">Sin asignar</option>
          ${locations
            .map(
              (loc) =>
                `<option value="${loc.id}" ${loc.id === row.location_id ? 'selected' : ''}>${loc.code} — ${loc.zone ?? ''}</option>`
            )
            .join('')}
        </select>
      </label>
      <label>Stock mínimo <input name="min_stock" type="number" min="0" class="input" value="${row.min_stock ?? 0}" required /></label>
      <label>Stock máximo <input name="max_stock" type="number" min="0" class="input" value="${row.max_stock ?? ''}" /></label>

      <div class="modal-actions">
        ${buttonHtml('Cancelar', { variant: 'ghost', extraAttrs: 'data-close-modal' })}
        ${buttonHtml('Guardar cambios', { type: 'submit' })}
      </div>
    </form>
  `);

  document.getElementById('stock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = Object.fromEntries(new FormData(e.target));

    try {
      await updateInventoryRecord(row.id, {
        location_id: formData.location_id || null,
        min_stock: Number(formData.min_stock) || 0,
        max_stock: formData.max_stock ? Number(formData.max_stock) : null,
      });
      showToast('Información de inventario actualizada');
      closeModal();
      allRows = await loadActiveRows();
      renderTable(allRows);
    } catch (err) {
      const isDuplicateLocation =
        err.code === '23505' || err.message?.includes('inventory_location_id_unique');

      showToast(
        isDuplicateLocation
          ? 'Esta ubicación ya está ocupada por otro artículo. Elige una diferente.'
          : err.message,
        'error'
      );
    }
  });
}

/**
 * Crea automáticamente el registro inicial de inventario en cero (quantity: 0, min_stock: 0)
 * para un artículo recién creado en la base de datos.
 */
async function createInventoryForItem(itemId) {
  await createInventoryRecord({ item_id: itemId, quantity: 0, min_stock: 0 });
}

/**
 * Pide confirmación al usuario para realizar la desactivación (baja lógica) de un artículo.
 * Ejecuta la baja en la BD, notifica mediante un Toast y actualiza la lista.
 */
async function handleDeactivate(itemId) {
  if (!confirm('¿Desactivar este artículo? Se ocultará como retirado, pero conservará su historial y podrás reactivarlo después.')) return;
  try {
    await deactivateItem(itemId);
    showToast('Artículo desactivado');
    allRows = await loadActiveRows();
    tablePage = 1;
    renderTable(allRows);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Reactiva un artículo que previamente había sido dado de baja (is_active = false).
 * Actualiza la base de datos, muestra una notificación y refresca la lista de inactivos.
 */
async function handleReactivate(itemId) {
  try {
    await reactivateItem(itemId);
    showToast('Artículo reactivado');
    tablePage = 1;
    if (showingInactive) {
      renderTable(await loadInactiveRows());
    } else {
      allRows = await loadActiveRows();
      renderTable(allRows);
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}