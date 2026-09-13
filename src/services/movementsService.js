// ============================================================
// Servicio: Movimientos
// Crear movimientos (siempre nacen en "Pendiente") y ejecutar
// aprobación/rechazo llamando a las funciones RPC de Supabase
// (approve_movement / reject_movement) creadas en el paso 2.
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

/**
 * Obtiene el listado completo de movimientos de inventario registrados.
 * Consulta la tabla inventory_movements realizando un join con inventory_items
 * para incluir el SKU y nombre del artículo, ordenados cronológicamente de forma descendente.
 */
export async function listMovements() {
  const { data, error } = await supabaseClient
    .from('inventory_movements')
    .select('*, inventory_items(sku, name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Registra un nuevo movimiento de inventario en estado inicial "Pendiente".
 * Crea el movimiento en la base de datos y, si se indica una ubicación y el tipo
 * de movimiento lo requiere (Entrada o Salida), crea la reserva correspondiente de la posición.
 */
export async function createMovement({ item_id, inventory_id, movement_type, quantity, reason, notes, location_id }) {
  const { data: movement, error } = await supabaseClient
    .from('inventory_movements')
    .insert({
      item_id,
      inventory_id,
      movement_type,
      quantity,
      reason,
      notes,
      status: 'Pendiente',
    })
    .select()
    .single();
  if (error) throw error;

  // Entrada -> reserva la posicion de llegada (INBOUND).
  // Salida -> reserva la posicion de origen para prepararla (OUTBOUND).
  // Ajuste -> no involucra un cambio de ubicacion, no se reserva nada.
  if (location_id && (movement_type === 'Entrada' || movement_type === 'Salida')) {
    const reservationType = movement_type === 'Entrada' ? 'INBOUND' : 'OUTBOUND';
    const { error: reservationError } = await supabaseClient.from('location_reservations').insert({
      location_id,
      movement_id: movement.id,
      reservation_type: reservationType,
      status: 'Reservado',
    });
    // No se revierte el movimiento si falla la reserva: se deja registrado
    // el error para que el usuario sepa que debe revisar la ubicación,
    // pero el movimiento sigue existiendo y puede aprobarse igual.
    if (reservationError) console.warn('No se pudo reservar la ubicación:', reservationError.message);
  }

  return movement;
}

/**
 * Aprueba un movimiento de inventario pendiente mediante un procedimiento almacenado RPC.
 * Ejecuta la función 'approve_movement' en Supabase para actualizar el estado del movimiento
 * y aplicar los cambios correspondientes en el stock de inventario.
 */
export async function approveMovement(movementId) {
  const { error } = await supabaseClient.rpc('approve_movement', { p_movement_id: movementId });
  if (error) throw error;
}

/**
 * Rechaza un movimiento de inventario pendiente mediante un procedimiento almacenado RPC.
 * Ejecuta la función 'reject_movement' en Supabase para denegar la solicitud del movimiento
 * y liberar las reservas de ubicación asociadas si las hubiera.
 */
export async function rejectMovement(movementId) {
  const { error } = await supabaseClient.rpc('reject_movement', { p_movement_id: movementId });
  if (error) throw error;
}