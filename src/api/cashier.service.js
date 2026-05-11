/**
 * Cashier billing API (ADMIN_1 Bills / staff roles). Pagination: GET /api/cashier/billing?page=&limit=
 * Mutations: PUT /api/billing/:id/payment (cashier + admin only).
 */
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
 * @param {number} page
 * @param {number} limit
 * @param {{ type?: "room"|"event"|"", search?: string }} [filters]
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ currentPage: number, totalPages: number, totalItems: number, data: object[] }>}
 */
export async function getBilling(page = 1, limit = 10, filters = {}, options = {}) {
  const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
  const limitNum = Math.max(1, parseInt(String(limit), 10) || 10);
  const q = new URLSearchParams();
  q.set("page", String(pageNum));
  q.set("limit", String(limitNum));
  const type = String(filters.type ?? "")
    .trim()
    .toLowerCase();
  if (type === "room" || type === "event") q.set("type", type);
  const search = String(filters.search ?? "").trim();
  if (search) q.set("search", search.slice(0, 120));
  const res = await fetch(backendUrl(`/api/cashier/billing?${q.toString()}`), {
    headers: authJsonHeaders(),
    signal: options?.signal,
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
  return {
    currentPage: pageNum,
    totalPages: 1,
    totalItems: 0,
    data: [],
  };
}

/**
 * @param {string} id Billing document id
 * @param {number|string} amount New cumulative amount paid (same semantics as backend `amountPaid`)
 */
export async function updatePayment(id, amount, options = {}) {
  const n = typeof amount === "string" ? Number(String(amount).replace(/[₱,\s]/g, "")) : Number(amount);
  const res = await fetch(backendUrl(`/api/billing/${encodeURIComponent(String(id))}/payment`), {
    method: "PUT",
    headers: authJsonHeaders(),
    body: JSON.stringify({ amountPaid: n }),
    signal: options?.signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** GET /api/billing/:id — full guest/booking/billing bundle */
export async function getBillingById(id, options = {}) {
  const res = await fetch(backendUrl(`/api/billing/${encodeURIComponent(String(id))}`), {
    headers: authJsonHeaders(),
    signal: options?.signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
