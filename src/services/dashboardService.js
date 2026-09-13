// ============================================================
// Servicio: Dashboard
// Calcula las métricas principales (KPIs) a partir de los datos
// reales de inventory + inventory_movements.
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

/**
 * Ejecuta peticiones a Supabase con reintentos automáticos.
 * Maneja fallos causados por desfasamiento en el reloj del cliente o
 * tokens expirados, reintentando la consulta tras una breve pausa.
 */
async function safeExecute(queryFn, retries = 2) {
  const result = await queryFn();

  if (result.error) {
    const isClockSkewError =
      result.error.status === 401 ||
      result.error.message?.toLowerCase().includes('future') ||
      result.error.message?.toLowerCase().includes('jwt');

    if (isClockSkewError && retries > 0) {
      // Espera 1.5 segundos a que la hora del servidor alcance al token
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return safeExecute(queryFn, retries - 1);
    }
    
    throw result.error;
  }

  return result.data;
}

/**
 * Obtiene y calcula los indicadores clave de rendimiento (KPIs) del almacén.
 * Consulta las tablas de inventario y movimientos recientes para obtener el total de
 * artículos, stock acumulado, unidades bajo el mínimo, valor monetario e historial reciente.
 */
export async function getDashboardStats() {
  // 1. Consulta de Inventario con reintento automático
  const inventoryRows = await safeExecute(() =>
    supabaseClient
      .from('inventory')
      .select('quantity, min_stock, inventory_items(price)')
  );

  const totalItems = inventoryRows.length;
  const totalStock = inventoryRows.reduce((sum, r) => sum + (r.quantity ?? 0), 0);
  const belowMin = inventoryRows.filter((r) => r.quantity < r.min_stock).length;
  const totalValue = inventoryRows.reduce(
    (sum, r) => sum + (r.quantity ?? 0) * (r.inventory_items?.price ?? 0),
    0
  );

  // 2. Consulta de Movimientos Recientes con reintento automático
  const recentMovements = await safeExecute(() =>
    supabaseClient
      .from('inventory_movements')
      .select('id, movement_type, quantity, status, created_at, inventory_items(sku, name)')
      .order('created_at', { ascending: false })
      .limit(5)
  );

  return { totalItems, totalStock, belowMin, totalValue, recentMovements };
}