import { backendUrl } from "./config";
import { getStoredAuthToken } from "./authApi";

function authJsonHeaders() {
  const token = getStoredAuthToken();
  if (!token) {
    const err = new Error("Not signed in");
    err.code = "NO_TOKEN";
    throw err;
  }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * GET /api/menu/admin-bootstrap — admin only.
 * Returns `{ categories, selectedCategoryId, selectedCategoryName, menuPage }` for first paint.
 */
export async function fetchRestaurantMenuAdminBootstrap(params = {}) {
  const { signal, ...query } = params || {};
  const q = new URLSearchParams();
  if (query.limit != null) q.set("limit", String(query.limit));
  if (query.search) q.set("search", String(query.search).trim());
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(backendUrl(`/api/menu/admin-bootstrap${suffix}`), {
    headers: authJsonHeaders(),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** GET /api/menu — admin or cashier (full list; no pagination params). */
export async function fetchMenuItemsBackend(params = {}) {
  const q = new URLSearchParams();
  if (params.category) q.set("category", String(params.category).trim());
  if (params.categoryId) q.set("categoryId", params.categoryId);
  if (params.availability) q.set("availability", params.availability);
  if (params.search) q.set("search", String(params.search).trim());
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(backendUrl(`/api/menu${suffix}`), { headers: authJsonHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return Array.isArray(data.menu) ? data.menu : [];
}

/**
 * GET /api/menu?page=&limit= — paginated catalog (same auth as list).
 * Response: { currentPage, totalPages, totalItems, data }
 */
export async function fetchMenuPageBackend(page = 1, limit = 10, params = {}) {
  const { signal, ...query } = params || {};
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
  const q = new URLSearchParams();
  q.set("page", String(pageNum));
  q.set("limit", String(limitNum));
  if (query.category) q.set("category", String(query.category).trim());
  if (query.categoryId) q.set("categoryId", query.categoryId);
  if (query.availability) q.set("availability", query.availability);
  if (query.search) q.set("search", String(query.search).trim());
  const res = await fetch(backendUrl(`/api/menu?${q.toString()}`), {
    headers: authJsonHeaders(),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (Array.isArray(data.data)) {
    return {
      currentPage: Number(data.currentPage) || pageNum,
      totalPages: Math.max(1, Number(data.totalPages) || 1),
      totalItems: Number(data.totalItems) || 0,
      data: data.data,
    };
  }
  /** Older API builds: `?page=&limit=` still returns `{ menu: [...] }` — paginate client-side. */
  if (Array.isArray(data.menu)) {
    const full = data.menu;
    const totalItems = full.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / limitNum));
    const cur = Math.min(pageNum, totalPages);
    const start = (cur - 1) * limitNum;
    return {
      currentPage: cur,
      totalPages,
      totalItems,
      data: full.slice(start, start + limitNum),
    };
  }
  return {
    currentPage: pageNum,
    totalPages: 1,
    totalItems: 0,
    data: [],
  };
}

/** GET /api/menu/:id */
export async function fetchMenuItemByIdBackend(id) {
  const res = await fetch(backendUrl(`/api/menu/${encodeURIComponent(id)}`), { headers: authJsonHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data.item;
}

/** POST /api/menu/dedupe — admin; removes duplicate rows (same category + name) */
export async function dedupeMenuItemsBackend() {
  const res = await fetch(backendUrl("/api/menu/dedupe"), {
    method: "POST",
    headers: authJsonHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * POST /api/menu/upload — admin; multipart field `image`. Server writes to S3 (no browser PUT / no S3 CORS for PUT).
 * Returns `{ publicUrl, key, contentType, contentLength }`.
 */
export async function uploadMenuImageDirectBackend(file) {
  const token = getStoredAuthToken();
  if (!token) {
    const err = new Error("Not signed in");
    err.code = "NO_TOKEN";
    throw err;
  }
  const fd = new FormData();
  fd.append("image", file, file.name || "image");
  const res = await fetch(backendUrl("/api/menu/upload"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    if (data.code) err.code = data.code;
    throw err;
  }
  return data;
}

/**
 * POST /api/menu/upload/presign — admin; body `{ contentType, contentLength }`.
 * Returns `{ uploadUrl, publicUrl, key, contentType, contentLength }` for a browser PUT to S3.
 */
export async function presignMenuImageUploadBackend(body) {
  const res = await fetch(backendUrl("/api/menu/upload/presign"), {
    method: "POST",
    headers: authJsonHeaders(),
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    if (data.code) err.code = data.code;
    throw err;
  }
  return data;
}

/** POST /api/menu — admin */
export async function createMenuItemBackend(body) {
  const res = await fetch(backendUrl("/api/menu"), {
    method: "POST",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (data.item == null || typeof data.item !== "object") {
    const err = new Error(data.error || "Server did not return the new menu item.");
    err.status = res.status;
    throw err;
  }
  return data.item;
}

/** PUT /api/menu/:id — admin */
export async function updateMenuItemBackend(id, body) {
  const res = await fetch(backendUrl(`/api/menu/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  if (data.item == null || typeof data.item !== "object") {
    const err = new Error(data.error || "Server did not return the updated menu item.");
    err.status = res.status;
    throw err;
  }
  return data.item;
}

/** DELETE /api/menu/:id — admin */
export async function deleteMenuItemBackend(id) {
  const res = await fetch(backendUrl(`/api/menu/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: authJsonHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** GET /api/categories — admin */
export async function fetchCategoriesBackend(opts) {
  const signal = opts?.signal;
  const res = await fetch(backendUrl("/api/categories"), { headers: authJsonHeaders(), signal });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return Array.isArray(data.categories) ? data.categories : [];
}

/** POST /api/categories — admin */
export async function createCategoryBackend(body, opts) {
  const signal = opts?.signal;
  const res = await fetch(backendUrl("/api/categories"), {
    method: "POST",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data.category;
}

/** PUT /api/categories/:id — admin */
export async function updateCategoryBackend(id, body) {
  const res = await fetch(backendUrl(`/api/categories/${encodeURIComponent(id)}`), {
    method: "PUT",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data.category;
}

/** DELETE /api/categories/:id — admin */
export async function deleteCategoryBackend(id) {
  const res = await fetch(backendUrl(`/api/categories/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers: authJsonHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
