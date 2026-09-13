// ============================================================
// Servicio: Catálogos de referencia (brands, categories, suppliers)
// Usados para poblar los <select> de filtros y formularios.
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

/**
 * Función auxiliar genérica para consultar cualquier tabla de catálogo en Supabase.
 * Realiza una consulta `SELECT *` sobre la tabla especificada y ordena los
 * resultados alfabéticamente por la columna `name`.
 *
 * @param {string} table Nombre de la tabla en la base de datos (ej. 'brands', 'categories', 'suppliers').
 * @returns {Promise<Array>} Promesa que resuelve a la lista de registros obtenidos.
 * @throws {Error} Excepción lanzada si Supabase retorna un error durante la consulta.
 */
async function listCatalog(table) {
  const { data, error } = await supabaseClient.from(table).select('*').order('name');
  if (error) throw error;
  return data;
}

export const listBrands = () => listCatalog('brands');
export const listCategories = () => listCatalog('categories');
export const listSuppliers = () => listCatalog('suppliers');