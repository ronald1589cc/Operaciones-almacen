// ============================================================
// Conexión a Supabase (módulo ES)
// Proyecto: OPERACIÓN DE ALMACÉN: INBOUND Y OUTBOUND
//
// Las credenciales vienen de variables de entorno de Vite
// (definidas en .env, ver .env.example), no quedan hardcodeadas
// en el código fuente.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan las variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);