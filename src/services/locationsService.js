// ============================================================
// Servicio: Ubicaciones del almacén (warehouse_locations)
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

/**
 * Obtiene el listado completo de las ubicaciones físicas del almacén.
 * Consulta la tabla warehouse_locations ordenando los registros
 * de manera ascendente según su código identificador.
 */
export async function listLocations() {
  const { data, error } = await supabaseClient
    .from('warehouse_locations')
    .select('*')
    .order('code');
  if (error) throw error;
  return data;
}

/**
 * Registra una nueva ubicación física dentro del almacén.
 * Inserta los datos suministrados en la tabla warehouse_locations
 * y devuelve el objeto recién creado.
 */
export async function createLocation(location) {
  const { data, error } = await supabaseClient
    .from('warehouse_locations')
    .insert(location)
    .select()
    .single();
  if (error) throw error;
  return data;
}