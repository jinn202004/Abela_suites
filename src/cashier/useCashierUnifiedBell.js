import { useMemo, useCallback } from "react";
import { mergeCashierBellNotifications } from "./cashierRestaurantOrdersUtils";
import { useCashierRestaurantOrders } from "./useCashierRestaurantOrders";
import { useCashierMenuNotifications } from "./useCashierMenuNotifications";
import { patchRestaurantMenuNotificationReadBackend } from "../api/restaurantMenuNotificationsApi";

/**
 * Cashier-only: one bell feed from the DB — session line + new-dish alerts (`RestaurantMenuNotification`)
 * + restaurant orders (`GET /api/restaurant-orders`). Use on every cashier shell so Settings matches POS.
 *
 * @param {object} [opts]
 * @param {string} [opts.displayName] — shown in the session line (from `useTopbarUserProfile` when available)
 * @param {(n: object) => void} [opts.onMenuNotificationRead] — e.g. reload POS menu after marking a dish alert read
 * @param {(n: object) => void} [opts.onOrderNotificationClick] — open exact order detail in UI
 */
export function useCashierUnifiedBell({ displayName, onMenuNotificationRead, onOrderNotificationClick } = {}) {
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    reload: reloadRestaurantOrders,
  } = useCashierRestaurantOrders();
  const { menuBellItems, reload: reloadMenuNotifs } = useCashierMenuNotifications();

  const bellNotifications = useMemo(
    () =>
      mergeCashierBellNotifications(
        {
          msg: `Signed in as ${displayName || "Cashier"}`,
          time: "Session",
        },
        orders,
        menuBellItems,
      ),
    [displayName, orders, menuBellItems],
  );

  const hasUnreadBell = useMemo(
    () => bellNotifications.some((n) => n.read === false),
    [bellNotifications],
  );

  const handleNotifItemClick = useCallback(
    (n) => {
      if (n?.source === "menu") {
        if (n.notificationId && n.read === false) {
          void patchRestaurantMenuNotificationReadBackend(n.notificationId).then(() => {
            void reloadMenuNotifs();
            onMenuNotificationRead?.(n);
          });
          return;
        }
        onMenuNotificationRead?.(n);
        return;
      }
      if (n?.source === "order" && n.orderId) onOrderNotificationClick?.(n);
    },
    [reloadMenuNotifs, onMenuNotificationRead, onOrderNotificationClick],
  );

  return {
    orders,
    ordersLoading,
    ordersError,
    bellNotifications,
    hasUnreadBell,
    handleNotifItemClick,
    reloadRestaurantOrders,
  };
}
