/**
 * Builds multi-line detail rows for the guest bell dropdown (API may include `booking`).
 * @param {Record<string, unknown>} n — one notification from GET /api/users/me/notifications
 * @returns {string[]}
 */
export function buildGuestNotificationDetailLines(n) {
  if (!n || typeof n !== "object") return [];
  const lines = [];

  const typeLabel =
    n.type === "booking_approved"
      ? "Decision: Approved"
      : n.type === "booking_rejected"
        ? "Decision: Rejected"
        : n.type
          ? `Type: ${String(n.type).replace(/_/g, " ")}`
          : "";
  if (typeLabel) lines.push(typeLabel);

  if (n.bookingId) lines.push(`Booking ID: ${n.bookingId}`);

  const b = n.booking;
  if (b && typeof b === "object") {
    if (b.customerName) lines.push(`Guest on booking: ${b.customerName}`);
    if (b.email) lines.push(`Booking email: ${b.email}`);
    if (b.contactNumber) lines.push(`Booking mobile: ${b.contactNumber}`);
    if (b.address) lines.push(`Booking address: ${b.address}`);

    if (String(b.type) === "room") {
      const roomBits = [b.roomTitle, b.roomNumber ? `Room ${b.roomNumber}` : "", b.roomId ? `Catalog ID ${b.roomId}` : ""]
        .filter(Boolean)
        .join(" · ");
      if (roomBits) lines.push(`Room: ${roomBits}`);
      if (b.checkIn || b.checkOut) lines.push(`Stay: ${b.checkIn || "—"} → ${b.checkOut || "—"}`);
    } else if (String(b.type) === "event") {
      const ev = [b.eventTitle, b.venueName].filter(Boolean).join(" · ");
      if (ev) lines.push(`Event: ${ev}`);
      if (b.eventDate) {
        let when = b.eventDate;
        if (b.eventEndDate) when = `${when} – ${b.eventEndDate}`;
        lines.push(`Event dates: ${when}`);
      }
      if (b.timeSlot) lines.push(`Time slot: ${b.timeSlot}`);
      if (Number.isFinite(Number(b.expectedPax)) && Number(b.expectedPax) > 0) {
        lines.push(`Expected guests: ${b.expectedPax}`);
      }
      if (b.venuePrice) lines.push(`Venue price (ref.): ${b.venuePrice}`);
    }

    if (b.status) lines.push(`Booking status: ${b.status}`);
    if (b.totalAmount) lines.push(`Total amount: ${b.totalAmount}`);
    if (b.paymentAmount) lines.push(`Payment recorded: ${b.paymentAmount}`);
    if (b.paymentMethod) lines.push(`Payment method: ${b.paymentMethod}`);
    if (b.transactionId) lines.push(`Transaction / ref: ${b.transactionId}`);
    if (b.additionalRequests) lines.push(`Special requests: ${b.additionalRequests}`);
    if (String(n.type) === "booking_rejected" && b.declineReason) {
      lines.push(`Decline reason: ${b.declineReason}`);
    }
  }

  return lines;
}
