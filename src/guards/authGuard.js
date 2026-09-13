// ============================================================
// authGuard.js — Guardián de Navegación y Control de Acceso
// Intercepta las rutas antes de renderizar para verificar sesión y roles.
// ============================================================

import { getCurrentSession, getUserProfile } from '../services/authService.js';

/**
 * Evalúa si el usuario tiene permiso para acceder a una ruta.
 * @param {string} routeName - Nombre de la ruta solicitada
 * @param {Object} [routeMeta={}] - Metadatos de la ruta (requiresAuth, isAuthPage, requiredRole)
 * @returns {Promise<{ allowed: boolean, redirectTo?: string, reason?: string }>}
 */

/**
 * Revisa si el usuario puede entrar a una página: lo manda al login si no 
 * ha iniciado sesión, al dashboard si ya inició sesión e intenta ir al login, 
 * o lo bloquea si no tiene el rol de administrador requerido.
 */
export async function canActivate(routeName, routeMeta = {}) {
  const session = await getCurrentSession();

  // 1. Ruta protegida sin sesión activa -> Enviar al login
  if (routeMeta.requiresAuth && !session) {
    return { allowed: false, redirectTo: 'login' };
  }

  // 2. Usuario ya autenticado intentando entrar a login o register -> Enviar al dashboard
  if (session && routeMeta.isAuthPage) {
    return { allowed: false, redirectTo: 'dashboard' };
  }

  // 3. Validación de rol requerido (ej. 'admin')
  if (routeMeta.requiredRole && session) {
    const profile = await getUserProfile(session.user.id);
    if (profile?.role !== routeMeta.requiredRole) {
      return { allowed: false, redirectTo: 'dashboard', reason: 'unauthorized' };
    }
  }

  return { allowed: true };
}