import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  fetchPendingBookingsBackend,
  fetchNotificationsBackend,
  markAllNotificationsReadBackend,
  FRONTDESK_NOTIFICATIONS_REFRESH_EVENT,
  FRONTDESK_NOTIFICATIONS_STORAGE_PING_KEY,
} from "../api/guestApi";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";

/**
 * Pending bookings + persisted staff notifications when a guest submits booking info.
 * @param {{ bookingType?: 'room' | 'event' | 'all' }} opts
 */
export function useFrontdeskPendingNotifications({ bookingType = "all" } = {}) {
  const location = useLocation();
  const [pendingBookings, setPendingBookings] = useState([]);
  const [staffUnreadCount, setStaffUnreadCount] = useState(0);
  const [staffNotifications, setStaffNotifications] = useState([]);

  const loadPending = useCallback(async () => {
    if (!getStoredAuthToken()) {
      setPendingBookings([]);
      setStaffNotifications([]);
      setStaffUnreadCount(0);
      return;
    }
    try {
      const [list, staffData] = await Promise.all([
        fetchPendingBookingsBackend(),
        fetchNotificationsBackend().catch(() => ({ notifications: [], unreadCount: 0 })),
      ]);
      let rows = Array.isArray(list) ? list : [];
      if (bookingType === "room") rows = rows.filter((b) => b.type === "room");
      else if (bookingType === "event") rows = rows.filter((b) => b.type === "event");
      setPendingBookings(rows);
      setStaffNotifications(Array.isArray(staffData.notifications) ? staffData.notifications : []);
      setStaffUnreadCount(
        typeof staffData.unreadCount === "number" ? staffData.unreadCount : 0
      );
    } catch {
      setPendingBookings([]);
      setStaffNotifications([]);
      setStaffUnreadCount(0);
    }
  }, [bookingType]);

  const markStaffNotificationsSeen = useCallback(async () => {
    if (!getStoredAuthToken()) return;
    try {
      const data = await markAllNotificationsReadBackend();
      setStaffNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      setStaffUnreadCount(
        typeof data.unreadCount === "number" ? data.unreadCount : 0
      );
    } catch {
      await loadPending();
    }
  }, [loadPending]);

  useEffect(() => {
    loadPending();
  }, [loadPending, location.pathname, location.key]);

  useEffect(() => {
    const onToken = () => loadPending();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
  }, [loadPending]);

  useEffect(() => {
    const onRefresh = () => loadPending();
    window.addEventListener(FRONTDESK_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(FRONTDESK_NOTIFICATIONS_REFRESH_EVENT, onRefresh);
  }, [loadPending]);

  /** Other browser tabs (e.g. front desk open while housekeeping completes a task in another tab). */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === FRONTDESK_NOTIFICATIONS_STORAGE_PING_KEY) loadPending();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [loadPending]);

  useEffect(() => {
    const id = window.setInterval(loadPending, 20_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") loadPending();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadPending]);

  const derivedStaffUnread = useMemo(
    () => staffNotifications.filter((n) => n.read !== true).length,
    [staffNotifications],
  );
  const effectiveStaffUnread = Math.max(staffUnreadCount, derivedStaffUnread);

  const hasNotifAttention = pendingBookings.length > 0 || effectiveStaffUnread > 0;

  const displayNotifications = useMemo(() => {
    const inferBookingType = (inputType, msg, detail) => {
      const rawType = String(inputType || "").trim().toLowerCase();
      if (rawType === "room" || rawType === "event") return rawType;
      const hay = `${String(msg || "")} ${String(detail || "")}`.toLowerCase();
      if (hay.includes("event") || hay.includes("venue")) return "event";
      if (hay.includes("room")) return "room";
      return "";
    };

    /** API may return id as string, { $oid }, or nested _id. */
    function normalizeMongoId(v) {
      if (v == null || v === "") return "";
      if (typeof v === "string") return v.trim();
      if (typeof v === "object" && v.$oid) return String(v.$oid).trim();
      if (typeof v === "object" && v._id != null) return normalizeMongoId(v._id);
      return String(v).trim();
    }

    function staffRowBookingId(n) {
      const direct = normalizeMongoId(n.bookingId);
      if (direct) return direct;
      const fromSnap = normalizeMongoId(n.booking?.id ?? n.booking?._id);
      return fromSnap || "";
    }

    const staffSorted = [...staffNotifications].sort((a, b) => {
      const ta = a.createdAt != null ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt != null ? new Date(b.createdAt).getTime() : 0;
      return tb - ta;
    });

    const bookingIdsWithStaffRow = new Set(staffSorted.map((n) => staffRowBookingId(n)).filter(Boolean));

    const rows = [];

    staffSorted.forEach((n, staffIdx) => {
      const bookingId = staffRowBookingId(n);
      const detail = bookingId ? `Booking ref · ${bookingId.slice(-10)}` : "";
      const bookingType = inferBookingType(
        n.bookingType || n.type || n.booking?.type || n.bookingKind,
        n.message,
        detail
      );
      const rowId = normalizeMongoId(n.id);
      rows.push({
        id: `staff-${rowId || "noid"}-${staffIdx}`,
        bookingId,
        msg: n.message || "Staff notification.",
        detail,
        bookingType,
        time: n.createdAt != null ? new Date(n.createdAt).toLocaleString("en-PH") : "",
        read: n.read === true,
        sortKey: n.createdAt != null ? new Date(n.createdAt).getTime() : 0,
      });
    });

    for (const b of pendingBookings) {
      const bid = normalizeMongoId(b.id ?? b._id);
      if (!bid || bookingIdsWithStaffRow.has(bid)) continue;
      const name = (b.guest && b.guest.displayName) || b.customerName || "Guest";
      const when = b.createdAt != null ? new Date(b.createdAt).toLocaleString("en-PH") : "";
      let msg = `${name} submitted a booking — needs your confirmation.`;
      if (b.type === "room") {
        msg = `${name} submitted a room reservation — needs your confirmation.`;
      } else if (b.type === "event") {
        msg = `${name} submitted an event booking — needs your confirmation.`;
      }
      rows.push({
        id: `pending-${bid}`,
        bookingId: bid,
        msg,
        detail: b.type === "room" ? "Room reservation" : b.type === "event" ? "Event booking" : "Booking",
        bookingType: b.type === "room" || b.type === "event" ? b.type : "",
        time: when,
        read: false,
        sortKey: b.createdAt != null ? new Date(b.createdAt).getTime() : 0,
      });
    }

    return rows
      .sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0))
      .slice(0, 15)
      .map(({ sortKey: _s, ...rest }) => rest);
  }, [pendingBookings, staffNotifications]);

  /** Bell dot: pending queue or unread staff notification rows */
  const pendingCount = hasNotifAttention ? 1 : 0;

  return { pendingCount, displayNotifications, loadPending, markStaffNotificationsSeen, hasNotifAttention };
}
