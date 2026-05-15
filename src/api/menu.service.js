/**
 * Restaurant menu API (admin + shared auth). Pagination uses GET /api/menu?page=&limit=.
 * Mutations require admin (enforced by backend).
 */
import {
  fetchMenuPageBackend,
  createMenuItemBackend,
  updateMenuItemBackend,
  deleteMenuItemBackend,
} from "./menuApi";

/**
 * @param {number} page
 * @param {number} limit
 * @param {{ category?: string, categoryId?: string, availability?: string, search?: string }} [filters]
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ currentPage: number, totalPages: number, totalItems: number, data: object[] }>}
 */
export async function getMenus(page = 1, limit = 10, filters = {}, options = {}) {
  return fetchMenuPageBackend(page, limit, { ...(filters || {}), signal: options?.signal });
}

export async function createMenu(data) {
  return createMenuItemBackend(data);
}

export async function updateMenu(id, data) {
  return updateMenuItemBackend(String(id), data);
}

export async function deleteMenu(id) {
  return deleteMenuItemBackend(String(id));
}
