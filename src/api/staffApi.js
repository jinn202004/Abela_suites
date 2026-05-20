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
 * GET /api/staff — Bearer + admin.
 * @returns {Promise<Array<{ id: string, name: string, email: string, role: string, department: string, contact: string, status: string, createdAt?: string, updatedAt?: string }>>}
 */
export async function fetchStaffList() {
  const res = await fetch(backendUrl("/api/staff"), { headers: authJsonHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return Array.isArray(data.staff) ? data.staff : [];
}

/**
 * POST /api/staff
 * @param {{ name: string, email: string, role: string, department?: string, contact?: string, status?: string }} body
 */
export async function createStaffBackend(body) {
  const res = await fetch(backendUrl("/api/staff"), {
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
  return data.staff;
}

/**
 * PUT /api/staff/:id
 */
export async function updateStaffBackend(id, body) {
  const res = await fetch(backendUrl(`/api/staff/${encodeURIComponent(id)}`), {
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
  return data.staff;
}

/**
 * PUT /api/staff/:id — status-only update (preserves other fields).
 * @param {string} id
 * @param {"Active"|"On Leave"|"Inactive"} status
 */
export async function updateStaffStatusBackend(id, status) {
  return updateStaffBackend(id, { status });
}

/** DELETE /api/staff/:id */
export async function deleteStaffBackend(id) {
  const res = await fetch(backendUrl(`/api/staff/${encodeURIComponent(id)}`), {
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
