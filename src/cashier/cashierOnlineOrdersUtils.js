import { formatRestaurantOrderDate } from "./cashierRestaurantOrdersUtils";

const STATUS_META = {
  pending: { label: "Pending", emoji: "🟡", key: "pending" },
  accepted: { label: "Accepted", emoji: "🔵", key: "accepted" },
  preparing: { label: "Preparing", emoji: "🟠", key: "preparing" },
  ready: { label: "Ready", emoji: "🟢", key: "ready" },
  completed: { label: "Completed", emoji: "✅", key: "completed" },
  cancelled: { label: "Cancelled", emoji: "🔴", key: "cancelled" },
};

export function getOnlineOrderStatusMeta(statusRaw) {
  const key = String(statusRaw || "pending").trim().toLowerCase();
  return STATUS_META[key] || { label: key || "—", emoji: "", key: key || "pending" };
}

function paymentFromOrder(o) {
  const total = Number(o.totalAmount) || 0;
  const received = Number(o.amountPaid) || 0;
  const pm = String(o.paymentMethod || "").toLowerCase();

  if (total <= 0 && received <= 0) return { payment: "—", paymentKey: "none" };
  if (total > 0 && received >= total - 1e-6) {
    if (pm === "cash") return { payment: "Cash", paymentKey: "cash" };
    if (pm === "gcash") return { payment: "GCash", paymentKey: "gcash" };
    return { payment: "Paid", paymentKey: "paid" };
  }
  if (received > 0) return { payment: "Partial", paymentKey: "partial" };
  if (pm === "cash") return { payment: "Cash (Pending)", paymentKey: "unpaid" };
  if (pm === "gcash") return { payment: "GCash (Pending)", paymentKey: "unpaid" };
  return { payment: "Unpaid", paymentKey: "unpaid" };
}

/**
 * @param {object} o — one element from GET /api/restaurant-orders (source=guest)
 */
export function mapOnlineGuestOrderRow(o) {
  const id = String(o.id ?? o._id ?? "");
  const guest = o.guest || {};
  const guestName =
    String(o.guestName || guest.displayName || guest.name || "").trim() ||
    String(guest.email || "").trim().split("@")[0] ||
    "Guest";
  const roomNumber = String(o.roomNumber || guest.roomNumber || "").trim() || "—";
  const bookingId = String(o.bookingId || guest.bookingId || "").trim();
  const guestPhone = String(o.guestPhone || guest.phone || "").trim() || "—";

  const createdRaw = o.orderDate || o.createdAt || o.updatedAt;
  const created = createdRaw ? new Date(createdRaw) : new Date();
  const items = Array.isArray(o.items) ? o.items : [];
  const itemCount = items.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  const statusRaw = String(o.status || "pending").toLowerCase();
  const statusMeta = getOnlineOrderStatusMeta(statusRaw);
  const { payment, paymentKey } = paymentFromOrder(o);

  return {
    id,
    number: id ? `RO-${id.slice(-6).toUpperCase()}` : "—",
    guestName,
    roomNumber,
    bookingId,
    guestPhone,
    date: formatRestaurantOrderDate(created),
    dateTimeLabel: `${formatRestaurantOrderDate(created)} · ${created.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    })}`,
    timeLabel: created.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    dateSort: created.getTime(),
    itemCount,
    total: Number(o.totalAmount) || 0,
    received: Number(o.amountPaid) || 0,
    subtotal: Number(o.subtotal) || 0,
    serviceCharge: Number(o.serviceCharge) || 0,
    taxAmount: Number(o.taxAmount) || 0,
    payment,
    paymentKey,
    status: statusMeta.label,
    statusRaw,
    statusEmoji: statusMeta.emoji,
    statusKey: statusMeta.key,
    items: items.map((line) => ({
      menuItemId: line.menuItemId ? String(line.menuItemId) : "",
      name: line.menuItemName || "Item",
      qty: Number(line.quantity) || 0,
      price: Number(line.unitPrice ?? line.price) || 0,
      specialInstructions: String(line.specialInstructions || "").trim() || "—",
      imageUrl: String(line.imageUrl || "").trim(),
    })),
    transactionId: String(o.transactionId || "").trim(),
    paymentDate: String(o.paymentDate || "").trim(),
    paymentProofData: String(o.paymentProofData || "").trim(),
    paymentProofName: String(o.paymentProofName || "").trim(),
    source: String(o.source || "guest").toLowerCase(),
  };
}

/** Count guest online orders still awaiting completion (pending → ready). */
export function countPendingOnlineOrders(orders) {
  const pendingStatuses = new Set(["pending", "accepted", "preparing", "ready"]);
  return (Array.isArray(orders) ? orders : []).filter((o) => {
    const source = String(o?.source || "").toLowerCase();
    const status = String(o?.status || "").toLowerCase();
    return source === "guest" && pendingStatuses.has(status);
  }).length;
}
