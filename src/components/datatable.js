// ============================================================
// Componente: DataTable
// Tabla generica reutilizable: recibe columnas, filas, y una
// funcion opcional para renderizar la celda de "Acciones".
//
// columns: [{ key, label, render?(row) }]
// rows: [{...}]
// actions?: (row) => htmlString
// pagination?: { page?, pageSize?, enabled? }
// ============================================================

const DEFAULT_ROW_HEIGHT = 52;
const RESERVED_VERTICAL_SPACE = 330;
const MIN_PAGE_SIZE = 5;

function getAutoPageSize() {
  if (typeof window === 'undefined') return 8;

  const availableHeight = window.innerHeight - RESERVED_VERTICAL_SPACE;
  return Math.max(MIN_PAGE_SIZE, Math.floor(availableHeight / DEFAULT_ROW_HEIGHT));
}

function clampPage(page, totalPages) {
  return Math.min(Math.max(Number(page) || 1, 1), totalPages);
}

function paginationHtml({ currentPage, totalPages, totalRows, startRow, endRow }) {
  if (totalPages <= 1) return '';

  return `
    <div class="data-table-pagination" aria-label="Paginacion de tabla">
      <span class="data-table-page-info">${startRow}-${endRow} de ${totalRows}</span>
      <div class="data-table-page-actions">
        <button type="button" class="btn btn-ghost btn-sm" data-table-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
        <span class="data-table-page-current">${currentPage} / ${totalPages}</span>
        <button type="button" class="btn btn-ghost btn-sm" data-table-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
      </div>
    </div>
  `;
}

export function dataTableHtml({ columns, rows, actions, pagination = {} }) {
  const colCount = columns.length + (actions ? 1 : 0);
  const paginationEnabled = pagination.enabled !== false;
  const pageSize = paginationEnabled ? pagination.pageSize ?? getAutoPageSize() : rows.length || 1;
  const totalPages = Math.max(Math.ceil(rows.length / pageSize), 1);
  const currentPage = paginationEnabled ? clampPage(pagination.page, totalPages) : 1;
  const startIndex = paginationEnabled ? (currentPage - 1) * pageSize : 0;
  const visibleRows = paginationEnabled ? rows.slice(startIndex, startIndex + pageSize) : rows;
  const startRow = rows.length === 0 ? 0 : startIndex + 1;
  const endRow = Math.min(startIndex + visibleRows.length, rows.length);

  return `
    <div class="data-table-shell" data-current-page="${currentPage}">
      <div class="data-table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              ${columns.map((c) => `<th>${c.label}</th>`).join('')}
              ${actions ? '<th>Acciones</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${
              rows.length === 0
                ? `<tr><td colspan="${colCount}" class="empty-row">Sin datos todavia</td></tr>`
                : visibleRows
                    .map(
                      (row) => `
                  <tr data-id="${row.id ?? ''}">
                    ${columns
                      .map((c) => `<td>${c.render ? c.render(row) : row[c.key] ?? ''}</td>`)
                      .join('')}
                    ${actions ? `<td class="actions-cell">${actions(row)}</td>` : ''}
                  </tr>`
                    )
                    .join('')
            }
          </tbody>
        </table>
      </div>
      ${paginationEnabled ? paginationHtml({ currentPage, totalPages, totalRows: rows.length, startRow, endRow }) : ''}
    </div>
  `;
}

export function bindDataTablePagination(container, onPageChange) {
  container.querySelectorAll('[data-table-page]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      onPageChange(Number(button.dataset.tablePage));
    });
  });
}