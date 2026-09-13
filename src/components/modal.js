// ============================================================
// Componente: Modal
// Ventana superpuesta reutilizable, usada por los formularios
// de crear/editar artículo, editar stock y crear movimiento.
// ============================================================

let modalRoot = null;

/**
 * Función que define y guarda el contenedor principal HTML 
 * dentro del cual se dibujará la ventana modal.
 */
export function initModal(root) {
  modalRoot = root;
}

/**
 * Función que abre la ventana modal con el contenido recibido, 
 * agregando eventos para cerrarla al dar clic afuera o en botones de cierre.
 */
export function openModal(innerHtml) {
  modalRoot.innerHTML = `
    <div class="modal-overlay" id="modal-overlay">
      <div class="modal-box">${innerHtml}</div>
    </div>
  `;

  modalRoot.querySelector('#modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  modalRoot.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', closeModal);
  });
}

/**
 * Función que cierra y remueve completamente el modal 
 * limpiando el contenido del contenedor principal.
 */
export function closeModal() {
  if (modalRoot) modalRoot.innerHTML = '';
}