import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchRestaurantMenuNotificationsBackend } from "../api/restaurantMenuNotificationsApi";
import { AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { mapRestaurantMenuNotificationsToBellItems } from "./cashierRestaurantOrdersUtils";

const POLL_MS = 45_000;

export function useCashierMenuNotifications() {
  const [menuBellItems, setMenuBellItems] = useState([]);

  const load = useCallback(async () => {
    try {
      const data = await fetchRestaurantMenuNotificationsBackend();
      const rows = Array.isArray(data.notifications) ? data.notifications : [];
      setMenuBellItems(mapRestaurantMenuNotificationsToBellItems(rows));
    } catch {
      setMenuBellItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onTok = () => void load();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
  }, [load]);

  const unreadCount = useMemo(
    () => menuBellItems.filter((n) => n.read === false).length,
    [menuBellItems],
  );

  return { menuBellItems, reload: load, unreadCount };
}
