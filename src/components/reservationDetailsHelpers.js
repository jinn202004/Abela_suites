/**
 * Staff “Add charges” appends segments like `Label (₱12.34)` or `Label ×2 (₱24.68)`, joined with `"; "`.
 * Other text (e.g. guest requests) stays as note segments without a `(₱…)` tail.
 * @returns {{ charges: Array<{ label: string, amount: number }>, notes: string[] }}
 */
export function parseAdditionalRequestChargeLines(addreqRaw) {
  const raw = String(addreqRaw ?? "").trim();
  if (!raw || /^n\/a$/i.test(raw)) return { charges: [], notes: [] };
  const segments = raw.split(/;\s*/).map((s) => s.trim()).filter(Boolean);
  const charges = [];
  const notes = [];
  const chargeRe = /^(.+?)\s*\(\s*₱\s*([\d,]+\.?\d*)\s*\)\s*$/;
  for (const seg of segments) {
    const m = seg.match(chargeRe);
    if (m) {
      const label = m[1].trim();
      const n = Number(String(m[2]).replace(/,/g, ""));
      if (label && Number.isFinite(n)) charges.push({ label, amount: n });
      else notes.push(seg);
    } else {
      notes.push(seg);
    }
  }
  return { charges, notes };
}

/** Data URL or absolute http(s) image URL for payment proof. */
export function paymentProofImageSrc(source) {
  const s = String(source ?? "").trim();
  if (!s) return null;
  if (s.startsWith("data:image")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return null;
}

export function paymentProofFromBooking(booking) {
  if (!booking || typeof booking !== "object") return null;
  return paymentProofImageSrc(booking.paymentProofData);
}

export function paymentMethodDisplayLabel(booking) {
  if (!booking || typeof booking !== "object") return "—";
  const m = String(booking.paymentMethod ?? booking.paymentType ?? "").trim();
  return m || "—";
}

/**
 * Short status line for the reservation details header (not a legal payment state machine).
 */
export function derivePaymentStatusLine(booking, proofSrc) {
  if (!booking || typeof booking !== "object") return "—";
  const pm = String(booking.paymentMethod ?? booking.paymentType ?? "").toLowerCase();
  const tx = String(booking.transactionId ?? booking.paymentTransactionId ?? "").trim();
  const cashish = pm.includes("cash") && !pm.includes("gcash");
  if (cashish) {
    return proofSrc ? "Cash — receipt on file" : "Cash — pay at property";
  }
  if (proofSrc) return "Payment proof received";
  if (tx) return "Awaiting payment proof";
  if (pm.includes("gcash") || pm.includes("paymaya") || pm.includes("maya")) return "E-wallet — add proof if paid online";
  return "—";
}
