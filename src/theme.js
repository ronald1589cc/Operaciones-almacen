// ============================================================
// theme.js — Gestión de Tema (Modo Claro / Modo Oscuro)
// ============================================================

const STORAGE_KEY = 'almacen-theme';

/**
 * Obtiene el tema actual ('light' o 'dark').
 * Prioriza la selección guardada en localStorage, luego preferencia del sistema.
 */
export function getSavedTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark';
}

/**
 * Aplica el tema en el elemento raíz <html> y persiste en localStorage.
 * @param {'light' | 'dark'} theme
 */
export function setTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
}

/**
 * Alterna entre modo claro y oscuro.
 * @returns {'light' | 'dark'} el nuevo tema aplicado
 */
export function toggleTheme() {
  const isCurrentlyLight = document.documentElement.getAttribute('data-theme') === 'light';
  const newTheme = isCurrentlyLight ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}

/**
 * Inicializa el tema al cargar la aplicación.
 */
export function initTheme() {
  const current = getSavedTheme();
  setTheme(current);

  // Escuchar si el usuario cambia el tema en su sistema operativo
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      // Solo aplicar si el usuario no tiene una preferencia explícita guardada
      if (!localStorage.getItem(STORAGE_KEY)) {
        setTheme(e.matches ? 'light' : 'dark');
      }
    });
  }
}

