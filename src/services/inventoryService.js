// ============================================================
// Servicio: Inventario (stock actual)
// Relación 1:1 con inventory_items, por eso las lecturas
// vienen unidas ("joined") para mostrar SKU/nombre junto al stock.
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

/**
 * Obtiene el listado completo de existencias en el inventario.
 * Realiza un join con la tabla inventory_items para incluir todos los datos del artículo
 * asociado (SKU, nombre, etc.) y los ordena de forma descendente por la última actualización.
 */
export async function listInventoryWithItems() {
  const { data, error } = await supabaseClient
    .from('inventory')
    .select('*, inventory_items(*)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Inserta un nuevo registro de existencias de inventario en la base de datos.
 * Recibe los datos del registro a crear y retorna el objeto insertado.
 */
export async function createInventoryRecord(record) {
  const { data, error } = await supabaseClient
    .from('inventory')
    .insert(record)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Actualiza los campos de un registro de inventario existente según su ID.
 * Agrega automáticamente la fecha/hora actual en updated_at y retorna el registro modificado.
 */
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