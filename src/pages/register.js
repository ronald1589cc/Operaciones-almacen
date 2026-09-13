// ============================================================
// Página: Registro de Usuario (register.js)
// Formulario para crear una nueva cuenta en el sistema.
// ============================================================

import { signUp } from '../services/authService.js';
import { buttonHtml } from '../components/button.js';
import { showToast } from '../components/toast.js';
import { navigateTo } from '../router.js';

/**
 * Monta e inicializa la vista del formulario de Registro de Usuario.
 * Renderiza el HTML de la interfaz en el contenedor suministrado y
 * gestiona la navegación al login y el envío de datos para crear la cuenta.
 */
export function renderRegister(container) {
  container.innerHTML = `
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo">👟</div>
        <h2 class="auth-title">Almacén Control</h2>
        <div class="auth-subtitle">Crear Cuenta</div>
      </div>

      <form id="register-form" class="form auth-form">
        <label>
          Nombre Completo
          <input 
            type="text" 
            name="fullName" 
            class="input" 
            placeholder="Ej. Juan Pérez" 
            required 
            autocomplete="name"
          />
        </label>

        <label>
          Correo Electrónico
          <input 
            type="email" 
            name="email" 
            class="input" 
            placeholder="operario@empresa.com" 
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
            placeholder="Mínimo 6 caracteres" 
            required 
            minlength="6"
            autocomplete="new-password"
          />
        </label>

        <label>
          Confirmar Contraseña
          <input 
            type="password" 
            name="confirmPassword" 
            class="input" 
            placeholder="Repite tu contraseña" 
            required 
            minlength="6"
            autocomplete="new-password"
          />
        </label>

        <div class="auth-actions">
          ${buttonHtml('Registrar Cuenta', { type: 'submit', variant: 'primary', className: 'btn-block' })}
        </div>
      </form>

      <div class="auth-footer">
        <span>¿Ya tienes una cuenta registrada?</span>
        <button type="button" id="go-to-login" class="btn-link">Iniciar sesión</button>
      </div>
    </div>
  `;

  // Navegación hacia el login
  container.querySelector('#go-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    navigateTo('login');
  });

  // Envío del formulario
  const form = container.querySelector('#register-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    const formData = Object.fromEntries(new FormData(form));
    const fullName = formData.fullName.trim();
    const email = formData.email.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    // Validación de seguridad básica en cliente
    if (password !== confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creando cuenta…';

      const data = await signUp({ email, password, fullName });

      if (data?.session) {
        showToast('¡Cuenta creada e iniciada con éxito!', 'ok');
        navigateTo('dashboard');
      } else {
        showToast('Cuenta creada con éxito. Ya puedes iniciar sesión.', 'ok');
        navigateTo('login');
      }
    } catch (err) {
      showToast(err.message || 'Error al registrar usuario', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}