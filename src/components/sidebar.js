// ============================================================
// Componente: Sidebar
// Menú de navegación lateral con perfil de usuario y control de tema.
// ============================================================

import { toggleTheme } from '../theme.js';
import { getCurrentSession, getUserProfile, signOut } from '../services/authService.js';
import { showToast } from './toast.js';

const SECTIONS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'inventory', label: 'Inventario' },
  { id: 'movements', label: 'Movimientos' },
  { id: 'locations', label: 'Almacén' },
];

export function renderSidebar(container, onNavigate) {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  container.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-brand-title">Almacén Control</div>
      <div class="sidebar-brand-subtitle">INBOUND / OUTBOUND</div>
    </div>
    <nav class="sidebar-nav">
      ${SECTIONS.map(
        (s) => `<button class="sidebar-link" data-route="${s.id}">${s.label}</button>`
      ).join('')}
    </nav>
    <div class="sidebar-footer">
      <div id="sidebar-user" class="sidebar-user"></div>

      <button id="theme-toggle" class="theme-toggle-btn" aria-label="Cambiar tema">
        <span class="theme-icon">${isLight ? '☀️' : '🌙'}</span>
        <span class="theme-label">${isLight ? 'Modo Claro' : 'Modo Oscuro'}</span>
      </button>

      <button id="logout-btn" class="btn btn-ghost btn-sm btn-logout" title="Cerrar sesión">
        <span class="btn-icon">🚪</span>
        <span>Cerrar sesión</span>
      </button>
    </div>
  `;

  // Navegación en enlaces del sidebar
  container.querySelectorAll('.sidebar-link').forEach((btn) => {
    btn.addEventListener('click', () => onNavigate(btn.dataset.route));
  });

  // Marcar enlace activo y actualizar datos de usuario al cambiar de ruta
  document.addEventListener('route-changed', (e) => {
    container.querySelectorAll('.sidebar-link').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.route === e.detail.name);
    });
    refreshSidebarUser(container);
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

  // Botón de Cerrar Sesión
  const logoutBtn = container.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut();
        showToast('Sesión cerrada correctamente', 'ok');
        onNavigate('login');
      } catch (err) {
        showToast(err.message || 'Error al cerrar sesión', 'error');
      }
    });
  }

  // Carga inicial del perfil de usuario
  refreshSidebarUser(container);
}

async function refreshSidebarUser(container) {
  const userBox = container.querySelector('#sidebar-user');
  const logoutBtn = container.querySelector('#logout-btn');
  if (!userBox) return;

  const session = await getCurrentSession();
  if (!session) {
    userBox.innerHTML = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
    return;
  }

  if (logoutBtn) logoutBtn.style.display = 'flex';
  const profile = await getUserProfile(session.user.id);
  const fullName = profile?.full_name || session.user.email?.split('@')[0] || 'Operario';
  const role = profile?.role === 'admin' ? 'ADMIN' : 'OPERADOR';
  const roleBadgeClass = profile?.role === 'admin' ? 'role-admin' : 'role-operator';

  userBox.innerHTML = `
    <div class="user-card">
      <div class="user-avatar">👤</div>
      <div class="user-details">
        <div class="user-name" title="${fullName}">${fullName}</div>
        <span class="user-badge ${roleBadgeClass}">${role}</span>
      </div>
    </div>
  `;
}

function updateThemeButton(btn, theme) {
  const icon = btn.querySelector('.theme-icon');
  const label = btn.querySelector('.theme-label');
  const isLight = theme === 'light';
  if (icon) icon.textContent = isLight ? '☀️' : '🌙';
  if (label) label.textContent = isLight ? 'Modo Claro' : 'Modo Oscuro';
}