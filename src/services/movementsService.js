// ============================================================
// Servicio: Movimientos
// Crear movimientos (siempre nacen en "Pendiente") y ejecutar
// aprobación/rechazo llamando a las funciones RPC de Supabase
// (approve_movement / reject_movement) creadas en el paso 2.
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

export async function listMovements() {
  const { data, error } = await supabaseClient
    .from('inventory_movements')
    .select('*, inventory_items(sku, name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

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

export async function approveMovement(movementId) {
  const { error } = await supabaseClient.rpc('approve_movement', { p_movement_id: movementId });
  if (error) throw error;
}

export async function rejectMovement(movementId) {
  const { error } = await supabaseClient.rpc('reject_movement', { p_movement_id: movementId });
  if (error) throw error;
}