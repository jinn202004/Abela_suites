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

/** GET /api/eventvenues — admin JWT only. */
export async function fetchEventVenuesAdmin() {
  const res = await fetch(backendUrl("/api/eventvenues"), { headers: authJsonHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return Array.isArray(data.eventvenues) ? data.eventvenues : [];
}

/** GET /api/eventvenues/:id */
export async function fetchEventVenueByIdAdmin(id) {
  const res = await fetch(backendUrl(`/api/eventvenues/${encodeURIComponent(id)}`), {
    headers: authJsonHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data.eventvenue;
}

/** POST /api/eventvenues */
export async function createEventVenueAdmin(body) {
  const res = await fetch(backendUrl("/api/eventvenues"), {
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
  return data.eventvenue;
}

/** PUT /api/eventvenues/:id */
export async function updateEventVenueAdmin(id, body) {
  const res = await fetch(backendUrl(`/api/eventvenues/${encodeURIComponent(id)}`), {
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
  return data.eventvenue;
}

/** DELETE /api/eventvenues/:id */
export async function deleteEventVenueAdmin(id) {
  const res = await fetch(backendUrl(`/api/eventvenues/${encodeURIComponent(id)}`), {
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

export const EVENT_VENUE_STATUSES = [
  "available",
  "reserved",
  "occupied",
  "needs_cleaning",
  "cleaning_in_progress",
  "ready",
];
