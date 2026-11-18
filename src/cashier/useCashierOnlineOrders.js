import { useState, useEffect, useCallback, useRef } from "react";
import { fetchRestaurantOrdersBackend } from "../api/restaurantOrdersApi";
import { AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { mapOnlineGuestOrderRow } from "./cashierOnlineOrdersUtils";
import { subscribeCashierOrdersRefresh } from "./cashierOrdersRefresh";

/** Poll interval for live online orders table + dashboard pending count. */
export const ONLINE_ORDERS_POLL_MS = 5000;

export function useCashierOnlineOrders({ poll = true } = {}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const genRef = useRef(0);

  const load = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    const gen = ++genRef.current;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const raw = await fetchRestaurantOrdersBackend({ source: "guest" });
      if (gen !== genRef.current) return;
      const rows = raw
        .map(mapOnlineGuestOrderRow)
        .sort((a, b) => b.dateSort - a.dateSort);
      setOrders(rows);
      setError("");
    } catch (e) {
      if (gen !== genRef.current) return;
      setOrders([]);
      setError(
        e?.code === "NO_TOKEN"
          ? "Sign in with your cashier account to receive guest orders."
          : e?.message || "Could not load online orders.",
      );
    } finally {
      if (gen === genRef.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onTok = () => void load();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
  }, [load]);

  useEffect(() => {
    if (!poll) return undefined;
    const id = window.setInterval(() => void load({ silent: true }), ONLINE_ORDERS_POLL_MS);
    return () => window.clearInterval(id);
  }, [load, poll]);

  useEffect(() => {
    return subscribeCashierOrdersRefresh(() => void load({ silent: true }));
  }, [load]);

  return { orders, loading, error, reload: load, load };
}
