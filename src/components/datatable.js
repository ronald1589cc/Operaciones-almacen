// ============================================================
// Componente: DataTable
// Tabla generica reutilizable: recibe columnas, filas, y una
// funcion opcional para renderizar la celda de "Acciones".
// ============================================================

const DEFAULT_ROW_HEIGHT = 52;
const RESERVED_VERTICAL_SPACE = 330;
const MIN_PAGE_SIZE = 5;

/**
 * Calcula automáticamente la cantidad de filas a mostrar por página 
 * según el tamaño vertical disponible en la ventana del navegador.
 */
function getAutoPageSize() {
  if (typeof window === 'undefined') return 8;

  const availableHeight = window.innerHeight - RESERVED_VERTICAL_SPACE;
  return Math.max(MIN_PAGE_SIZE, Math.floor(availableHeight / DEFAULT_ROW_HEIGHT));
}

/**
 * Asegura que el número de página solicitado no sea menor a 1 
 * ni mayor al total de páginas existentes.
 */
function clampPage(page, totalPages) {
  return Math.min(Math.max(Number(page) || 1, 1), totalPages);
}

/**
 * Construye la lista de números de página y puntos suspensivos (...) 
 * para mostrar una barra de navegación limpia cuando hay muchas páginas.
 */
function getPaginationRange(currentPage, totalPages, delta = 1) {
  const range = [];
  const rangeWithDots = [];
  let last;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || 
      i === totalPages || 
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      range.push(i);
    }
  }

  for (let i of range) {
    if (last) {
      if (i - last === 2) {
        rangeWithDots.push(last + 1);
      } else if (i - last !== 1) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    last = i;
  }

  return rangeWithDots;
}

/**
 * Genera el código HTML para los botones de la barra de paginación 
 * (anterior, números de página y siguiente).
 */
function paginationHtml({ currentPage, totalPages, totalRows, startRow, endRow }) {
  if (totalPages <= 1) return '';

  const pageRange = getPaginationRange(currentPage, totalPages);

  const pagesButtonsHtml = pageRange
    .map((page) => {
      if (page === '...') {
        return `<span class="data-table-page-ellipsis">...</span>`;
      }

      const isActive = page === currentPage;
      return `
        <button 
          type="button" 
          class="btn btn-ghost btn-sm ${isActive ? 'active' : ''}" 
          data-table-page="${page}" 
          ${isActive ? 'disabled' : ''}
        >
          ${page}
        </button>
      `;
    })
    .join('');

  return `
    <div class="data-table-pagination" aria-label="Paginacion de tabla">
      <span class="data-table-page-info">${startRow}-${endRow} de ${totalRows}</span>
      <div class="data-table-page-actions">
        <button 
          type="button" 
          class="btn btn-ghost btn-sm" 
          data-table-page="${currentPage - 1}" 
          ${currentPage === 1 ? 'disabled' : ''}
        >
          Anterior
        </button>
        
        <div class="data-table-page-numbers">
          ${pagesButtonsHtml}
        </div>

        <button 
          type="button" 
          class="btn btn-ghost btn-sm" 
          data-table-page="${currentPage + 1}" 
          ${currentPage === totalPages ? 'disabled' : ''}
        >
          Siguiente
        </button>
      </div>
    </div>
  `;
}

/**
 * Función principal que recibe la información (columnas, filas, acciones) 
 * y arma la estructura HTML completa de la tabla y su paginación.
 */
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

/**
 * Activa los eventos de clic en los botones de la paginación para 
 * avisarle a la aplicación que debe cambiar a otra página.
 */
export function bindDataTablePagination(container, onPageChange) {
  container.querySelectorAll('[data-table-page]').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.disabled) return;
      onPageChange(Number(button.dataset.tablePage));
    });
  });
}

/**
 * Escucha el cambio de tamaño de la ventana para recalcular las filas 
 * que caben en la pantalla sin saturar la computadora mientras se redimensiona.
 */
export function bindDataTableResize(renderCallback) {
  if (typeof window === 'undefined') return;

  let timeout;
  window.addEventListener('resize', () => {
    clearTimeout(timeout);
    // Debounce de 150ms para evitar re-renderizar decenas de veces mientras se arrastra la ventana
    timeout = setTimeout(() => {
      renderCallback();
    }, 150);
  });
}