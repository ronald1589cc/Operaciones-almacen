// ============================================================
// main.js — punto de entrada de la app (módulo ES)
// Conecta: router + sidebar + modal + toast, y registra
// las rutas públicas (login/registro) y protegidas de la SPA.
// ============================================================

import './style.css';
import { initTheme } from './theme.js';
import { initRouter, registerRoute, navigateTo } from './router.js';
import { renderSidebar } from './components/sidebar.js';
import { initModal } from './components/modal.js';
import { initToast } from './components/toast.js';
import { initAutoIcons } from './utils/icons.js';
import { renderNavbar } from './components/navbar.js';

// Inicializar el tema (oscuro por defecto o guardado)
initTheme();

// Inicializar la detección automática de íconos al arrancar la aplicación
initAutoIcons();

// Inicializar la barra superior
renderNavbar(document.getElementById('navbar'), navigateTo);

// Importar páginas públicas de autenticación
import { renderLogin } from './pages/login.js';
import { renderRegister } from './pages/register.js';

// Importar páginas operativas de la aplicación
import { renderDashboard } from './pages/dashboard.js';
import { renderInventory } from './pages/inventory.js';
import { renderMovements } from './pages/movements.js';
import { renderLocations } from './pages/locations.js';

// Importar páginas de auditoría (solo admin)
import { renderMovementsAudit } from './pages/movementsAudit.js';
import { renderItemsAudit } from './pages/itemsAudit.js';

// Inicializar contenedores compartidos (modal y toast)
initModal(document.getElementById('modal-root'));
initToast(document.getElementById('toast-root'));

// Inicializar el router sobre el contenedor principal
initRouter(document.getElementById('content'));

// Registrar rutas públicas de autenticación
registerRoute('login', renderLogin, { isAuthPage: true });
registerRoute('register', renderRegister, { isAuthPage: true });

// Registrar rutas protegidas del almacén
registerRoute('dashboard', renderDashboard, { requiresAuth: true });
registerRoute('inventory', renderInventory, { requiresAuth: true });
registerRoute('movements', renderMovements, { requiresAuth: true });
registerRoute('locations', renderLocations, { requiresAuth: true });

// Registrar rutas de auditoría — requieren sesión Y rol admin
registerRoute('movementsAudit', renderMovementsAudit, { requiresAuth: true, requiredRole: 'admin' });
registerRoute('itemsAudit', renderItemsAudit, { requiresAuth: true, requiredRole: 'admin' });

// Sidebar: navegación entre secciones
renderSidebar(document.getElementById('sidebar'), navigateTo);

// Arrancar en dashboard (el AuthGuard enviará a 'login' si no hay sesión activa)
navigateTo('dashboard');