/**
 * Resolve the guest-visible room number for a room booking.
 * Prefer stored `roomNumber` on the booking; else match `roomId` to the catalog.
 */
export function looksLikeMongoObjectId(s) {
  return typeof s === "string" && /^[a-f0-9]{24}$/i.test(s.trim());
}

export function buildRoomIdToNumberMap(catalog) {
  const m = new Map();
  for (const r of catalog || []) {
    const id = String(r.id ?? "").trim();
    if (!id) continue;
    m.set(id, String(r.roomNumber ?? "").trim());
  }
  return m;
}

/** Map venue document id → catalog `eventNum` (e.g. EV-001). */
export function buildEventVenueIdToEventNumMap(venues) {
  const m = new Map();
  for (const v of venues || []) {
    const id = String(v.id ?? "").trim();
    if (!id) continue;
    m.set(id, String(v.eventNum ?? "").trim());
  }
  return m;
}

/** Map venue document id → display name (catalog). */
export function buildEventVenueIdToNameMap(venues) {
  const m = new Map();
  for (const v of venues || []) {
    const id = String(v.id ?? "").trim();
    if (!id) continue;
    const name = String(v.name ?? v.title ?? "").trim();
    if (name) m.set(id, name);
  }
  return m;
}

/**
 * Venue column: booking snapshot first, then catalog lookup by eventVenueId.
 * @param {object|null} booking
 * @param {Map<string,string>|null|undefined} venueIdToName
 */
export function eventVenueNameFromBooking(booking, venueIdToName) {
  if (!booking) return "—";
  const snap = String(booking.venueName ?? "").trim();
  if (snap) return snap;
  const vid = String(booking.eventVenueId ?? "").trim();
  if (vid && venueIdToName instanceof Map && venueIdToName.has(vid)) {
    const n = String(venueIdToName.get(vid) || "").trim();
    if (n) return n;
  }
  return "—";
}

export function getBookingRoomNumber(booking, roomIdToNumber) {
  if (!booking) return "";
  const stored = String(booking.roomNumber ?? "").trim();
  if (stored && !looksLikeMongoObjectId(stored)) return stored;
  if (stored && looksLikeMongoObjectId(stored) && roomIdToNumber?.has(stored)) {
    const n = roomIdToNumber.get(stored);
    return n ? String(n).trim() : "";
  }
  const rid = String(booking.roomId ?? "").trim();
  if (rid && roomIdToNumber && roomIdToNumber.has(rid)) {
    const n = roomIdToNumber.get(rid);
    return n ? String(n).trim() : "";
  }
  return "";
}

/**
 * Normalize room codes to one table shape: `RM-###` (3-digit suffix), e.g. RM01 → RM-001.
 */
function normalizeRmTableCode(raw) {
  const s = String(raw ?? "").trim();
  if (!s || s === "—") return "—";
  const mHyphen = s.match(/^rm-(\d+)$/i);
  if (mHyphen) return `RM-${mHyphen[1].slice(-3).padStart(3, "0")}`;
  const mCompact = s.match(/^rm(\d+)$/i);
  if (mCompact) return `RM-${mCompact[1].slice(-3).padStart(3, "0")}`;
  const digits = s.replace(/\D/g, "");
  if (digits) return `RM-${digits.slice(-3).padStart(3, "0")}`;
  return "—";
}

/**
 * Room "Number" column for API booking objects (catalog / snapshot + optional `roomFromTitleSplit` e.g. RM01 from title).
 */
export function formatRoomTableNumber(booking, roomIdToNumber, roomFromTitleSplit) {
  if (!booking) return "—";
  const ridMap = roomIdToNumber instanceof Map ? roomIdToNumber : new Map();
  let displayRoom = getBookingRoomNumber(booking, ridMap);
  const rawRn = String(booking.roomNumber || "").trim();
  if (!displayRoom && rawRn && !looksLikeMongoObjectId(rawRn)) displayRoom = rawRn;
  const extra =
    roomFromTitleSplit != null &&
    String(roomFromTitleSplit).trim() !== "" &&
    String(roomFromTitleSplit) !== "—"
      ? String(roomFromTitleSplit).trim()
      : "";
  if (!displayRoom && extra) displayRoom = extra;
  if (!displayRoom || looksLikeMongoObjectId(String(displayRoom))) {
    const id = bookingMongoIdString(booking);
    if (id && looksLikeMongoObjectId(id)) {
      const n = Number.parseInt(id.slice(-6), 16) % 1000;
      return `RM-${String(n).padStart(3, "0")}`;
    }
    return "—";
  }
  return normalizeRmTableCode(displayRoom);
}

