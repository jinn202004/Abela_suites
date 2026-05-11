import { useState, useEffect, useCallback } from "react";
import { fetchRestaurantOrdersBackend } from "../api/restaurantOrdersApi";
import { AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { mapRestaurantOrderToHistoryRow } from "./cashierRestaurantOrdersUtils";

export function useCashierRestaurantOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const raw = await fetchRestaurantOrdersBackend();
      const rows = raw
        .map(mapRestaurantOrderToHistoryRow)
        .sort((a, b) => b.dateSort - a.dateSort);
      setOrders(rows);
    } catch (e) {
      setOrders([]);
      setError(
        e?.code === "NO_TOKEN"
          ? "Sign in to load restaurant orders."
          : e?.message || "Could not load orders.",
      );
    } finally {
      setLoading(false);
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

  return { orders, loading, error, reload: load, load };
}
