// ============================================================
// Servicio: Artículos (inventory_items)
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

export async function listItems() {
  const { data, error } = await supabaseClient
    .from('inventory_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createItem(item) {
  const { data, error } = await supabaseClient
    .from('inventory_items')
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItem(id, changes) {
  const { data, error } = await supabaseClient
    .from('inventory_items')
    .update(changes)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(id) {
  const { error } = await supabaseClient.from('inventory_items').delete().eq('id', id);
  if (error) throw error;
}