/** Format stored/demo `number` / `roomno` fields to `RM-###`. */
export function formatStoredRoomNumberForDisplay(stored) {
  const s = String(stored ?? "").trim();
  if (!s || s === "—") return "—";
  return normalizeRmTableCode(s);
}

/**
 * Extract a numeric display from an event code (e.g. "EV-001" → "1", "002" → "2").
 */
function digitsFromEventCode(code) {
  const s = String(code ?? "").trim();
  const parts = s.match(/\d+/g);
  if (!parts || !parts.length) return "";
  const last = parts[parts.length - 1];
  return String(parseInt(last, 10));
}

/**
 * Stable numeric ref when only a Mongo venue id is known (no catalog).
 */
function numericFingerprintFromObjectId(vid) {
  if (!looksLikeMongoObjectId(vid)) return "";
  const n = Number.parseInt(String(vid).trim().slice(-8), 16) % 1000000;
  return String(n);
}

/** Booking document id as string (handles `{ $oid }` from some APIs). */
function bookingMongoIdString(booking) {
  if (!booking || typeof booking !== "object") return "";
  const raw = booking.id != null ? booking.id : booking._id;
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object" && raw.$oid) return String(raw.$oid).trim();
  return String(raw).trim();
}

/**
 * Normalize event/venue codes to one table shape: `EV-###` (3-digit suffix), matching backend `eventNum` style.
 */
function normalizeEvTableCode(raw) {
  const s = String(raw ?? "").trim();
  if (!s || s === "—") return "—";
  const ev = s.match(/^ev-(\d+)$/i);
  if (ev) return `EV-${ev[1].slice(-3).padStart(3, "0")}`;
  const digits = s.replace(/\D/g, "");
  if (digits) {
    const tail = digits.slice(-3);
    return `EV-${tail.padStart(3, "0")}`;
  }
  return "—";
}

/**
 * Consistent event Number column for API booking objects (matches catalog `eventNum` when available).
 */
export function formatEventTableNumber(booking, venueIdToEventNum) {
  if (!booking) return "—";
  const vid = String(booking.eventVenueId ?? "").trim();
  if (venueIdToEventNum instanceof Map && vid && venueIdToEventNum.has(vid)) {
    const code = String(venueIdToEventNum.get(vid) || "").trim();
    if (code) return normalizeEvTableCode(code);
  }
  const emb = String(booking.eventNum ?? "").trim();
  if (emb) return normalizeEvTableCode(emb);

  const legacy = getEventDisplayCode(booking, venueIdToEventNum);
  if (legacy && legacy !== "—") return normalizeEvTableCode(legacy);

  const id = bookingMongoIdString(booking);
  if (id && looksLikeMongoObjectId(id)) {
    const n = Number.parseInt(id.slice(-6), 16) % 1000;
    return `EV-${String(n).padStart(3, "0")}`;
  }
  if (id) {
    const d = id.replace(/\D/g, "");
    if (d) return normalizeEvTableCode(d);
  }
  return "—";
}

/**
 * Format a stored reservation `number` field (demo rows or legacy values) to the same `EV-###` shape.
 */
export function formatStoredEventNumberForDisplay(stored) {
  const s = String(stored ?? "").trim();
  if (!s || s === "—") return "—";
  return normalizeEvTableCode(s);
}

/**
 * Package column for events: venue name (e.g. Mini Sky Bar), not the guest event title.
 * Room/event codes appear in the Number column.
 * @param {string} _displayCode kept for call-site compatibility; not shown in the label
 * @param {string} [eventTitle] fallback when venue is unknown (e.g. legacy rows)
 * @param {string} [venueName] resolved venue label or snapshot from the booking
 */
