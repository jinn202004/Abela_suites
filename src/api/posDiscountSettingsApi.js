import { backendUrl } from "./config";
import { getStoredAuthToken } from "./authApi";

export const POS_DISCOUNT_SETTINGS_CHANGED_EVENT = "abela:pos-discount-settings-changed";

export function dispatchPosDiscountSettingsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(POS_DISCOUNT_SETTINGS_CHANGED_EVENT));
}

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

/** GET /api/pos-settings/discounts — admin or cashier */
export async function fetchPosDiscountSettingsBackend() {
  const res = await fetch(backendUrl("/api/pos-settings/discounts"), { headers: authJsonHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const s = data.settings;
  return {
    discounts: Array.isArray(s?.discounts) ? s.discounts : [],
    defaultDiscountName: String(s?.defaultDiscountName ?? "").trim(),
  };
}

/** PUT /api/pos-settings/discounts — admin only */
export async function savePosDiscountSettingsBackend(settings) {
  const res = await fetch(backendUrl("/api/pos-settings/discounts"), {
    method: "PUT",
    headers: authJsonHeaders(),
    body: JSON.stringify(settings),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  dispatchPosDiscountSettingsChanged();
  const s = data.settings;
  return {
    discounts: Array.isArray(s?.discounts) ? s.discounts : [],
    defaultDiscountName: String(s?.defaultDiscountName ?? "").trim(),
  };
}
