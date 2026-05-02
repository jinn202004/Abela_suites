import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  fetchNotificationsBackend,
  markAllNotificationsReadBackend,
  GUEST_NOTIFICATIONS_REFRESH_EVENT,
  GUEST_NOTIFS_STORAGE_PING_KEY,
} from "../api/guestApi";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { buildGuestNotificationDetailLines } from "./guestNotificationDisplay";

/**
 * Loads approve/reject alerts from GET /api/users/me/notifications and keeps the bell in sync.
 */
export function useGuestTopbarNotifications() {
  const location = useLocation();
  const notifRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [guestNotifRows, setGuestNotifRows] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const loadGuestNotifications = useCallback(async () => {
    if (!getStoredAuthToken()) {
      setGuestNotifRows([]);
      setUnreadNotifCount(0);
      return;
    }
    try {
      const { notifications, unreadCount } = await fetchNotificationsBackend();
      setGuestNotifRows(notifications);
      setUnreadNotifCount(unreadCount);
    } catch {
      setGuestNotifRows([]);
      setUnreadNotifCount(0);
    }
  }, []);

  useEffect(() => {
    loadGuestNotifications();
  }, [loadGuestNotifications, location.pathname, location.key]);

  useEffect(() => {
    function onAuthChanged() {
      loadGuestNotifications();
    }
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthChanged);
  }, [loadGuestNotifications]);

  /** Same-tab refresh (e.g. after booking history load dispatches). */
  useEffect(() => {
    const onRefresh = () => loadGuestNotifications();
    window.addEventListener(GUEST_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(GUEST_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
  }, [loadGuestNotifications]);

  /** Other tabs: front desk approved/rejects → localStorage ping from `dispatchGuestBookingsRefreshPing`. */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === GUEST_NOTIFS_STORAGE_PING_KEY) loadGuestNotifications();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadGuestNotifications]);

  /** Poll and refetch when the tab is focused so approve/reject from front desk shows without a full reload. */
  useEffect(() => {
    const intervalMs = 15_000;
    const tick = () => {
      if (getStoredAuthToken()) loadGuestNotifications();
    };
    const id = window.setInterval(tick, intervalMs);
    function onVisible() {
      if (document.visibilityState === "visible") tick();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadGuestNotifications]);

  const derivedUnreadCount = useMemo(
    () => guestNotifRows.filter((n) => n.read !== true).length,
    [guestNotifRows],
  );

  /** Prefer API count; fall back to row-level `read` so the red dot still shows if the API omits `unreadCount`. */
  const bellUnreadCount = useMemo(
    () => Math.max(unreadNotifCount, derivedUnreadCount),
    [unreadNotifCount, derivedUnreadCount],
  );

  const displayNotifications = useMemo(() => {
    function normalizeMongoId(v) {
      if (v == null || v === "") return "";
      if (typeof v === "string") return v.trim();
      if (typeof v === "object" && v.$oid) return String(v.$oid).trim();
      if (typeof v === "object" && v._id != null) return normalizeMongoId(v._id);
      return String(v).trim();
    }
    return guestNotifRows.slice(0, 20).map((n, i) => {
      const detailLines = buildGuestNotificationDetailLines(n);
      const bookingId =
        normalizeMongoId(n.bookingId) ||
        normalizeMongoId(n.booking?.id ?? n.booking?._id);
      const rowId = normalizeMongoId(n.id);
      return {
        id: rowId || `gnotif-${i}`,
        bookingId,
        msg: n.message || "",
        detailLines,
        time: n.createdAt ? new Date(n.createdAt).toLocaleString("en-PH") : "",
        read: n.read === true,
      };
    });
  }, [guestNotifRows]);

  useEffect(() => {
    if (!notifOpen || bellUnreadCount < 1) return;
    let cancelled = false;
    (async () => {
      try {
        await markAllNotificationsReadBackend();
        if (!cancelled) {
          setGuestNotifRows((prev) => prev.map((x) => ({ ...x, read: true })));
          setUnreadNotifCount(0);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notifOpen, bellUnreadCount]);

  return {
    notifRef,
    notifOpen,
    setNotifOpen,
    unreadNotifCount,
    bellUnreadCount,
    displayNotifications,
    loadGuestNotifications,
  };
}
