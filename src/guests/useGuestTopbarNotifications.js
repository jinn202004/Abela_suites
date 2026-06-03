import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  fetchNotificationsBackend,
  markAllNotificationsReadBackend,
  GUEST_NOTIFICATIONS_REFRESH_EVENT,
} from "../api/guestApi";
import { getStoredAuthToken } from "../api/authApi";
import { buildGuestNotificationDetailLines } from "./guestNotificationDisplay";

/**
 * Loads approve/reject alerts from GET /api/notifications for the guest topbar bell.
 * Fetches once when the hook mounts (per page visit); use `loadGuestNotifications({ force: true })` to refresh manually.
 */
export function useGuestTopbarNotifications() {
  const notifRef = useRef(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [guestNotifRows, setGuestNotifRows] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const initialLoadDoneRef = useRef(false);
  const loadInFlightRef = useRef(null);

  const loadGuestNotifications = useCallback(async (opts = {}) => {
    const force = opts.force === true;
    if (!force && initialLoadDoneRef.current) return;

    if (!getStoredAuthToken()) {
      setGuestNotifRows([]);
      setUnreadNotifCount(0);
      initialLoadDoneRef.current = true;
      return;
    }

    if (loadInFlightRef.current) {
      return loadInFlightRef.current;
    }

    const run = (async () => {
      try {
        const { notifications, unreadCount } = await fetchNotificationsBackend();
        setGuestNotifRows(notifications);
        setUnreadNotifCount(unreadCount);
      } catch {
        setGuestNotifRows([]);
        setUnreadNotifCount(0);
      } finally {
        initialLoadDoneRef.current = true;
        loadInFlightRef.current = null;
      }
    })();

    loadInFlightRef.current = run;
    return run;
  }, []);

  useEffect(() => {
    void loadGuestNotifications();
  }, [loadGuestNotifications]);

  /** Same-tab refresh after staff approve/reject (explicit dispatch only). */
  useEffect(() => {
    const onRefresh = () => void loadGuestNotifications({ force: true });
    window.addEventListener(GUEST_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(GUEST_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
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
