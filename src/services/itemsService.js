// ============================================================
// Servicio: Artículos (inventory_items)
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

/**
 * Obtiene el listado completo de artículos registrados en el catálogo.
 * Realiza una consulta sobre la tabla inventory_items ordenando los registros
 * por la fecha de creación de forma descendente.
 */
export async function listItems() {
  const { data, error } = await supabaseClient
    .from('inventory_items')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Registra un nuevo artículo en el catálogo de inventario.
 * Recibe el objeto con los datos del artículo, lo inserta en la base de datos
 * y retorna el registro recién creado.
 */
export async function createItem(item) {
  const { data, error } = await supabaseClient
    .from('inventory_items')
    .insert(item)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Actualiza la información de un artículo existente según su identificador único.
 * Aplica los cambios recibidos por parámetro sobre el registro correspondiente
 * y retorna el objeto actualizado.
 */
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

/* export async function deleteItem(id) {
  const { error } = await supabaseClient.from('inventory_items').delete().eq('id', id);
  if (error) throw error;
} */

/**
 * Realiza el borrado lógico de un artículo desactivando su estado.
 * Modifica el campo is_active a false para ocultarlo de la lista activa
 * sin eliminar físicamente su registro en la base de datos.
 */
  export async function deactivateItem(id) {
  const { data, error } = await supabaseClient
    .from('inventory_items')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
 
/**
 * Reactiva un artículo desactivado previamente.
 * Establece la propiedad is_active en true para habilitar nuevamente el artículo
 * en la gestión activa del catálogo.
 */
export async function reactivateItem(id) {
  const { data, error } = await supabaseClient
    .from('inventory_items')
    .update({ is_active: true })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}