// ============================================================
// utils/icons.js — importar iconos de luciode icons
// ============================================================

import { 
  createIcons, 
  Menu,
  User,
  LogOut,
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  MapPin,
  History,
  FileClock,
  Trash
} from 'lucide';

// Asocia directamente los nombres tal como están en el atributo data-lucide
const icons = {
  Menu,
  User,
  LogOut,
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  MapPin,
  History,
  FileClock,
  Trash,
  // Versiones en kebab-case por compatibilidad si las usas en otra vista
  'menu': Menu,
  'user': User,
  'log-out': LogOut,
  'layout-dashboard': LayoutDashboard,
  'boxes': Boxes,
  'arrow-left-right': ArrowLeftRight,
  'map-pin': MapPin,
  'history': History,
  'file-clock': FileClock,
  'trash': Trash
};

let timeoutId = null;

/**
 * Inicializa el renderizado automático de iconos Lucide en la aplicación.
 * Renderiza los iconos presentes en el DOM y configura un MutationObserver para
 * detectar dinámicamente nuevos elementos inyectados y re-procesar los iconos con debouncing.
 */
export function initAutoIcons() {
  const render = () => {
    createIcons({ icons });
  };

  render();

  const observer = new MutationObserver((mutations) => {
    const hasNewNodes = mutations.some((m) => m.addedNodes.length > 0);
    
    if (hasNewNodes) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        render();
      }, 50);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}