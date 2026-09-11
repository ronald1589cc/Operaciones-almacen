// ============================================================
// Servicio: Inventario (stock actual)
// Relación 1:1 con inventory_items, por eso las lecturas
// vienen unidas ("joined") para mostrar SKU/nombre junto al stock.
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

export async function listInventoryWithItems() {
  const { data, error } = await supabaseClient
    .from('inventory')
    .select('*, inventory_items(*)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createInventoryRecord(record) {
  const { data, error } = await supabaseClient
    .from('inventory')
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInventoryRecord(id, changes) {
  const { data, error } = await supabaseClient
    .from('inventory')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}