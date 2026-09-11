// ============================================================
// Router — cambia de sección sin recargar la página (SPA).
// Incluye soporte para metadatos de ruta y consulta al AuthGuard.
// ============================================================

import { canActivate } from './guards/authGuard.js';

const routes = {};
let contentEl = null;
let currentRouteName = null;

/**
 * Registra una ruta con su función de renderizado y metadatos opcionales.
 * @param {string} name - Identificador de la ruta
 * @param {Function} renderFn - Función asíncrona que pinta la vista
 * @param {Object} [meta={}] - Metadatos (requiresAuth, isAuthPage, requiredRole, etc.)
 */
export function registerRoute(name, renderFn, meta = {}) {
  routes[name] = { renderFn, meta };
}

/**
 * Inicializa el contenedor principal de la vista.
 * @param {HTMLElement} container
 */
export function initRouter(container) {
  contentEl = container;
}

/**
 * Retorna el nombre de la ruta activa actual.
 */
export function getCurrentRoute() {
  return currentRouteName;
}

/**
 * Navega a una ruta evaluando primero el AuthGuard.
 * @param {string} name - Nombre de la ruta destino
 */
export async function navigateTo(name) {
  const route = routes[name];
  if (!route) {
    console.warn(`Ruta desconocida: ${name}`);
    return;
  }

  // Interceptar con AuthGuard
  const guard = await canActivate(name, route.meta);
  if (!guard.allowed) {
    return navigateTo(guard.redirectTo || 'login');
  }

  currentRouteName = name;

  // Ajustar apariencia del app-shell si es página de autenticación (ocultar sidebar y centrar tarjeta)
  const appShell = document.getElementById('app-shell') || document.querySelector('.app-shell');
  if (appShell) {
    appShell.classList.toggle('auth-mode', Boolean(route.meta.isAuthPage));
  }

  contentEl.innerHTML = '<div class="loading-state">Cargando…</div>';

  try {
    await route.renderFn(contentEl);
  } catch (err) {
    contentEl.innerHTML = `<div class="error-detail">${err.message}</div>`;
  }

  document.dispatchEvent(new CustomEvent('route-changed', {
    detail: { name, meta: route.meta }
  }));
}