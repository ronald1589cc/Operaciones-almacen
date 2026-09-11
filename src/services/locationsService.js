// ============================================================
// Servicio: Ubicaciones del almacén (warehouse_locations)
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

export async function listLocations() {
  const { data, error } = await supabaseClient
    .from('warehouse_locations')
    .select('*')
    .order('code');
  if (error) throw error;
  return data;
}

export async function createLocation(location) {
  const { data, error } = await supabaseClient
    .from('warehouse_locations')
    .insert(location)
    .select()
    .single();
  if (error) throw error;
  return data;
}