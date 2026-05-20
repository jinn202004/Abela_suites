import { useState, useEffect, useCallback, useMemo } from "react";
import {
  fetchHousekeepingTasksBackend,
  postHousekeepingReconcileMissingBackend,
  HOUSEKEEPING_TASKS_REFRESH_EVENT,
  HOUSEKEEPING_TASKS_STORAGE_PING_KEY,
  fetchHousekeepingNotificationsBackend,
  markAllHousekeepingNotificationsReadBackend,
  HOUSEKEEPING_INBOX_REFRESH_EVENT,
} from "../api/guestApi";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";

/** Human-readable line for the housekeeping bell: which room/venue needs cleaning. */
export function formatCleaningTaskMessage(t) {
  if (!t || typeof t !== "object") return "";
  const st = String(t.status || "").toLowerCase();
  const suffix = st === "in_progress" ? " — cleaning in progress" : " — needs cleaning";
  if (t.targetType === "room") {
    const rm = (t.room && t.room.roomNumber) || "—";
    const label = String((t.room && t.room.package) || "").trim() || "Room";
    const guest = String((t.booking && t.booking.customerName) || "").trim();
    const who = guest ? ` · ${guest}` : "";
    return `Room ${rm} · ${label}${who}${suffix}`;
  }
  const ev = t.eventVenue;
  const label = String((ev && ev.package) || (ev && ev.name) || "").trim() || "Venue";
  const num = String((ev && ev.eventNum) || "").trim();
  return num ? `Venue ${label} (${num})${suffix}` : `Venue ${label}${suffix}`;
}

/**
 * Polls cleaning tasks + persisted “new task” inbox for the top bar.
 */
export function useHousekeepingCleaningNotifications() {
  const [tasks, setTasks] = useState([]);
  const [inbox, setInbox] = useState([]);

  const load = useCallback(async (opts = {}) => {
    const reconcile = opts.reconcile === true;
    if (!getStoredAuthToken()) {
      setTasks([]);
      setInbox([]);
      return;
    }
    try {
      if (reconcile) {
        await postHousekeepingReconcileMissingBackend().catch(() => {});
      }
      const [list, inboxRes] = await Promise.all([
        fetchHousekeepingTasksBackend(false),
        fetchHousekeepingNotificationsBackend().catch(() => ({ notifications: [], unreadCount: 0 })),
      ]);
      setTasks(Array.isArray(list) ? list : []);
      setInbox(Array.isArray(inboxRes.notifications) ? inboxRes.notifications : []);
    } catch {
      setTasks([]);
      setInbox([]);
    }
  }, []);

  const markHousekeepingInboxSeen = useCallback(async () => {
    if (!getStoredAuthToken()) return;
    try {
      const data = await markAllHousekeepingNotificationsReadBackend();
      setInbox(Array.isArray(data.notifications) ? data.notifications : []);
    } catch {
      await load({ reconcile: false });
    }
  }, [load]);

  useEffect(() => {
    load({ reconcile: false });
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => load(), 6000);
    let lastFocusLoad = 0;
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };
    const onFocus = () => {
      if (!getStoredAuthToken()) return;
      const now = Date.now();
      if (now - lastFocusLoad < 600) return;
      lastFocusLoad = now;
      load();
    };
    const onRefresh = () => load({ reconcile: false });
    const onInboxRefresh = () => load({ reconcile: false });
    const onStorage = (e) => {
      if (e.key === HOUSEKEEPING_TASKS_STORAGE_PING_KEY) load({ reconcile: false });
    };
    window.addEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onRefresh);
    window.addEventListener(HOUSEKEEPING_INBOX_REFRESH_EVENT, onInboxRefresh);
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onRefresh);
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onRefresh);
      window.removeEventListener(HOUSEKEEPING_INBOX_REFRESH_EVENT, onInboxRefresh);
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onRefresh);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const pendingOnly = useMemo(() => tasks.filter((t) => t.status === "pending"), [tasks]);

  const activeForBell = useMemo(
    () => tasks.filter((t) => t.status === "pending" || t.status === "in_progress"),
    [tasks]
  );

  const displayNotifications = useMemo(() => {
    const lines = [];
    for (const t of activeForBell) {
      const inboxRow = inbox.find((n) => n.taskId && String(n.taskId) === String(t.id) && !n.read);
      if (inboxRow) {
        lines.push({
          id: `inbox-${inboxRow.id}`,
          taskId: String(t.id),
          targetType: t.targetType,
          msg: inboxRow.message || formatCleaningTaskMessage(t),
          time: inboxRow.createdAt != null ? new Date(inboxRow.createdAt).toLocaleString("en-PH") : "",
          read: false,
        });
      } else {
        lines.push({
          id: String(t.id),
          taskId: String(t.id),
          targetType: t.targetType,
          msg: formatCleaningTaskMessage(t),
          time: t.createdAt != null ? new Date(t.createdAt).toLocaleString("en-PH") : "",
          read: false,
        });
      }
    }
    for (const n of inbox) {
      if (!n.read && n.taskId && !activeForBell.some((t) => String(t.id) === String(n.taskId))) {
        lines.push({
          id: `inbox-${n.id}`,
          taskId: n.taskId != null ? String(n.taskId) : "",
          targetType: "",
          msg: n.message || "New cleaning task.",
          time: n.createdAt != null ? new Date(n.createdAt).toLocaleString("en-PH") : "",
          read: false,
        });
      }
    }
    return lines.slice(0, 15);
  }, [activeForBell, inbox]);

  const needsCleaningCount =
    pendingOnly.length > 0 || inbox.some((n) => !n.read) ? 1 : 0;

  return {
    needsCleaningCount,
    displayNotifications,
    reloadCleaningNotifs: load,
    markHousekeepingInboxSeen,
  };
}
