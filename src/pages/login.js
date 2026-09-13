// ============================================================
// Página: Iniciar Sesión (login.js)
// Formulario de autenticación para usuarios registrados.
// ============================================================

import { signIn } from '../services/authService.js';
import { buttonHtml } from '../components/button.js';
import { showToast } from '../components/toast.js';
import { navigateTo } from '../router.js';

/**
 * Inicializa y renderiza la vista del formulario de Inicio de Sesión.
 * Inyecta el marcado del Login en el contenedor indicado y maneja
 * los eventos de navegación a registro y autenticación de credenciales.
 */
export function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">👟</div>
        <h2 class="auth-title">Almacén Control</h2>
        <div class="auth-subtitle">Iniciar Sesión</div>
      </div>

      <form id="login-form" class="form auth-form">
        <label>
          Correo Electrónico
          <input 
            type="email" 
            name="email" 
            class="input" 
            placeholder="usuario@empresa.com" 
            required 
            autocomplete="email"
          />
        </label>

        <label>
          Contraseña
          <input 
            type="password" 
            name="password" 
            class="input" 
            placeholder="••••••••" 
            required 
            autocomplete="current-password"
          />
        </label>

        <div class="auth-actions">
          ${buttonHtml('Ingresar al Sistema', { type: 'submit', variant: 'primary', className: 'btn-block' })}
        </div>
      </form>

      <div class="auth-footer">
        <span>¿No tienes una cuenta de operador?</span>
        <button type="button" id="go-to-register" class="btn-link">Crear cuenta nueva</button>
      </div>
    </div>
  `;

  // Navegación hacia el registro
  container.querySelector('#go-to-register').addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('register');
  });

  // Envío del formulario
  const form = container.querySelector('#login-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    const formData = Object.fromEntries(new FormData(form));
    const email = formData.email.trim();
    const password = formData.password;

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Verificando…';

      await signIn({ email, password });
      showToast('Sesión iniciada correctamente', 'ok');
      navigateTo('dashboard');
    } catch (err) {
      showToast(err.message || 'Credenciales inválidas', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}