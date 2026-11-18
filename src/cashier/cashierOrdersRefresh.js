/** Instant cashier refresh when a guest confirms a restaurant order (same tab + other tabs). */
export const CASHIER_ORDERS_REFRESH_EVENT = "abela:cashier-orders-refresh";
export const CASHIER_ORDERS_STORAGE_PING_KEY = "abela_cashier_orders_ping";

export function dispatchCashierOrdersRefresh() {
  try {
    window.dispatchEvent(new Event(CASHIER_ORDERS_REFRESH_EVENT));
    localStorage.setItem(CASHIER_ORDERS_STORAGE_PING_KEY, String(Date.now()));
  } catch {
    try {
      window.dispatchEvent(new Event(CASHIER_ORDERS_REFRESH_EVENT));
    } catch {
      /* ignore */
    }
  }
}

/** @param {() => void} onRefresh */
export function subscribeCashierOrdersRefresh(onRefresh) {
  const handler = () => onRefresh();
  const onStorage = (e) => {
    if (e.key === CASHIER_ORDERS_STORAGE_PING_KEY) handler();
  };
  window.addEventListener(CASHIER_ORDERS_REFRESH_EVENT, handler);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CASHIER_ORDERS_REFRESH_EVENT, handler);
    window.removeEventListener("storage", onStorage);
  };
}
