// ============================================================
// Servicio: Catálogos de referencia (brands, categories, suppliers)
// Usados para poblar los <select> de filtros y formularios.
// ============================================================

import { supabaseClient } from '../supabaseClient.js';

async function listCatalog(table) {
  const { data, error } = await supabaseClient.from(table).select('*').order('name');
  if (error) throw error;
  return data;
}

export const listBrands = () => listCatalog('brands');
export const listCategories = () => listCatalog('categories');
export const listSuppliers = () => listCatalog('suppliers');