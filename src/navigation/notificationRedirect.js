/**
 * Role-aware routes when a user clicks a bell notification (no preview modal).
 */

export function normalizeMongoId(v) {
  if (v == null || v === "") return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "object" && v.$oid) return String(v.$oid).trim();
  if (typeof v === "object" && v._id != null) return normalizeMongoId(v._id);
  return String(v).trim();
}

/** @returns {"room"|"event"|""} */
export function inferBookingType(inputType, msg, detail) {
  const rawType = String(inputType || "").trim().toLowerCase();
  if (rawType === "room" || rawType === "event") return rawType;
  const hay = `${String(msg || "")} ${String(detail || "")}`.toLowerCase();
  if (hay.includes("event") || hay.includes("venue")) return "event";
  if (hay.includes("room")) return "room";
  return "";
}

/**
 * Front desk reservation screen for a booking-linked notification.
 * @param {{ bookingId?: string, bookingType?: string, msg?: string, detail?: string, message?: string }} n
 * @returns {string | null}
 */
export function getFrontdeskNotificationBookingPath(n) {
  const bookingId = normalizeMongoId(n?.bookingId);
  if (!bookingId) return null;

  const bookingType = inferBookingType(
    n?.bookingType,
    n?.msg || n?.message,
    n?.detail,
  );

  if (bookingType === "event") {
    return `/frontdesk-events?bookingId=${encodeURIComponent(bookingId)}`;
  }
  if (bookingType === "room") {
    return `/frontdesk-rooms?bookingId=${encodeURIComponent(bookingId)}`;
  }

  const hay = `${String(n?.msg || n?.message || "")} ${String(n?.detail || "")}`.toLowerCase();
  const isRoomNotif = hay.includes("room");
  const isEventNotif = hay.includes("event") || hay.includes("venue");

  if (isRoomNotif && isEventNotif) {
    return `/frontdesk-rooms?bookingId=${encodeURIComponent(bookingId)}`;
  }
  if (isRoomNotif) return `/frontdesk-rooms?bookingId=${encodeURIComponent(bookingId)}`;
  if (isEventNotif) return `/frontdesk-events?bookingId=${encodeURIComponent(bookingId)}`;

  return `/frontdesk-rooms?bookingId=${encodeURIComponent(bookingId)}`;
}

function resolveTaskId(n) {
  const direct = normalizeMongoId(n?.taskId);
  if (direct) return direct;
  const rawId = String(n?.id || "").trim();
  if (rawId.startsWith("inbox-")) {
    const inner = rawId.slice(6);
    if (/^[a-f0-9]{24}$/i.test(inner)) return inner;
  }
  if (/^[a-f0-9]{24}$/i.test(rawId) && !normalizeMongoId(n?.bookingId)) return rawId;
  return "";
}

function isEventContext(n, hay) {
  if (String(n?.targetType || "").toLowerCase() === "event") return true;
  return hay.includes("venue") || hay.includes("event");
}

/**
 * Resolve destination path for a notification click.
 * @param {object} n — bell row (pending booking, staff API, housekeeping task, etc.)
 * @param {"guest"|"admin"|"frontdesk"|"cashier"|"housekeeping"|string} role
 * @returns {string | null} in-app path, or null when the caller handles it (e.g. cashier POS state)
 */
export function getNotificationRedirectPath(n, role = "guest") {
  if (!n || typeof n !== "object") return null;

  const roleKey = String(role || "").toLowerCase();
  if (n.source === "menu" || n.source === "order") return null;

  const bookingId =
    normalizeMongoId(n.bookingId) || normalizeMongoId(n.booking?.id ?? n.booking?._id);
  const bookingType = inferBookingType(
    n.bookingType || n.booking?.type || n.bookingKind,
    n.msg || n.message,
    n.detail,
  );
  const hay = `${String(n.msg || "")} ${String(n.message || "")} ${String(n.detail || "")}`.toLowerCase();
  const notifType = String(n.type || n.notificationType || "").toLowerCase();

  const taskId = resolveTaskId(n);

  if (roleKey === "housekeeping" && taskId) {
    const eventTask = isEventContext(n, hay);
    return eventTask
      ? `/housekeeping-events?taskId=${encodeURIComponent(taskId)}`
      : `/housekeeping-rooms?taskId=${encodeURIComponent(taskId)}`;
  }

  if (bookingId) {
    switch (roleKey) {
      case "guest":
        return `/my-bookings/${encodeURIComponent(bookingId)}`;
      case "admin":
        if (bookingType === "event") {
          return `/admin-booking-management?tab=event&bookingId=${encodeURIComponent(bookingId)}`;
        }
        return `/admin-booking-management?tab=room&bookingId=${encodeURIComponent(bookingId)}`;
      case "frontdesk":
        return getFrontdeskNotificationBookingPath(n);
      case "housekeeping":
        if (bookingType === "event") {
          return `/housekeeping-events?bookingId=${encodeURIComponent(bookingId)}`;
        }
        return `/housekeeping-rooms?bookingId=${encodeURIComponent(bookingId)}`;
      default:
        break;
    }
  }

  if (roleKey === "admin") {
    if (hay.includes("menu") || hay.includes("dish") || hay.includes("restaurant")) {
      return "/admin-restaurant";
    }
    if (hay.includes("inventory") || hay.includes("stock")) return "/admin-inventory";
    if (hay.includes("attendance")) return "/admin-attendance";
    if (hay.includes("staff")) return "/admin-staff";
    if (hay.includes("venue") || hay.includes("event")) return "/admin-event-management";
    if (hay.includes("room") || notifType === "housekeeping_cleaning_completed") {
      return "/admin-room-management";
    }
    if (hay.includes("bill")) return "/admin-bills";
    return "/admin-booking-management";
  }

  if (roleKey === "frontdesk") {
    if (hay.includes("bill") || hay.includes("billing")) return "/frontdesk-bills";
    if (hay.includes("history")) return "/frontdesk-history";
    if (hay.includes("housekeeping") || hay.includes("cleaning")) return "/frontdesk-housekeeping";
    if (hay.includes("venue") || hay.includes("event")) return "/frontdesk-events";
    if (hay.includes("room")) return "/frontdesk-rooms";
    return "/frontdesk-dashboard";
  }

  if (roleKey === "guest") {
    return "/booking-history";
  }

  if (roleKey === "housekeeping") {
    if (isEventContext(n, hay)) return "/housekeeping-events";
    return "/housekeeping-rooms";
  }

  return null;
}
