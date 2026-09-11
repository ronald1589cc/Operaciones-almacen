// ============================================================
// Componente: Modal
// Ventana superpuesta reutilizable, usada por los formularios
// de crear/editar artículo, editar stock y crear movimiento.
// ============================================================

let modalRoot = null;

export function initModal(root) {
  modalRoot = root;
}

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

export function closeModal() {
  if (modalRoot) modalRoot.innerHTML = '';
}