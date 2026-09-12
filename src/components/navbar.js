// ============================================================
// Componente: Navbar (Barra Superior)
// Contiene la marca, el perfil de usuario y el cierre de sesión.
// ============================================================

import { getCurrentSession, getUserProfile, signOut } from '../services/authService.js';
import { showToast } from './toast.js';

export function renderNavbar(container, onNavigate) {
  container.innerHTML = `
    <div class="navbar-left">
      <button id="mobile-menu-toggle" class="btn-icon-mobile" aria-label="Abrir menú">
        <i data-lucide="Menu"></i>
      </button>
      <div class="sidebar-brand">
        <div class="sidebar-brand-title">Almacén Control</div>
        <div class="sidebar-brand-subtitle">INBOUND / OUTBOUND</div>
      </div>
    </div>

    <div class="navbar-actions">
      <div class="user-dropdown-container">
        <div id="sidebar-user" class="sidebar-user" role="button" tabindex="0"></div>

        <div id="user-menu" class="user-dropdown-menu">
          <button id="logout-btn" class="btn btn-ghost btn-sm btn-logout" title="Cerrar sesión">
            <span class="btn-icon"><i data-lucide="LogOut"></i></span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Control del menú responsivo
  const menuToggleBtn = container.querySelector('#mobile-menu-toggle');
  
  menuToggleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('#sidebar-overlay');
    
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('show');
  });

  // Delegación de eventos para la interacción en la Navbar
  container.addEventListener('click', async (e) => {
    const userCard = e.target.closest('#sidebar-user');
    const logoutBtn = e.target.closest('#logout-btn');
    const dropdownMenu = container.querySelector('#user-menu');

    if (userCard && dropdownMenu) {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
      return;
    }

    if (logoutBtn) {
      try {
        await signOut();
        showToast('Sesión cerrada correctamente', 'ok');
        onNavigate('login');
      } catch (err) {
        showToast(err.message || 'Error al cerrar sesión', 'error');
      }
      return;
    }

    if (dropdownMenu && !e.target.closest('.user-dropdown-container')) {
      dropdownMenu.classList.remove('show');
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.top-navbar')) {
      const dropdownMenu = container.querySelector('#user-menu');
      if (dropdownMenu) dropdownMenu.classList.remove('show');
    }
  });

  refreshNavbarUser(container);
  document.addEventListener('route-changed', () => {
    refreshNavbarUser(container);
  });
}

async function refreshNavbarUser(container) {
  const userBox = container.querySelector('#sidebar-user');
  if (!userBox) return;
  if (userBox.querySelector('.user-card')) return;

  const session = await getCurrentSession();
  if (!session) {
    userBox.innerHTML = '';
    return;
  }

  const profile = await getUserProfile(session.user.id);
  const isAdmin = profile?.role === 'admin';
  const fullName = profile?.full_name || session.user.email?.split('@')[0] || 'Operario';
  const role = isAdmin ? 'ADMIN' : 'OPERADOR';
  const roleBadgeClass = isAdmin ? 'role-admin' : 'role-operator';

  userBox.innerHTML = `
    <div class="user-card">
      <div class="user-avatar"><i data-lucide="User"></i></div>
      <div class="user-details">
        <div class="user-name" title="${fullName}">${fullName}</div>
        <span class="user-badge ${roleBadgeClass}">${role}</span>
      </div>
    </div>
  `;

  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}