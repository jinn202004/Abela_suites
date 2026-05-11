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

/** GET /api/restaurant-menu-notifications — admin or cashier */
export async function fetchRestaurantMenuNotificationsBackend() {
  const res = await fetch(backendUrl("/api/restaurant-menu-notifications"), { headers: authJsonHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/** PATCH /api/restaurant-menu-notifications/:id/read */
export async function patchRestaurantMenuNotificationReadBackend(id) {
  const res = await fetch(backendUrl(`/api/restaurant-menu-notifications/${encodeURIComponent(id)}/read`), {
    method: "PATCH",
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
