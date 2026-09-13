// ============================================================
// Componente: Sidebar
// Menú de navegación lateral con control de tema.
// ============================================================

import { toggleTheme } from '../theme.js';
import { getCurrentSession, getUserProfile } from '../services/authService.js';

// Configuración de las secciones del menú con sus iconos y permisos de administración.
const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'inventory', label: 'Inventario', icon: 'Boxes' },
  { id: 'movements', label: 'Movimientos', icon: 'ArrowLeftRight' },
  { id: 'locations', label: 'Almacén', icon: 'MapPin' },
  { id: 'movementsAudit', label: 'Auditoría de Movimientos', icon: 'History', adminOnly: true },
  { id: 'itemsAudit', label: 'Auditoría de Artículos', icon: 'FileClock', adminOnly: true },
];

/**
 * Renderiza los botones de navegación y el selector de tema dentro del Sidebar,
 * asignando los eventos para cambiar de vista, cerrar la barra en dispositivos móviles
 * y ocultar/mostrar secciones exclusivas para administradores.
 */
export function renderSidebar(container, onNavigate) {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  // Crear el fondo oscuro si aún no existe en el DOM
  if (!document.querySelector('#sidebar-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', closeMobileSidebar);
  }

  container.innerHTML = `
    <nav class="sidebar-nav">
      ${SECTIONS.map(
        (s) =>
          `<button class="sidebar-link" data-route="${s.id}" ${s.adminOnly ? 'data-admin-only' : ''}>
            <i data-lucide="${s.icon}"></i>${s.label}
          </button>`
      ).join('')}
    </nav>
    <div class="sidebar-footer">
      <button id="theme-toggle" class="theme-toggle-btn" aria-label="Cambiar tema">
        <span class="theme-icon">${isLight ? '☀️' : '🌙'}</span>
        <span class="theme-label">${isLight ? 'Modo Claro' : 'Modo Oscuro'}</span>
      </button>
    </div>
  `;

  // Navegación en enlaces del sidebar (cierra el menú en móvil tras hacer clic)
  container.querySelectorAll('.sidebar-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      onNavigate(btn.dataset.route);
      closeMobileSidebar();
    });
  });

  // Marcar enlace activo y verificar accesos admin
  document.addEventListener('route-changed', (e) => {
    container.querySelectorAll('.sidebar-link').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.route === e.detail.name);
    });
    updateAdminAccess(container);
  });

  // Botón de alternar tema claro / oscuro
  const toggleBtn = container.querySelector('#theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const newTheme = toggleTheme();
      updateThemeButton(toggleBtn, newTheme);
    });
  }

  window.addEventListener('theme-changed', (e) => {
    if (toggleBtn) {
      updateThemeButton(toggleBtn, e.detail.theme);
    }
  });

  updateAdminAccess(container);
}

/**
 * Oculta la barra lateral y su fondo oscuro en pantallas móviles.
 */
function closeMobileSidebar() {
  document.querySelector('.sidebar')?.classList.remove('open');
  document.querySelector('#sidebar-overlay')?.classList.remove('show');
}

/**
 * Consulta la sesión del usuario para mostrar u ocultar 
 * los enlaces marcados como exclusivos de administrador.
 */
async function updateAdminAccess(container) {
  const adminLinks = container.querySelectorAll('.sidebar-link[data-admin-only]');
  const session = await getCurrentSession();
  if (!session) {
    adminLinks.forEach((link) => (link.style.display = 'none'));
    return;
  }

  const profile = await getUserProfile(session.user.id);
  const isAdmin = profile?.role === 'admin';
  adminLinks.forEach((link) => (link.style.display = isAdmin ? '' : 'none'));
}

/**
 * Actualiza el texto y el icono del botón de cambio de tema.
 */
function updateThemeButton(btn, theme) {
  const icon = btn.querySelector('.theme-icon');
  const label = btn.querySelector('.theme-label');
  const isLight = theme === 'light';
  if (icon) icon.textContent = isLight ? '☀️' : '🌙';
  if (label) label.textContent = isLight ? 'Modo Claro' : 'Modo Oscuro';
}