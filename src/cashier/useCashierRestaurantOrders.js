import { useState, useEffect, useCallback, useRef } from "react";
import { fetchRestaurantOrdersBackend } from "../api/restaurantOrdersApi";
import { AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { mapRestaurantOrderToHistoryRow } from "./cashierRestaurantOrdersUtils";
import { subscribeCashierOrdersRefresh } from "./cashierOrdersRefresh";

const ORDERS_POLL_MS = 10000;

export function useCashierRestaurantOrders({ poll = true } = {}) {
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
      const raw = await fetchRestaurantOrdersBackend();
      if (gen !== genRef.current) return;
      const rows = raw
        .map(mapRestaurantOrderToHistoryRow)
        .sort((a, b) => b.dateSort - a.dateSort);
      setOrders(rows);
    } catch (e) {
      if (gen !== genRef.current) return;
      setOrders([]);
      setError(
        e?.code === "NO_TOKEN"
          ? "Sign in to load restaurant orders."
          : e?.message || "Could not load orders.",
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
    const id = window.setInterval(() => void load({ silent: true }), ORDERS_POLL_MS);
    return () => window.clearInterval(id);
  }, [load, poll]);

  useEffect(() => {
    return subscribeCashierOrdersRefresh(() => void load({ silent: true }));
  }, [load]);

  return { orders, loading, error, reload: load, load };
}
