/**
 * Display-only helpers for front desk housekeeping.
 * No persistence — does not change Mongo schemas or other collections.
 */

const ASSIGN_KEY = "abela_fd_hk_assign_overlay";
const ACTIVITY_KEY = "abela_fd_hk_activity_local";

export function sortKey(n) {
  const v = parseInt(String(n).replace(/\D/g, ""), 10);
  return Number.isNaN(v) ? 99999 : v;
}

function parseLooseDate(raw) {
  if (raw == null || raw === "") return null;
  const str = String(raw).trim();
  if (!str) return null;
  const d = str.includes("T") || str.includes(" ") ? new Date(str) : new Date(`${str}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatClock(raw) {
  const d = parseLooseDate(raw);
  if (!d) return "—";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function formatScheduleLabel(task) {
  const b = task?.booking;
  const raw =
    b?.checkOut || b?.eventEndDate || b?.eventDate || task?.updatedAt || task?.createdAt;
  return formatClock(raw);
}

export function deriveTaskName(task, assetStatus) {
  const target = String(task?.targetType || "").toLowerCase();
  if (target === "event") return "Event Cleanup";
  const st = String(assetStatus || task?.room?.status || "").toLowerCase();
  if (st === "needs_cleaning") return "Check-out Cleaning";
  const bookingStatus = String(task?.booking?.bookingStatus || "").toLowerCase();
  if (["occupied", "checked_in", "checked-in"].includes(bookingStatus)) {
    return "Stayover Cleaning";
  }
  if (["completed", "checked_out", "checked-out"].includes(bookingStatus)) {
    return "Check-out Cleaning";
  }
  if (st === "cleaning_in_progress") return "Check-out Cleaning";
  return "Deep Cleaning";
}

export function isCompletedToday(task) {
  if (String(task?.status || "").toLowerCase() !== "completed") return false;
  const d = parseLooseDate(task?.updatedAt || task?.createdAt);
  if (!d) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function readAssignOverlay() {
  try {
    const raw = sessionStorage.getItem(ASSIGN_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

export function writeAssignOverlay(next) {
  try {
    sessionStorage.setItem(ASSIGN_KEY, JSON.stringify(next || {}));
  } catch {
    /* ignore quota */
  }
}

export function readLocalActivity() {
  try {
    const raw = sessionStorage.getItem(ACTIVITY_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function pushLocalActivity(entry) {
  const prev = readLocalActivity();
  const next = [
    {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      ...entry,
    },
    ...prev,
  ].slice(0, 40);
  try {
    sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function pickBestTask(matches) {
  const rank = { in_progress: 0, pending: 1, completed: 2 };
  if (!matches.length) return null;
  return [...matches].sort(
    (a, b) =>
      (rank[String(a.status || "").toLowerCase()] ?? 9) -
      (rank[String(b.status || "").toLowerCase()] ?? 9),
  )[0];
}

export function tasksForAsset(tasks, { targetType, id, number }) {
  const tid = String(id || "").trim();
  const num = String(number || "").trim().toLowerCase();
  const want = String(targetType || "").toLowerCase();
  return (Array.isArray(tasks) ? tasks : []).filter((t) => {
    if (String(t?.targetType || "").toLowerCase() !== want) return false;
    if (want === "room") {
      const trid = String(t?.room?.id || "").trim();
      const trn = String(t?.room?.roomNumber ?? "").trim().toLowerCase();
      return (tid && trid === tid) || (num && trn && trn === num);
    }
    const tvid = String(t?.eventVenue?.id || "").trim();
    const ten = String(t?.eventVenue?.eventNum ?? "").trim().toLowerCase();
    return (tid && tvid === tid) || (num && ten && ten === num);
  });
}

/** Map UI “Available” to API `ready` — rooms controller only accepts needs_cleaning | ready. */
export function toApiHousekeepingStatus(uiStatus) {
  const s = String(uiStatus || "").trim().toLowerCase();
  if (s === "available" || s === "ready") return "ready";
  if (s === "needs_cleaning") return "needs_cleaning";
  return s;
}

export function activityBadgeClass(label) {
  const s = String(label || "").toLowerCase();
  if (s.includes("progress")) return "fd-hk-act-badge fd-hk-act-badge--progress";
  if (s.includes("complet")) return "fd-hk-act-badge fd-hk-act-badge--done";
  if (s.includes("assign")) return "fd-hk-act-badge fd-hk-act-badge--assigned";
  if (s.includes("need")) return "fd-hk-act-badge fd-hk-act-badge--needs";
  return "fd-hk-act-badge";
}

export function staffDotClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "busy") return "fd-hk-staff-dot fd-hk-staff-dot--busy";
  if (s === "available") return "fd-hk-staff-dot fd-hk-staff-dot--available";
  return "fd-hk-staff-dot fd-hk-staff-dot--off";
}
