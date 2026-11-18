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

/** GET /api/event-venues — admin JWT only. */
export async function fetchEventVenuesAdmin() {
  const res = await fetch(backendUrl("/api/event-venues"), { headers: authJsonHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return Array.isArray(data.eventVenues) ? data.eventVenues : [];
}

/** GET /api/event-venues/:id */
export async function fetchEventVenueByIdAdmin(id) {
  const res = await fetch(backendUrl(`/api/event-venues/${encodeURIComponent(id)}`), {
    headers: authJsonHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data.eventVenue;
}

/** POST /api/event-venues */
export async function createEventVenueAdmin(body) {
  const res = await fetch(backendUrl("/api/event-venues"), {
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
  return data.eventVenue;
}

/** PATCH /api/event-venues/:id */
export async function updateEventVenueAdmin(id, body) {
  const res = await fetch(backendUrl(`/api/event-venues/${encodeURIComponent(id)}`), {
    method: "PATCH",
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data.eventVenue;
}

/** DELETE /api/event-venues/:id */
export async function deleteEventVenueAdmin(id) {
  const res = await fetch(backendUrl(`/api/event-venues/${encodeURIComponent(id)}`), {
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