export function formatEventPackageWithNumber(_displayCode, eventTitle, venueName) {
  const rawVenue = String(venueName ?? "").trim();
  const venue = rawVenue && rawVenue !== "—" ? rawVenue : "";
  const title = String(eventTitle ?? "").trim();
  return String(venue || title || "Event").trim() || "Event";
}

/**
 * Package column for room bookings: room name/title only (room code is in the Number column).
 */
export function formatRoomPackageWithNumber(_roomNo, roomTitle) {
  return String(roomTitle || "Room").trim() || "Room";
}

/**
 * Reserved Guest list: after check-in (occupied) or check-out, show only the package title
 * (e.g. `Single Suites`), not `1 · Single Suites`.
 */
export function packageLabelForReservedGuestRow(formattedPackage, status) {
  const st = String(status || "").toLowerCase();
  if (st !== "occupied" && st !== "checked-out") return formattedPackage;
  const s = String(formattedPackage ?? "").trim();
  const idx = s.indexOf("·");
  if (idx === -1) return s;
  return s.slice(idx + 1).trim() || s;
}

/**
 * "Number" column for events: always numeric-ish — catalog `eventNum`, digits from a code string, or a numeric fingerprint.
 * Never venue names (e.g. "Mini Sky Bar").
 * If `eventVenueId` is missing, uses a fingerprint from the booking id so the column is never empty when the booking exists in DB.
 * @param {object} booking
 * @param {Map<string,string>|null} [venueIdToEventNum]
 */
export function getEventDisplayCode(booking, venueIdToEventNum) {
  if (!booking) return "—";
  const vid = String(booking.eventVenueId ?? "").trim();
  if (!vid) {
    const bid = bookingMongoIdString(booking);
    if (bid && looksLikeMongoObjectId(bid)) return numericFingerprintFromObjectId(bid);
    return "—";
  }

  if (venueIdToEventNum instanceof Map && venueIdToEventNum.has(vid)) {
    const code = String(venueIdToEventNum.get(vid) || "").trim();
    const fromCat = digitsFromEventCode(code);
    if (fromCat) return fromCat;
    const onlyDigits = code.replace(/\D/g, "");
    if (onlyDigits) return String(parseInt(onlyDigits, 10));
  }

  if (!looksLikeMongoObjectId(vid)) {
    const fromVid = digitsFromEventCode(vid);
    if (fromVid) return fromVid;
  }

  if (looksLikeMongoObjectId(vid)) {
    return numericFingerprintFromObjectId(vid);
  }

  return "—";
}

/**
 * Event "Number" column — same as {@link formatEventTableNumber} (`EV-###`).
 */
export function eventNumberColumn(booking, venueIdToEventNum) {
  return formatEventTableNumber(booking, venueIdToEventNum);
}

/**
 * Prefer each booking's own name/email/phone/address on the reservation.
 * The linked `guest` profile is shared when emails match — showing guest.* first
 * makes separate bookings look like duplicates.
 */
export function bookingCustomerDisplayName(b) {
  const g = b && b.guest ? b.guest : {};
  const snap = String(b?.customerName ?? "").trim();
  if (snap) return snap;
  return String(g.displayName ?? "").trim() || "—";
}

export function bookingEmailDisplay(b) {
  const g = b && b.guest ? b.guest : {};
  const snap = String(b?.email ?? "").trim();
  if (snap) return snap;
  return String(g.email ?? "").trim() || "—";
}

export function bookingPhoneDisplay(b) {
  const g = b && b.guest ? b.guest : {};
  const snap = String(b?.contactNumber ?? "").trim();
  if (snap) return snap;
  return String(g.phone ?? "").trim() || "—";
}

export function bookingAddressDisplay(b) {
  const g = b && b.guest ? b.guest : {};
  const snap = String(b?.address ?? "").trim();
  if (snap) return snap;
  return String(g.address ?? "").trim() || "—";
}
