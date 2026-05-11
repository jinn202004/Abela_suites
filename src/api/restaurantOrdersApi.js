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
    Authorization: `Bearer ${token}`,
  };
}

/** GET /api/restaurant-orders — admin, cashier, or frontdesk */
export async function fetchRestaurantOrdersBackend(params = {}) {
  const q = new URLSearchParams();
  if (params.guestId) q.set("guestId", params.guestId);
  if (params.status) q.set("status", params.status);
  const suffix = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(backendUrl(`/api/restaurant-orders${suffix}`), { headers: authJsonHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return Array.isArray(data.orders) ? data.orders : [];
}

function jsonAuthHeaders() {
  return {
    ...authJsonHeaders(),
    "Content-Type": "application/json",
  };
}

/** POST /api/restaurant-orders — cashier or admin */
export async function createRestaurantOrderBackend(body) {
  const res = await fetch(backendUrl("/api/restaurant-orders"), {
    method: "POST",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data.order;
}

/** PATCH /api/restaurant-orders/:id/payment — body: { amountPaid, paymentMethod?: 'cash'|'gcash' } */
export async function patchRestaurantOrderPaymentBackend(id, body) {
  const res = await fetch(backendUrl(`/api/restaurant-orders/${encodeURIComponent(id)}/payment`), {
    method: "PATCH",
    headers: jsonAuthHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data.order;
}

/** PATCH /api/restaurant-orders/:id/status */
export async function patchRestaurantOrderStatusBackend(id, status) {
  const res = await fetch(backendUrl(`/api/restaurant-orders/${encodeURIComponent(id)}/status`), {
    method: "PATCH",
    headers: jsonAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data.order;
}
