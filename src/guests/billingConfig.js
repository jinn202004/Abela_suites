/**
 * Hotel billing rates — adjust here to change how guest-facing totals are computed.
 */
export const BILLING_CONFIG = {
  /** VAT applied on subtotal + service charge (0 = hidden from guest bills) */
  VAT_RATE: 0,
  /** Service charge on room/event subtotal (0 = hidden from guest bills) */
  SERVICE_FEE_RATE: 0,
  /** Minimum down payment as a fraction of grand total */
  MINIMUM_DOWN_PAYMENT_RATE: 0.3,
  /** Per extra guest per night (beyond room package capacity) */
  ROOM_EXTRA_GUEST_FEE_PER_NIGHT: 500,
  /** Per attendee over venue listed capacity */
  EVENT_EXTRA_PAX_FEE: 250,
}
