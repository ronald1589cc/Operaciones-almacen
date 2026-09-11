// ============================================================
// Servicio: Dashboard
// Calcula las métricas principales (KPIs) a partir de los datos
// reales de inventory + inventory_movements.
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

export async function getDashboardStats() {
  const { data: inventoryRows, error: invError } = await supabaseClient
    .from('inventory')
    .select('quantity, min_stock, inventory_items(price)');
  if (invError) throw invError;

  const totalItems = inventoryRows.length;
  const totalStock = inventoryRows.reduce((sum, r) => sum + (r.quantity ?? 0), 0);
  const belowMin = inventoryRows.filter((r) => r.quantity < r.min_stock).length;
  const totalValue = inventoryRows.reduce(
    (sum, r) => sum + (r.quantity ?? 0) * (r.inventory_items?.price ?? 0),
    0
  );

  const { data: recentMovements, error: movError } = await supabaseClient
    .from('inventory_movements')
    .select('id, movement_type, quantity, status, created_at, inventory_items(sku, name)')
    .order('created_at', { ascending: false })
    .limit(5);
  if (movError) throw movError;

  return { totalItems, totalStock, belowMin, totalValue, recentMovements };
}