// ============================================================
// authService.js — Servicio de Autenticación con Supabase
// Gestiona registro, inicio de sesión, cierre de sesión y perfiles.
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

/**
 * Inicia sesión con correo y contraseña.
 * @param {{ email: string, password: string }}
 */
export async function signIn({ email, password }) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Registra un nuevo usuario en Supabase Auth.
 * La fila en 'profiles' se crea automáticamente mediante el trigger
 * 'on_auth_user_created' definido en el schema.sql (handle_new_user).
 * @param {{ email: string, password: string, fullName: string }}
 */
export async function signUp({ email, password, fullName }) {
  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        // Supabase guarda este valor en auth.users.raw_user_meta_data
        // El trigger handle_new_user lo lee para poblar profiles.full_name
        full_name: fullName,
      },
    },
  });

  if (error) throw error;
  return data;
}

/**
 * Cierra la sesión activa actual.
 */
export async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
}

/**
 * Obtiene la sesión actual desde Supabase.
 * @returns {Promise<import('@supabase/supabase-js').Session | null>}
 */
export async function getCurrentSession() {
  const { data: { session }, error } = await supabaseClient.auth.getSession();
  if (error) return null;
  return session;
}

/**
 * Obtiene el perfil de negocio del usuario (nombre y rol admin/operator).
 * @param {string} userId
 * @returns {Promise<{ id: string, full_name: string, role: 'admin'|'operator' } | null>}
 */
export async function getUserProfile(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .single();

    if (error) {
      // Fallback si no existe fila en profiles
      return { id: userId, full_name: 'Usuario', role: 'operator' };
    }
    return data;
  } catch (err) {
    return { id: userId, full_name: 'Usuario', role: 'operator' };
  }
}

/**
 * Suscribe un callback a los cambios de estado de autenticación.
 * @param {(event: string, session: any) => void} callback
 */
export function onAuthStateChange(callback) {
  return supabaseClient.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}