// ============================================================
// Página: Inventario
// Tabla principal + búsqueda por artículo/SKU + filtros por
// categoría, proveedor y estado de stock + CRUD de artículos.
// ============================================================

import { createInventoryRecord, listInventoryWithItems } from '../services/inventoryService.js';
import { createItem, updateItem, deleteItem } from '../services/itemsService.js';
import { dataTableHtml, bindDataTablePagination } from '../components/dataTable.js';
import { buttonHtml } from '../components/button.js';
import { openModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';
import { formatCurrency, formatNumber } from '../utils/formatters.js';
import { getStockStatus } from '../utils/status.js';

let allRows = [];
let tableContainerEl = null;
let tablePage = 1;

export async function renderInventory(container) {
  allRows = await listInventoryWithItems();

  container.innerHTML = `
    <h2 class="page-title">Inventario</h2>

    <div class="toolbar">
      <input type="text" id="search-input" class="input" placeholder="Buscar por artículo o SKU..." />
      <select id="category-filter" class="input"><option value="">Todas las categorías</option></select>
      <select id="supplier-filter" class="input"><option value="">Todos los proveedores</option></select>
      <select id="stock-filter" class="input">
        <option value="">Todos los estados de stock</option>
        <option value="low">Bajo mínimo</option>
        <option value="ok">Normal</option>
      </select>
      ${buttonHtml('+ Nuevo artículo', { extraAttrs: 'id="new-item-btn"' })}
    </div>

    <div id="table-container"></div>
  `;

  tableContainerEl = container.querySelector('#table-container');
  populateFilterOptions(container);
  renderTable(allRows);

  container.querySelector('#search-input').addEventListener('input', () => applyFilters(container));
  container.querySelector('#category-filter').addEventListener('change', () => applyFilters(container));
  container.querySelector('#supplier-filter').addEventListener('change', () => applyFilters(container));
  container.querySelector('#stock-filter').addEventListener('change', () => applyFilters(container));
  container.querySelector('#new-item-btn').addEventListener('click', () => openItemForm());
}

function populateFilterOptions(container) {
  const categories = [...new Set(allRows.map((r) => r.inventory_items?.category).filter(Boolean))];
  const suppliers = [...new Set(allRows.map((r) => r.inventory_items?.supplier).filter(Boolean))];

  const categorySelect = container.querySelector('#category-filter');
  categories.forEach((c) => categorySelect.insertAdjacentHTML('beforeend', `<option value="${c}">${c}</option>`));

  const supplierSelect = container.querySelector('#supplier-filter');
  suppliers.forEach((s) => supplierSelect.insertAdjacentHTML('beforeend', `<option value="${s}">${s}</option>`));
}

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
          const s = getStockStatus(r.quantity, r.min_stock);
          return `<span class="pill ${s.className}">${s.text}</span>`;
        },
      },
    ],
    rows,
    pagination: { page: tablePage },
    actions: (r) => `
      ${buttonHtml('Editar', { variant: 'ghost', size: 'sm', extraAttrs: `data-edit="${r.id}"` })}
      ${buttonHtml('Eliminar', { variant: 'danger', size: 'sm', extraAttrs: `data-delete="${r.item_id}"` })}
    `,
  });

  bindDataTablePagination(tableContainerEl, (nextPage) => renderTable(rows, nextPage));

  tableContainerEl.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const row = allRows.find((r) => r.id === btn.dataset.edit);
      openItemForm(row);
    });
  });

  tableContainerEl.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => handleDelete(btn.dataset.delete));
  });
}

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
      allRows = await listInventoryWithItems();
      tablePage = 1;
      renderTable(allRows);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

async function createInventoryForItem(itemId) {
  await createInventoryRecord({ item_id: itemId, quantity: 0, min_stock: 0 });
}

async function handleDelete(itemId) {
  if (!confirm('¿Eliminar este artículo? Esta acción no se puede deshacer.')) return;
  try {
    await deleteItem(itemId);
    showToast('Artículo eliminado');
    allRows = await listInventoryWithItems();
    tablePage = 1;
    renderTable(allRows);
  } catch (err) {
    showToast(err.message, 'error');
  }
}