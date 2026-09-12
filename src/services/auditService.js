// ============================================================
// Servicio: Auditoría
// Lee las 2 bitácoras de auditoría (movimientos y artículos/stock).
// Solo accesible para admin — reforzado también a nivel de RLS.
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

/**
 * Historial de cambios de estado de movimientos (Pendiente/Aprobado/Rechazado).
 */
export async function listMovementAuditLog() {
  const { data, error } = await supabaseClient
    .from('movement_audit_log')
    .select(`
      id, previous_status, new_status, changed_at, notes,
      inventory_movements ( id, movement_type, quantity, inventory_items ( sku, name ) ),
      profiles:changed_by ( full_name )
    `)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Historial de creación/edición/eliminación de artículos e
 * información de stock (inventory_items + inventory, distinguidos
 * por la columna table_name).
 */
export async function listItemAuditLog() {
  const { data, error } = await supabaseClient
    .from('item_audit_log')
    .select(`
      id, table_name, action, sku, name, changed_at, changes,
      profiles:changed_by ( full_name )
    `)
    .order('changed_at', { ascending: false });
  if (error) throw error;
  return data;
}