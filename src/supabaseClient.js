// ============================================================
// Conexión a Supabase (módulo ES)
// Proyecto: OPERACIÓN DE ALMACÉN: INBOUND Y OUTBOUND
//
// Las credenciales vienen de variables de entorno de Vite
// (definidas en .env, ver .env.example), no quedan hardcodeadas
// en el código fuente.
// ============================================================

/**
 * Valida la existencia de las variables de entorno necesarias para la conexión.
 * Si no están definidas, interrumpe la ejecución mediante una excepción explicativa.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
  );
}

/**
 * Inicializa y exporta la instancia principal del cliente de Supabase.
 * Configura la persistencia de sesión, la renovación automática del token JWT
 * y la detección de tokens de autenticación en la URL.
 */
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});