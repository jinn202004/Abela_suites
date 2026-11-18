/**
 * Shared mapping: GET /api/restaurant-orders → order history table + bell notifications.
 * Keeps one shape so the topbar dropdown matches the table columns.
 */

export function formatRestaurantOrderDate(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "—";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  return `${dd}-${mm}-${yy}`;
}

function titleCaseStatus(s) {
  const t = String(s || "").trim().toLowerCase();
  if (!t) return "—";
  const labels = {
    pending: "Pending",
    accepted: "Accepted",
    preparing: "Preparing",
    ready: "Ready",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return labels[t] || t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * @param {object} o — one element from GET /api/restaurant-orders
 */
export function mapRestaurantOrderToHistoryRow(o) {
  const id = String(o.id ?? o._id ?? "");
  const guest = o.guest || {};
  const namePart =
    String(o.guestName || guest.displayName || guest.name || "").trim() ||
    String(guest.email || "").trim().split("@")[0] ||
    "";
  const emailPart = String(guest.email || "").trim();
  const customer = [namePart, emailPart].filter(Boolean).join(" · ") || "Guest";

  const total = Number(o.totalAmount) || 0;
  const received = Number(o.amountPaid) || 0;

  const pm = String(o.paymentMethod || "").toLowerCase();
  let payment = "Unpaid";
  let paymentKey = "unpaid";
  if (total <= 0 && received <= 0) {
    payment = "—";
    paymentKey = "none";
  } else if (total > 0 && received >= total - 1e-6) {
    if (pm === "cash") {
      payment = "Cash";
      paymentKey = "cash";
    } else if (pm === "gcash") {
      payment = "GCash";
      paymentKey = "gcash";
    } else {
      payment = "Paid";
      paymentKey = "paid";
    }
  } else if (received > 0) {
    payment = "Partial";
    paymentKey = "partial";
  } else if (pm === "cash") {
    payment = "Cash (Pending)";
    paymentKey = "unpaid";
  } else if (pm === "gcash") {
    payment = "GCash (Pending)";
    paymentKey = "unpaid";
  }

  const items = Array.isArray(o.items)
    ? o.items.map((line) => ({
        name: line.menuItemName || "Item",
        qty: line.quantity,
        price: Number(line.unitPrice ?? line.price) || 0,
      }))
    : [];

  const createdRaw = o.orderDate || o.createdAt || o.updatedAt;
  const created = createdRaw ? new Date(createdRaw) : new Date();

  return {
    id,
    number: id ? `RO-${id.slice(-6).toUpperCase()}` : "—",
    date: formatRestaurantOrderDate(created),
    timeLabel: created.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    dateSort: created.getTime(),
    customer,
    status: titleCaseStatus(o.status),
    statusRaw: String(o.status || "").toLowerCase(),
    total,
    received,
    payment,
    paymentKey,
    discount: "None",
    items,
    transactionId: String(o.transactionId || "").trim(),
    paymentDate: String(o.paymentDate || "").trim(),
    paymentProofData: String(o.paymentProofData || "").trim(),
    paymentProofName: String(o.paymentProofName || "").trim(),
    source: String(o.source || "").toLowerCase(),
  };
}

/**
 * Bell items: same facts as the table (number, customer, total, payment, status, date).
 * Guest online orders awaiting kitchen action stay unread until completed/cancelled.
 * @param {ReturnType<typeof mapRestaurantOrderToHistoryRow>[]} rows — newest first
 */
export function buildCashierOrderBellNotifications(rows, { max = 20 } = {}) {
  const fmt = (n) =>
    "₱" +
    Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isGuestActive = (row) =>
    row.source === "guest" && !["completed", "cancelled"].includes(row.statusRaw);

  const sorted = [...(Array.isArray(rows) ? rows : [])].sort((a, b) => {
    const aActive = isGuestActive(a);
    const bActive = isGuestActive(b);
    if (aActive !== bActive) return aActive ? -1 : 1;
    return (b.dateSort || 0) - (a.dateSort || 0);
  });

  return sorted.slice(0, max).map((row) => {
    const guestName = String(row.customer || "").split(" · ")[0].trim() || "Guest";
    const isGuest = row.source === "guest";
    const read = isGuest
      ? ["completed", "cancelled"].includes(row.statusRaw)
      : Number(row.total) > 0 && Number(row.received) >= Number(row.total) - 1e-6;

    return {
      id: `ro-${row.id}`,
      source: "order",
      orderId: row.id,
      orderSource: row.source,
      msg: isGuest ? `New online order · ${row.number}` : `${row.number} · ${row.customer}`,
      detail: isGuest
        ? `${guestName} · ${fmt(row.total)} · ${row.status}`
        : `${fmt(row.total)} · ${row.payment} · ${row.status}`,
      time: row.date,
      read,
    };
  });
}

/**
 * New-dish alerts (reference `menuItemId` in API; same catalog as admin/POS).
 * @param {object[]} apiNotifications — elements from GET /api/restaurant-menu-notifications
 */
export function mapRestaurantMenuNotificationsToBellItems(apiNotifications) {
  if (!Array.isArray(apiNotifications)) return [];
  return apiNotifications.map((n, idx) => {
    const id = String(n.id ?? "");
    const createdRaw = n.createdAt;
    const created = createdRaw ? new Date(createdRaw) : new Date();
    return {
      id: id ? `menu-${id}` : `menu-idx-${idx}`,
      source: "menu",
      notificationId: id,
      menuItemId: n.menuItemId != null ? String(n.menuItemId) : "",
      msg: String(n.message || "New dish added").trim() || "New dish added",
      detail: "Same menu catalog as admin · POS refreshes when you open this",
      time: formatRestaurantOrderDate(created),
      read: n.read === true,
    };
  });
}

/** Session line + new-dish alerts + restaurant rows (orders newest first after menu alerts). */
export function mergeCashierBellNotifications(sessionLine, rows, menuBellItems = []) {
  const base = sessionLine
    ? [
        {
          id: "session",
          msg: sessionLine.msg,
          detail: sessionLine.detail ?? "",
          time: sessionLine.time ?? "Session",
          read: true,
        },
      ]
    : [];
  const menu = Array.isArray(menuBellItems) ? menuBellItems : [];
  return [...base, ...menu, ...buildCashierOrderBellNotifications(rows)];
}
