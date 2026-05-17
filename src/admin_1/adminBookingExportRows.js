import { fetchBookingsBackend, fetchRoomsCatalog } from "../api/guestApi";
import {
  bookingAddressDisplay,
  bookingCustomerDisplayName,
  bookingEmailDisplay,
  bookingPhoneDisplay,
  buildRoomIdToNumberMap,
  formatRoomTableNumber,
} from "../guests/bookingRoomDisplay";

function parseMoneyStr(v) {
  if (v == null || v === "") return 0;
  const n = Number(
    String(v)
      .replace(/^\s*PHP\s*/i, "")
      .replace(/[₱,\s]/g, ""),
  );
  return Number.isFinite(n) ? n : 0;
}

function fmtPeso(n) {
  if (!Number.isFinite(n)) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function statusToBadgeLabel(st) {
  const k = String(st || "").toLowerCase();
  if (k === "approved" || k === "confirmed") return "Approved";
  if (k === "pending") return "Pending Approval";
  if (k === "rejected" || k === "declined") return "Rejected";
  if (k === "cancelled") return "Cancelled";
  if (k === "completed") return "Completed";
  return st || "Pending Approval";
}

function formatBookingPaymentDate(iso) {
  const s = String(iso || "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

function mapRoomBookingRow(b, roomIdToNumber) {
  const total = parseMoneyStr(b.totalAmount);
  let down = parseMoneyStr(b.paymentAmount);
  if (total > 0 && down > total) down = total;
  const bal = Math.max(0, total - down);
  const ridMap = roomIdToNumber instanceof Map ? roomIdToNumber : new Map();
  const num = formatRoomTableNumber(b, ridMap);
  return {
    sortDate: b.checkIn || b.updatedAt || "",
    number: num,
    type: b.roomTitle || "Room",
    customer: bookingCustomerDisplayName(b),
    price: fmtPeso(total),
    checkin: b.checkIn || "—",
    checkout: b.checkOut || "—",
    status: statusToBadgeLabel(b.status),
    downpayment: fmtPeso(down),
    balance: fmtPeso(bal),
    contact: bookingPhoneDisplay(b),
    email: bookingEmailDisplay(b),
    address: bookingAddressDisplay(b),
    requests: b.additionalRequests || "",
    refnum: String(b.id),
    bookingId: String(b.id || ""),
    amountpaid: fmtPeso(down),
    paydate:
      b.paymentDate && String(b.paymentDate).trim()
        ? formatBookingPaymentDate(b.paymentDate)
        : b.updatedAt
          ? new Date(b.updatedAt).toLocaleDateString("en-PH")
          : "",
    transid: b.transactionId || "",
    guestcount: String(b.additionalGuests ?? 0),
    paymentMethod: b.paymentMethod || "",
    paymethod: b.paymentMethod || "",
    paymentProofData: "",
  };
}

function mapEventBookingRow(b) {
  const total = parseMoneyStr(b.venuePrice) || parseMoneyStr(b.totalAmount);
  let down = parseMoneyStr(b.paymentAmount);
  if (total > 0 && down > total) down = total;
  const bal = Math.max(0, total - down);
  return {
    sortDate: b.eventDate || b.eventEndDate || b.updatedAt || "",
    customer: bookingCustomerDisplayName(b),
    event: b.eventTitle || b.venueName || "Event",
    checkin: b.eventDate || "—",
    checkout: b.eventEndDate || b.eventDate || "—",
    downpayment: fmtPeso(down),
    balance: fmtPeso(bal),
    price: fmtPeso(total),
    status: statusToBadgeLabel(b.status),
    contact: bookingPhoneDisplay(b),
    email: bookingEmailDisplay(b),
    timeslot: b.timeSlot || "",
    attendees: String(b.expectedPax ?? ""),
    requests: b.additionalRequests || "",
    refnum: String(b.id),
    bookingId: String(b.id || ""),
    amountpaid: fmtPeso(down),
    paydate:
      b.paymentDate && String(b.paymentDate).trim()
        ? formatBookingPaymentDate(b.paymentDate)
        : b.updatedAt
          ? new Date(b.updatedAt).toLocaleDateString("en-PH")
          : "",
    transid: b.transactionId || "",
    paymentMethod: b.paymentMethod || "",
    paymethod: b.paymentMethod || "",
    paymentProofData: "",
  };
}

/** Load all room/event reservation rows for admin export (same shape as Booking Management print). */
export async function loadBookingExportRows(signal) {
  const [bookings, rooms] = await Promise.all([
    fetchBookingsBackend(),
    fetchRoomsCatalog(),
  ]);
  const roomIdToNumber = buildRoomIdToNumberMap(Array.isArray(rooms) ? rooms : []);
  const roomRows = [];
  const eventRows = [];
  for (const b of Array.isArray(bookings) ? bookings : []) {
    if (signal?.aborted) break;
    const type = String(b.type || "").toLowerCase();
    if (type === "event") eventRows.push(mapEventBookingRow(b));
    else roomRows.push(mapRoomBookingRow(b, roomIdToNumber));
  }
  return { roomRows, eventRows };
}
