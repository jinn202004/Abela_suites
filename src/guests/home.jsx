import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TopbarUserIcon } from "../frontdesks/frontdeskTopbarIcons";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import {
  fetchBookingsBackend,
  fetchBookingByIdBackend,
  patchBookingBackend,
  fetchRoomsCatalog,
  fetchEventVenuesBackend,
  GUEST_BOOKINGS_STORAGE_PING_KEY,
} from "../api/guestApi";
import {
  buildRoomIdToNumberMap,
  buildEventVenueIdToEventNumMap,
  buildEventVenueIdToNameMap,
  eventNumberColumn,
  eventVenueNameFromBooking,
  formatRoomTableNumber,
  getBookingRoomNumber,
  looksLikeMongoObjectId,
  bookingCustomerDisplayName,
  bookingEmailDisplay,
  bookingPhoneDisplay,
} from "./bookingRoomDisplay";
import { getBackendBaseURL, backendUrl } from "../api/config";
import { getStoredAuthToken, clearStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { useGuestTopbarNotifications } from "./useGuestTopbarNotifications";
import { resolveGuestIdImageSrc } from "./guestBookingIdPhoto";
import GuestSidebar from "./GuestSidebar";
import { GuestArchiveIcon } from "./guestArchiveIcon";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
import { Modal } from "../components/Modal";
import { ReservationProofPreview } from "../components/ReservationProofPreview";
import {
  derivePaymentStatusLine,
  parseAdditionalRequestChargeLines,
  paymentMethodDisplayLabel,
  paymentProofFromBooking,
} from "../components/reservationDetailsHelpers";
import "../components/reservation-details-modal.css";
import "./idUploadedCard.css";
import "./home.css";

// --- Icons ---
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const RoomIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z" />
  </svg>
);
const EventIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const navItems = [
  { label: "Homepage", icon: <HomeIcon />, href: "/home", active: true },
  { label: "Rooms", icon: <RoomIcon />, href: "/rooms" },
  { label: "Event Venues", icon: <EventIcon />, href: "/event-venues" },
  { label: "Archive", icon: <GuestArchiveIcon />, href: "/booking-history" },
  { label: "Settings", icon: <SettingsIcon />, href: "/settings" },
];

/** Shown only when GET /api/rooms is empty or unreachable (read-only fallback; no DB writes). */
const FALLBACK_DEAL_SLIDES = [
  "https://i.huffpost.com/gen/1737520/original.jpg",
  "https://www.italianbark.com/wp-content/uploads/2018/01/hotel-room-design-trends-italianbark-interior-design-blog.jpg",
  "https://i.pinimg.com/originals/9e/a9/6c/9ea96c499272ddd30411b24338d90086.jpg",
  "https://victoriahotel.co.uk/sites/default/files/2022-09/bc-victoria-accom_standard-single-room-301-at-victoria-hotel.jpg",
  "https://www.hotelmonterey.co.jp/upload_file/monhtyo/stay/sng_600_001.jpg",
  "https://media.hotel7dublin.com/image/upload/f_auto,g_auto,c_auto,w_3840,q_auto/v1708602193/Uploads/Hotel7/Double_and_Single_Room_Hero_b5d513c9d6.jpg",
  "http://bluerabbit-hotel.com/wp-content/uploads/2016/10/TL7_4966.jpg",
  "https://www.ahstatic.com/photos/b801_rod2c_00_p_1024x768.jpg",
  "/deal-9-bedroom.png",
];

const DEAL_PLACEHOLDER_IMG =
  "https://placehold.co/960x600/f5f0e8/b8922a?text=Abela+Suites";

/** Matches carousel transform: three slides visible per “page” / dot. */
const SLIDES_PER_DOT = 3;

function resolveRoomCatalogImageSrc(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return DEAL_PLACEHOLDER_IMG;
  if (/^https?:\/\//i.test(s) || s.startsWith("data:") || s.startsWith("blob:")) return s;
  const path = s.startsWith("/") ? s : `/${s}`;
  return backendUrl(path);
}

function sortKeyRoomNumber(n) {
  const v = parseInt(String(n).replace(/\D/g, ""), 10);
  return Number.isNaN(v) ? 99999 : v;
}

/**
 * Maps public room catalog rows to carousel slides (read-only).
 * Newer `updatedAt` first so recently added/edited rooms surface in the deals strip.
 */
function catalogRoomsToDealSlides(rooms) {
  const list = Array.isArray(rooms) ? rooms : [];
  const sorted = [...list].sort((a, b) => {
    const ta = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return sortKeyRoomNumber(a?.roomNumber) - sortKeyRoomNumber(b?.roomNumber);
  });
  return sorted.map((r) => {
    const src = resolveRoomCatalogImageSrc(r?.image);
    const label =
      [String(r?.package ?? "").trim(), String(r?.roomNumber ?? "").trim()].filter(Boolean).join(" · ") || "Room";
    return { src, alt: `${label} — Abela Suites` };
  });
}

function padDealSlidesToMultiple(slides, groupSize) {
  if (!Array.isArray(slides) || slides.length === 0) return slides;
  const rem = slides.length % groupSize;
  if (rem === 0) return slides;
  const need = groupSize - rem;
  const pad = Array.from({ length: need }, (_, i) => ({
    src: DEAL_PLACEHOLDER_IMG,
    alt: `Abela Suites — more offers (${i + 1})`,
  }));
  return [...slides, ...pad];
}

function fallbackDealSlideObjects() {
  return FALLBACK_DEAL_SLIDES.map((src, i) => ({
    src,
    alt: `Abela Suites — inspiration ${i + 1}`,
  }));
}

function parseMoney(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** List vs detail APIs may return ids as strings or object-shaped ids — normalize for comparison. */
function bookingDetailIdsEqual(a, b) {
  if (a == null || b == null) return false;
  return String(a).trim() === String(b).trim();
}

function formatPeso(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Modal / mock style: whole pesos without “.00”, otherwise two decimals. */
function formatPesoModal(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  const whole = Math.abs(n - Math.round(n)) < 1e-6;
  return `₱${n.toLocaleString("en-PH", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  })}`;
}

function roomDetailDisplayNumber(booking, roomIdToNumber) {
  if (!booking) return "—";
  const raw = getBookingRoomNumber(booking, roomIdToNumber);
  if (raw && !looksLikeMongoObjectId(String(raw).trim())) {
    const n = parseInt(String(raw).replace(/\D/g, ""), 10);
    if (Number.isFinite(n) && n > 0) return String(n);
    const t = String(raw).trim();
    if (t) return t;
  }
  const code = formatRoomTableNumber(booking, roomIdToNumber);
  if (!code || code === "—") return "—";
  const m = code.match(/^RM-0*(\d+)$/i);
  if (m) return String(parseInt(m[1], 10));
  const digits = code.replace(/\D/g, "");
  if (digits) return String(parseInt(digits, 10));
  return code;
}

function formatPaymentDateDisplay(v) {
  if (v == null || v === "") return "—";
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return s;
}

function formatNumTable(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function normStatus(s) {
  return String(s || "pending").toLowerCase();
}

function statusBadgeClass(s) {
  const k = normStatus(s);
  if (k === "approved" || k === "confirmed" || k === "completed") return "approved";
  if (k === "declined" || k === "rejected" || k === "cancelled") return "declined";
  if (k === "occupied") return "occupied";
  return "pending";
}

function statusTableLabel(raw) {
  const k = normStatus(raw);
  if (k === "confirmed") return "Confirmed";
  if (k === "approved") return "Approved";
  if (k === "pending") return "Pending";
  if (k === "occupied") return "Occupied";
  if (k === "declined" || k === "rejected") return k === "rejected" ? "Rejected" : "Declined";
  if (k === "cancelled") return "Cancelled";
  if (k === "completed") return "Completed";
  return raw ? String(raw).charAt(0).toUpperCase() + String(raw).slice(1).toLowerCase() : "—";
}

function matchesGuestEmail(rowEmail, filter) {
  if (!filter) return false;
  const row = String(rowEmail || "").trim().toLowerCase();
  const want = String(filter).trim().toLowerCase();
  return row === want;
}

function reservationGuestEmail(r) {
  return r?.email ?? r?.customerEmail ?? "";
}

function eventGuestEmail(e) {
  return e?.email ?? e?.customerEmail ?? "";
}

function roomBookingMoneyForDisplay(r) {
  const total =
    parseMoney(r.totalAmount) ?? parseMoney(r.totalStayAmount) ?? parseMoney(r.roomTotal) ?? 0;
  let down = parseMoney(r.paymentAmount) ?? parseMoney(r.minimumDownPayment) ?? 0;
  if (Number.isFinite(total) && total > 0 && Number.isFinite(down) && down > total) down = total;
  return { total, down, balance: Math.max(0, total - down) };
}

/** Modal labels: minimum due vs amount actually paid (avoids two identical cells when API sends both). */
function roomBookingModalBillingSplit(r, bm) {
  const paid = parseMoney(r.paymentAmount);
  const minD = parseMoney(r.minimumDownPayment);
  const hasPaidField = r.paymentAmount != null && String(r.paymentAmount).trim() !== "";
  const downpaymentShown =
    Number.isFinite(minD) && minD > 0 ? minD : bm.down;
  const totalPaidShown =
    hasPaidField && Number.isFinite(paid) && paid >= 0 ? paid : bm.down;
  return { downpaymentShown, totalPaidShown };
}

/** Same split logic for event rows (optional minimumDownPayment on API). */
function eventBookingModalBillingSplit(e, em) {
  const paid = parseMoney(e.paymentAmount);
  const minD = parseMoney(e.minimumDownPayment);
  const hasPaidField = e.paymentAmount != null && String(e.paymentAmount).trim() !== "";
  const downpaymentShown =
    Number.isFinite(minD) && minD > 0 ? minD : em.down;
  const totalPaidShown =
    hasPaidField && Number.isFinite(paid) && paid >= 0 ? paid : em.down;
  return { downpaymentShown, totalPaidShown };
}

function eventBookingMoneyForDisplay(e) {
  const total = parseMoney(e.venuePrice) ?? parseMoney(e.totalAmount) ?? 0;
  let down = parseMoney(e.paymentAmount) ?? 0;
  if (Number.isFinite(total) && total > 0 && Number.isFinite(down) && down > total) down = total;
  return { total, down, balance: Math.max(0, total - down) };
}

function buildUnifiedRows(reservations, eventBookings, emailFilter, options = {}) {
  const { apiScoped, roomIdToNumber, venueIdToEventNum, venueIdToName } = options;
  const ridMap = roomIdToNumber instanceof Map ? roomIdToNumber : new Map();
  const vNum = venueIdToEventNum instanceof Map ? venueIdToEventNum : null;
  const vName = venueIdToName instanceof Map ? venueIdToName : null;
  const out = [];

  for (const r of reservations) {
    const st = normStatus(r.status);
    if (st === "cancelled" || st === "declined") continue;
    /* Completed / checked-out stays belong in Booking History only */
    if (st === "completed" || st === "checked-out") continue;
    if (!apiScoped && !matchesGuestEmail(reservationGuestEmail(r), emailFilter)) continue;

    const { total, down, balance } = roomBookingMoneyForDisplay(r);

    const roomNo = formatRoomTableNumber(r, ridMap);

    const roomVenue = String(r.roomTitle ?? "").trim() || "—";
    out.push({
      key: `room-${r.id}`,
      kind: "room",
      id: r.id,
      number: roomNo,
      venue: roomVenue,
      typeLabel: "Room",
      priceNum: total,
      downNum: down,
      balanceNum: balance,
      status: r.status || "pending",
      raw: r,
    });
  }

  for (const e of eventBookings) {
    const st = normStatus(e.status);
    if (st === "cancelled" || st === "declined") continue;
    if (st === "completed" || st === "checked-out") continue;
    if (!apiScoped && !matchesGuestEmail(eventGuestEmail(e), emailFilter)) continue;

    const { total, down, balance } = eventBookingMoneyForDisplay(e);

    const evNum = eventNumberColumn(e, vNum);
    const evVenue = eventVenueNameFromBooking(e, vName);
    out.push({
      key: `event-${e.id}`,
      kind: "event",
      id: e.id,
      number: evNum,
      venue: evVenue,
      typeLabel: "Event",
      priceNum: total,
      downNum: down,
      balanceNum: balance,
      status: e.status || "pending",
      raw: e,
    });
  }

  out.sort((a, b) => {
    const ta = a.raw?.createdAt ? new Date(a.raw.createdAt).getTime() : 0;
    const tb = b.raw?.createdAt ? new Date(b.raw.createdAt).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return String(b.id).localeCompare(String(a.id));
  });
  return out;
}

/** IDs present in GET /api/rooms catalog (Mongo-backed). */
function catalogRoomIdSet(catalog) {
  const s = new Set();
  for (const r of catalog || []) {
    const id = String(r.id ?? r._id ?? "").trim();
    if (id) s.add(id);
  }
  return s;
}

/** IDs present in GET /api/event-venues catalog (Mongo-backed). */
function catalogVenueIdSet(venues) {
  const s = new Set();
  for (const v of venues || []) {
    const id = String(v.id ?? v._id ?? "").trim();
    if (id) s.add(id);
  }
  return s;
}

/**
 * Guest homepage: only list rows with a real booking id and a room/venue FK that exists in the loaded catalogs.
 * Dedupes by booking id. Invalid rows are dropped (never replaced with placeholders).
 */
function filterGuestHomeApiBookings(bookings, roomIdSet, venueIdSet) {
  const list = Array.isArray(bookings) ? bookings : [];
  const seen = new Set();
  const out = [];
  for (const b of list) {
    const bid = String(b.id ?? "").trim();
    if (!looksLikeMongoObjectId(bid) || seen.has(bid)) continue;
    seen.add(bid);
    const t = String(b.type || "").toLowerCase();
    if (t === "room") {
      const rid = String(b.roomId ?? "").trim();
      if (!looksLikeMongoObjectId(rid) || !roomIdSet.has(rid)) continue;
    } else if (t === "event") {
      const vid = String(b.eventVenueId ?? "").trim();
      if (!looksLikeMongoObjectId(vid) || !venueIdSet.has(vid)) continue;
    } else {
      continue;
    }
    out.push(b);
  }
  return out;
}

// ============================================================
export default function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const {
    notifRef,
    notifOpen,
    setNotifOpen,
    bellUnreadCount,
    displayNotifications,
    loadGuestNotifications,
  } = useGuestTopbarNotifications();
  const { topbarProfile: guestTopbarProfile } = useTopbarUserProfile("guest");
  const [userOpen, setUserOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [dealSlides, setDealSlides] = useState(() => fallbackDealSlideObjects());
  const dealPageCount = Math.max(1, Math.ceil(dealSlides.length / SLIDES_PER_DOT));
  const trackRef = useRef(null);
  const userRef = useRef(null);

  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [unifiedRows, setUnifiedRows] = useState([]);
  const [hasGuestEmail, setHasGuestEmail] = useState(false);
  /** Map room catalog id → roomNumber for matching booking.roomId */
  const [roomIdToNumber, setRoomIdToNumber] = useState(() => new Map());

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [successWasCancel, setSuccessWasCancel] = useState(false);
  /** Full booking from GET /api/bookings/:id (includes payment proof omitted from list). */
  const [detailBooking, setDetailBooking] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedDetailFetchId =
    detailsOpen && selectedRow
      ? (() => {
          const id = selectedRow.id ?? selectedRow.raw?.id;
          return id != null && String(id).trim() !== "" ? id : null;
        })()
      : null;

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingsError("");
    let emailFilter = null;
    try {
      const raw = sessionStorage.getItem("abela_guest_email");
      emailFilter = raw && raw.trim() ? raw.trim().toLowerCase() : null;
    } catch {
      emailFilter = null;
    }
    setHasGuestEmail(!!emailFilter);

    const token = getStoredAuthToken();
    if (!token) {
      setUnifiedRows([]);
      setRoomIdToNumber(new Map());
      loadGuestNotifications();
      setBookingsLoading(false);
      return;
    }

    try {
      const [bookings, catalog, venues] = await Promise.all([
        fetchBookingsBackend(),
        fetchRoomsCatalog().catch(() => []),
        fetchEventVenuesBackend().catch(() => []),
      ]);
      const ridMap = buildRoomIdToNumberMap(catalog);
      const venuesArr = Array.isArray(venues) ? venues : [];
      const vNum = buildEventVenueIdToEventNumMap(venuesArr);
      const vName = buildEventVenueIdToNameMap(venuesArr);
      setRoomIdToNumber(ridMap);
      const roomIdCatalogSet = catalogRoomIdSet(catalog);
      const venueIdCatalogSet = catalogVenueIdSet(venuesArr);
      const bookingsArr = Array.isArray(bookings) ? bookings : [];
      const cleaned = filterGuestHomeApiBookings(bookingsArr, roomIdCatalogSet, venueIdCatalogSet);
      const resList = cleaned.filter((b) => b.type === "room");
      const evList = cleaned.filter((b) => b.type === "event");
      const rows = buildUnifiedRows(resList, evList, emailFilter, {
        apiScoped: true,
        roomIdToNumber: ridMap,
        venueIdToEventNum: vNum,
        venueIdToName: vName,
      });
      setUnifiedRows(rows);
    } catch (e) {
      const status = e.status;
      const code = e.code;
      if (code === "NO_TOKEN") {
        setUnifiedRows([]);
        setRoomIdToNumber(new Map());
        return;
      }
      if (status === 401) {
        clearStoredAuthToken();
        setBookingsError("Your session expired. Please sign in again to view your bookings.");
        setUnifiedRows([]);
        setRoomIdToNumber(new Map());
        return;
      }
      const msg = String(e.message || "");
      const looksNetwork =
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.includes("Load failed") ||
        e.name === "TypeError";
      if (looksNetwork) {
        const base = getBackendBaseURL();
        setBookingsError(
          base
            ? `Cannot reach the API at ${base}. Start the backend, or fix VITE_API_BASE_URL, then refresh.`
            : "Cannot reach the booking API. Start the server: in folder be/abela-be run npm run dev (port 5000). Open this site with npm run dev in fe/abela-fe so /api is proxied to port 5000, then refresh.",
        );
      } else {
        setBookingsError(msg || "Could not load bookings. Try again in a moment.");
      }
      setUnifiedRows([]);
    } finally {
      setBookingsLoading(false);
    }
  }, [loadGuestNotifications]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings, location.pathname, location.key]);

  useEffect(() => {
    function reloadFromFrontdesk() {
      loadBookings();
    }
    window.addEventListener("abela-guest-bookings-ping", reloadFromFrontdesk);
    function onStorage(e) {
      if (e.key === GUEST_BOOKINGS_STORAGE_PING_KEY) reloadFromFrontdesk();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("abela-guest-bookings-ping", reloadFromFrontdesk);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadBookings]);

  useEffect(() => {
    function onAuthChanged() {
      loadBookings();
      loadGuestNotifications();
    }
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthChanged);
  }, [loadBookings, loadGuestNotifications]);

  useEffect(() => {
    let cancelled = false;
    fetchRoomsCatalog()
      .then((list) => {
        if (cancelled) return;
        const mapped = catalogRoomsToDealSlides(list);
        if (mapped.length > 0) {
          setDealSlides(padDealSlidesToMultiple(mapped, SLIDES_PER_DOT));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      fetchRoomsCatalog()
        .then((list) => {
          const mapped = catalogRoomsToDealSlides(list);
          if (mapped.length > 0) {
            setDealSlides(padDealSlidesToMultiple(mapped, SLIDES_PER_DOT));
          }
        })
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    setCurrent((c) => Math.min(c, Math.max(0, dealPageCount - 1)));
  }, [dealPageCount]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % dealPageCount);
    }, 4000);
    return () => clearInterval(timer);
  }, [dealPageCount]);

  const updateCarouselTransform = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slideEl = track.querySelector(".carousel-slide");
    if (!slideEl) return;
    const slideW = slideEl.offsetWidth + 12;
    track.style.transform = `translateX(-${current * slideW * SLIDES_PER_DOT}px)`;
  }, [current, dealSlides.length]);

  useLayoutEffect(() => {
    updateCarouselTransform();
  }, [updateCarouselTransform]);

  useEffect(() => {
    window.addEventListener("resize", updateCarouselTransform);
    return () => window.removeEventListener("resize", updateCarouselTransform);
  }, [updateCarouselTransform]);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function openDetails(row) {
    setSelectedRow(row);
    setDetailsOpen(true);
  }

  function closeDetails() {
    setDetailsOpen(false);
    setSelectedRow(null);
    setDetailBooking(null);
    setDetailLoading(false);
  }

  useEffect(() => {
    if (!detailsOpen || selectedDetailFetchId == null) {
      setDetailBooking(null);
      setDetailLoading(false);
      return undefined;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailBooking(null);
    const id = selectedDetailFetchId;
    if (!getStoredAuthToken()) {
      setDetailLoading(false);
      return undefined;
    }
    fetchBookingByIdBackend(id)
      .then((b) => {
        if (!cancelled && b && bookingDetailIdsEqual(b.id, id)) setDetailBooking(b);
      })
      .catch(() => {
        if (!cancelled) setDetailBooking(null);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [detailsOpen, selectedDetailFetchId]);

  /** While the modal is open, staff “add charges” updates the booking — refetch detail so bill totals and notes refresh. */
  useEffect(() => {
    if (!detailsOpen || selectedDetailFetchId == null || !getStoredAuthToken()) return undefined;

    function refetchDetailBooking() {
      const id = selectedDetailFetchId;
      fetchBookingByIdBackend(id)
        .then((b) => {
          if (b && bookingDetailIdsEqual(b.id, id)) setDetailBooking(b);
        })
        .catch(() => {});
    }

    window.addEventListener("abela-guest-bookings-ping", refetchDetailBooking);
    function onStorage(e) {
      if (e.key === GUEST_BOOKINGS_STORAGE_PING_KEY) refetchDetailBooking();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("abela-guest-bookings-ping", refetchDetailBooking);
      window.removeEventListener("storage", onStorage);
    };
  }, [detailsOpen, selectedDetailFetchId]);

  function openCancelFlow() {
    setCancelReason("");
    setSuccessWasCancel(false);
    setCancelOpen(true);
    setDetailsOpen(false);
  }

  function closeCancel() {
    setCancelOpen(false);
  }

  function closeConfirm() {
    setConfirmOpen(false);
  }

  async function submitCancellation() {
    if (!selectedRow || cancelSubmitting) return;
    const reason = String(cancelReason || "").trim();
    if (reason.length < 3) {
      window.alert("Please enter a cancellation reason (at least 3 characters).");
      return;
    }
    setCancelSubmitting(true);
    try {
      if (!getStoredAuthToken()) {
        window.alert("Log in with your guest account to cancel a booking.");
        return;
      }
      await patchBookingBackend(selectedRow.id, { status: "cancelled", cancellationReason: reason });
      setUnifiedRows((rows) => rows.filter((r) => r.key !== selectedRow.key));
      loadGuestNotifications();
      setConfirmOpen(false);
      setCancelOpen(false);
      setSelectedRow(null);
      setSuccessWasCancel(true);
      setSuccessOpen(true);
      window.setTimeout(() => {
        setSuccessOpen(false);
        setSuccessWasCancel(false);
      }, 3200);
    } catch (err) {
      const m = err && typeof err.message === "string" ? err.message : "";
      const looksNetwork =
        err?.name === "TypeError" ||
        /failed to fetch|networkerror|load failed/i.test(m);
      const serverDetail = m && !/^HTTP \d+$/.test(m.trim()) ? m : "";
      window.alert(
        looksNetwork
          ? "Cannot reach the API (nothing listening on port 5000, or the request was blocked). In be/abela-be run npm run dev, fix MONGODB_URI in .env so the server starts, keep Vite on 5173, then try again."
          : serverDetail ||
              "Could not cancel this booking. Sign in again, or you may not be allowed to cancel this reservation in its current state.",
      );
    } finally {
      setCancelSubmitting(false);
    }
  }

  const canCancelSelected =
    selectedRow &&
    ["pending", "approved", "confirmed"].includes(normStatus(selectedRow.status)) &&
    normStatus(selectedRow.status) !== "occupied";

  const roomRawBase = selectedRow?.kind === "room" ? selectedRow.raw : null;
  const eventRawBase = selectedRow?.kind === "event" ? selectedRow.raw : null;
  const detailMatches =
    detailBooking &&
    selectedRow?.id != null &&
    String(detailBooking.id) === String(selectedRow.id);
  const roomRaw =
    roomRawBase && detailMatches ? { ...roomRawBase, ...detailBooking } : roomRawBase;
  const eventRaw =
    eventRawBase && detailMatches ? { ...eventRawBase, ...detailBooking } : eventRawBase;
  const roomIdPhotoSrc = roomRaw ? resolveGuestIdImageSrc(roomRaw) : null;
  const eventIdPhotoSrc = eventRaw ? resolveGuestIdImageSrc(eventRaw) : null;
  const {
    sidebarCollapsed,
    isMobile,
    mobileSidebarOpen,
    closeMobileSidebar,
    toggleSidebar,
    shellClassName,
    asideStyle,
    mainStyle,
    logoWrapStyle,
    logoImgStyle,
  } = useGuestSidebarLayout();

  return (
    <>
      <RailPortalShell
        rootClassName="guest-home-root guest-portal-layout"
        shellClassName={shellClassName}
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%" }}
        mainStyle={mainStyle}
        sidebar={
          <GuestSidebar
            navItems={navItems}
            sidebarCollapsed={sidebarCollapsed}
            isMobile={isMobile}
            mobileSidebarOpen={mobileSidebarOpen}
            closeMobileSidebar={closeMobileSidebar}
            shellClassName={shellClassName}
            asideStyle={asideStyle}
            logoWrapStyle={logoWrapStyle}
            logoImgStyle={logoImgStyle}
          />
        }
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <HousekeepingSidebarToggle
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              mobileSidebarOpen={mobileSidebarOpen}
            />
            <span className="breadcrumb-title">Homepage</span>
          </div>
          <div className="topbar-actions">
            <RoleTopbarBell
              ref={notifRef}
              isOpen={notifOpen}
              onBellClick={(e) => {
                e.stopPropagation();
                setNotifOpen((o) => !o);
                setUserOpen(false);
              }}
              notifications={displayNotifications}
              bellIconClassName="topbar-icon"
              dot={bellUnreadCount > 0 ? "active" : null}
              onItemClick={(n) => {
                const bookingId = String(n?.bookingId || "").trim();
                setNotifOpen(false);
                setUserOpen(false);
                if (bookingId) navigate(`/my-bookings/${bookingId}`);
              }}
            />

            <div
              className="icon-btn"
              ref={userRef}
              onClick={(e) => {
                e.stopPropagation();
                setUserOpen((o) => !o);
                setNotifOpen(false);
              }}
            >
              <TopbarUserIcon className="topbar-icon" />
              <span
                className="user-arrow"
                style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              >
                ▾
              </span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={guestTopbarProfile}
                profilePath={TOPBAR.guest.profilePath}
                onCloseMenus={() => { setNotifOpen(false); setUserOpen(false); }}
                onLogout={() => { setNotifOpen(false); setUserOpen(false); requestLogout(); }}
              />
            </div>
          </div>
        </header>

        <main className="content">
          <section className="deals-section">
            <h2 className="deals-title">Abela&apos;s Deals</h2>
            <p className="deals-sub">Grab exclusive deals and enjoy more for less.</p>
            <div className="carousel-wrapper">
              <div className="carousel-track" ref={trackRef}>
                {dealSlides.map((slide, i) => (
                  <div className="carousel-slide" key={`${slide.src}-${i}`}>
                    <img src={slide.src} alt={slide.alt} loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
            <div className="carousel-dots">
              {Array.from({ length: dealPageCount }).map((_, i) => (
                <span key={i} className={`dot${current === i ? " active" : ""}`} onClick={() => setCurrent(i)} role="presentation" />
              ))}
            </div>
          </section>

          <div className="bookings-wrap">
            <section className="bookings-section">
              <h2 className="bookings-title">Your Bookings</h2>
              <p className="bookings-sub">
                Keep track of your reservations and manage your bookings anytime, anywhere.
              </p>

              {bookingsLoading && <p className="bookings-loading">Loading your bookings…</p>}
              {!bookingsLoading && bookingsError && <p className="bookings-api-error">{bookingsError}</p>}

              {!bookingsLoading && !bookingsError && unifiedRows.length === 0 && (
                <div className="bookings-empty">
                  <p className="no-bookings">
                    {getStoredAuthToken() || hasGuestEmail
                      ? "No booking records found."
                      : "Log in to view booking records from your account."}
                  </p>
                  <Link to="/rooms">
                    <button type="button" className="btn-book-now">
                      Book Now
                    </button>
                  </Link>
                </div>
              )}

              {!bookingsLoading && !bookingsError && unifiedRows.length > 0 && (
                <div className="bookings-table-wrap">
                  <table className="bookings-table">
                    <thead>
                      <tr>
                        <th>Number</th>
                        <th>Venue</th>
                        <th>Type</th>
                        <th>Price</th>
                        <th>Downpayment</th>
                        <th>Balance</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unifiedRows.map((row) => (
                        <tr key={row.key}>
                          <td>{row.number}</td>
                          <td>{row.venue}</td>
                          <td>{row.typeLabel}</td>
                          <td>{formatNumTable(row.priceNum)}</td>
                          <td>{formatNumTable(row.downNum)}</td>
                          <td>{formatNumTable(row.balanceNum)}</td>
                          <td>
                            <span className={`status-badge ${statusBadgeClass(row.status)}`}>
                              {statusTableLabel(row.status)}
                            </span>
                          </td>
                          <td>
                            <button type="button" className="btn-view-details" onClick={() => openDetails(row)}>
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </main>
      </RailPortalShell>

      <Modal
        open={detailsOpen && !!selectedRow}
        onClose={closeDetails}
        title="Reservation Details"
        size="lg"
        placement="center"
        overlayClassName="guest-home-modal-overlay"
        panelClassName="guest-reservation-details modal-box--details rdm-shell-panel"
        bodyClassName="modal-body--details-scroll rdm-shell-body"
        footer={
          canCancelSelected ? (
            <div className="guest-reservation-details-footer">
              <button type="button" className="btn-cancel-booking" onClick={() => openCancelFlow()}>
                Cancel Booking
              </button>
            </div>
          ) : null
        }
      >
        {roomRaw &&
          (() => {
            const roomBm = roomBookingMoneyForDisplay(roomRaw);
            const { downpaymentShown, totalPaidShown } = roomBookingModalBillingSplit(roomRaw, roomBm);
            const proofSrc = paymentProofFromBooking(roomRaw);
            const pmLabel = paymentMethodDisplayLabel(roomRaw);
            const payLine = derivePaymentStatusLine(roomRaw, proofSrc);
            const addreqParsed = parseAdditionalRequestChargeLines(roomRaw.additionalRequests);
            const addOnsSubtotalListed = addreqParsed.charges.reduce((s, c) => s + c.amount, 0);
            return (
              <div className="rdm">
                {detailLoading ? <p className="rdm-loading">Loading full reservation…</p> : null}
                <div className="rdm-status-bar">
                  <div className="rdm-pill rdm-pill--booking">
                    <span className="rdm-pill__k">Booking status</span>
                    <span className="rdm-pill__v">{statusTableLabel(roomRaw.status)}</span>
                  </div>
                  <div className="rdm-pill rdm-pill--payment">
                    <span className="rdm-pill__k">Payment status</span>
                    <span className="rdm-pill__v">{payLine}</span>
                  </div>
                  <div className="rdm-pill rdm-pill--balance">
                    <span className="rdm-pill__k">Remaining balance</span>
                    <span className="rdm-pill__v">{formatPesoModal(roomBm.balance)}</span>
                  </div>
                </div>
                <div className="rdm-grid">
                  <section className="rdm-card">
                    <h4 className="rdm-card__title">Booking information</h4>
                    <dl className="rdm-dl">
                      <div>
                        <dt className="rdm-dt">Room</dt>
                        <dd className="rdm-dd">{roomDetailDisplayNumber(roomRaw, roomIdToNumber)}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Package</dt>
                        <dd className="rdm-dd">{roomRaw.roomTitle || "—"}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Check-in</dt>
                        <dd className="rdm-dd">{roomRaw.checkIn || "—"}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Check-out</dt>
                        <dd className="rdm-dd">{roomRaw.checkOut || "—"}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className="rdm-card">
                    <h4 className="rdm-card__title">Guest information</h4>
                    <dl className="rdm-dl">
                      <div className="rdm-dl__full">
                        <dt className="rdm-dt">Guest</dt>
                        <dd className="rdm-dd">{bookingCustomerDisplayName(roomRaw)}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Email</dt>
                        <dd className="rdm-dd rdm-dd--muted">{bookingEmailDisplay(roomRaw)}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Contact</dt>
                        <dd className="rdm-dd">{bookingPhoneDisplay(roomRaw)}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Additional guests</dt>
                        <dd className="rdm-dd">{String(roomRaw.additionalGuests ?? "0")}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className="rdm-card rdm-card--span2">
                    <h4 className="rdm-card__title">Billing summary</h4>
                    <div className="rdm-billing">
                      <div className="rdm-billing__cell">
                        <div className="rdm-billing__label">Total amount</div>
                        <div className="rdm-billing__value">{formatPesoModal(roomBm.total)}</div>
                      </div>
                      <div className="rdm-billing__cell">
                        <div className="rdm-billing__label">Downpayment</div>
                        <div className="rdm-billing__value">{formatPesoModal(downpaymentShown)}</div>
                      </div>
                      <div className="rdm-billing__cell">
                        <div className="rdm-billing__label">Total paid</div>
                        <div className="rdm-billing__value">{formatPesoModal(totalPaidShown)}</div>
                      </div>
                      <div className="rdm-billing__cell rdm-billing__cell--highlight">
                        <div className="rdm-billing__label">Remaining balance</div>
                        <div className="rdm-billing__value">{formatPesoModal(roomBm.balance)}</div>
                      </div>
                    </div>
                    {addreqParsed.charges.length > 0 || addreqParsed.notes.length > 0 ? (
                      <>
                        {addreqParsed.charges.length > 0 ? (
                          <div
                            className="rdm-charge-lines"
                            style={{ marginTop: "1rem" }}
                            aria-label="Itemized additional charges"
                          >
                            <div className="rdm-charge-lines__title">Additional charges</div>
                            <ul className="rdm-charge-lines__list">
                              {addreqParsed.charges.map((c, idx) => (
                                <li key={`${c.label}-${idx}`} className="rdm-charge-lines__row">
                                  <span className="rdm-charge-lines__name">{c.label}</span>
                                  <span className="rdm-charge-lines__amt">{formatPesoModal(c.amount)}</span>
                                </li>
                              ))}
                            </ul>
                            <div className="rdm-charge-lines__footer">
                              <span>Listed add-ons subtotal</span>
                              <span>{formatPesoModal(addOnsSubtotalListed)}</span>
                            </div>
                          </div>
                        ) : null}
                        {addreqParsed.notes.length > 0 ? (
                          <>
                            <h4 className="rdm-card__title" style={{ marginTop: "1rem" }}>
                              Requests & bill notes
                            </h4>
                            <p className="rdm-dd" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                              {addreqParsed.notes.join("; ")}
                            </p>
                          </>
                        ) : addreqParsed.charges.length > 0 ? (
                          <p className="rdm-bill-hint" style={{ marginTop: "12px" }}>
                            Priced add-ons above are included in your total amount and remaining balance.
                          </p>
                        ) : null}
                        <p className="rdm-bill-hint">Includes add-on charges recorded by the hotel during your stay.</p>
                      </>
                    ) : null}
                  </section>
                  {String(roomRaw.declineReason || "").trim() !== "" ? (
                    <section className="rdm-card rdm-card--span2">
                      <h4 className="rdm-card__title">Rejection reason</h4>
                      <p className="rdm-dd" style={{ margin: 0 }}>
                        {String(roomRaw.declineReason).trim()}
                      </p>
                    </section>
                  ) : null}
                  <section className="rdm-card">
                    <h4 className="rdm-card__title">Payment information</h4>
                    <dl className="rdm-dl">
                      <div>
                        <dt className="rdm-dt">Method</dt>
                        <dd className="rdm-dd">{pmLabel}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Amount paid</dt>
                        <dd className="rdm-dd">{formatPesoModal(totalPaidShown)}</dd>
                      </div>
                      <div className="rdm-dl__full">
                        <dt className="rdm-dt">Transaction ID</dt>
                        <dd className="rdm-dd rdm-dd--muted">
                          {roomRaw.paymentTransactionId || roomRaw.transactionId || "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Payment date</dt>
                        <dd className="rdm-dd">{formatPaymentDateDisplay(roomRaw.paymentDate)}</dd>
                      </div>
                    </dl>
                  </section>
                  <ReservationProofPreview booking={roomRaw} proofSrc={proofSrc} />
                  <section className="rdm-card">
                    <h4 className="rdm-card__title">Government ID</h4>
                    <div className="rdm-media-frame rdm-media-frame--tall">
                      {roomIdPhotoSrc ? (
                        <img
                          src={roomIdPhotoSrc}
                          alt="Government ID"
                          className="rdm-media-img"
                          decoding="async"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.style.background = "#e8dcc8";
                            el.style.minHeight = "100px";
                          }}
                        />
                      ) : (
                        <div className="rdm-media-placeholder">No government ID on file</div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            );
          })()}

        {eventRaw &&
          (() => {
            const evBm = eventBookingMoneyForDisplay(eventRaw);
            const { downpaymentShown, totalPaidShown } = eventBookingModalBillingSplit(eventRaw, evBm);
            const proofSrc = paymentProofFromBooking(eventRaw);
            const pmLabel = paymentMethodDisplayLabel(eventRaw);
            const payLine = derivePaymentStatusLine(eventRaw, proofSrc);
            return (
              <div className="rdm">
                {detailLoading ? <p className="rdm-loading">Loading full reservation…</p> : null}
                <div className="rdm-status-bar">
                  <div className="rdm-pill rdm-pill--booking">
                    <span className="rdm-pill__k">Booking status</span>
                    <span className="rdm-pill__v">{statusTableLabel(eventRaw.status)}</span>
                  </div>
                  <div className="rdm-pill rdm-pill--payment">
                    <span className="rdm-pill__k">Payment status</span>
                    <span className="rdm-pill__v">{payLine}</span>
                  </div>
                  <div className="rdm-pill rdm-pill--balance">
                    <span className="rdm-pill__k">Remaining balance</span>
                    <span className="rdm-pill__v">{formatPesoModal(evBm.balance)}</span>
                  </div>
                </div>
                <div className="rdm-grid">
                  <section className="rdm-card">
                    <h4 className="rdm-card__title">Booking information</h4>
                    <dl className="rdm-dl">
                      <div>
                        <dt className="rdm-dt">Venue</dt>
                        <dd className="rdm-dd">{eventRaw.venueName || "—"}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Event</dt>
                        <dd className="rdm-dd">{eventRaw.eventTitle || "—"}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Date</dt>
                        <dd className="rdm-dd">{eventRaw.eventDate || "—"}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Time slot</dt>
                        <dd className="rdm-dd">{eventRaw.timeSlot || "—"}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Expected pax</dt>
                        <dd className="rdm-dd">{eventRaw.expectedPax ?? "—"}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className="rdm-card">
                    <h4 className="rdm-card__title">Guest information</h4>
                    <dl className="rdm-dl">
                      <div className="rdm-dl__full">
                        <dt className="rdm-dt">Guest</dt>
                        <dd className="rdm-dd">{bookingCustomerDisplayName(eventRaw)}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Email</dt>
                        <dd className="rdm-dd rdm-dd--muted">{bookingEmailDisplay(eventRaw)}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Phone</dt>
                        <dd className="rdm-dd">{bookingPhoneDisplay(eventRaw)}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className="rdm-card rdm-card--span2">
                    <h4 className="rdm-card__title">Billing summary</h4>
                    <div className="rdm-billing">
                      <div className="rdm-billing__cell">
                        <div className="rdm-billing__label">Total amount</div>
                        <div className="rdm-billing__value">{formatPesoModal(evBm.total)}</div>
                      </div>
                      <div className="rdm-billing__cell">
                        <div className="rdm-billing__label">Downpayment</div>
                        <div className="rdm-billing__value">{formatPesoModal(downpaymentShown)}</div>
                      </div>
                      <div className="rdm-billing__cell">
                        <div className="rdm-billing__label">Total paid</div>
                        <div className="rdm-billing__value">{formatPesoModal(totalPaidShown)}</div>
                      </div>
                      <div className="rdm-billing__cell rdm-billing__cell--highlight">
                        <div className="rdm-billing__label">Remaining balance</div>
                        <div className="rdm-billing__value">{formatPesoModal(evBm.balance)}</div>
                      </div>
                    </div>
                  </section>
                  {String(eventRaw.declineReason || "").trim() !== "" ? (
                    <section className="rdm-card rdm-card--span2">
                      <h4 className="rdm-card__title">Rejection reason</h4>
                      <p className="rdm-dd" style={{ margin: 0 }}>
                        {String(eventRaw.declineReason).trim()}
                      </p>
                    </section>
                  ) : null}
                  <section className="rdm-card">
                    <h4 className="rdm-card__title">Payment information</h4>
                    <dl className="rdm-dl">
                      <div>
                        <dt className="rdm-dt">Method</dt>
                        <dd className="rdm-dd">{pmLabel}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Amount paid</dt>
                        <dd className="rdm-dd">{formatPesoModal(totalPaidShown)}</dd>
                      </div>
                      <div className="rdm-dl__full">
                        <dt className="rdm-dt">Transaction ID</dt>
                        <dd className="rdm-dd rdm-dd--muted">{eventRaw.transactionId || "—"}</dd>
                      </div>
                      <div>
                        <dt className="rdm-dt">Payment date</dt>
                        <dd className="rdm-dd">{formatPaymentDateDisplay(eventRaw.paymentDate)}</dd>
                      </div>
                    </dl>
                  </section>
                  <ReservationProofPreview booking={eventRaw} proofSrc={proofSrc} />
                  <section className="rdm-card">
                    <h4 className="rdm-card__title">Government ID</h4>
                    <div className="rdm-media-frame rdm-media-frame--tall">
                      {eventIdPhotoSrc ? (
                        <img
                          src={eventIdPhotoSrc}
                          alt="Government ID"
                          className="rdm-media-img"
                          decoding="async"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.style.background = "#e8dcc8";
                            el.style.minHeight = "100px";
                          }}
                        />
                      ) : (
                        <div className="rdm-media-placeholder">No government ID on file</div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            );
          })()}
      </Modal>

      <Modal
        open={cancelOpen && !!selectedRow}
        onClose={closeCancel}
        title="Reason for cancellation"
        size="sm"
        placement="top"
        overlayClassName="guest-home-modal-overlay"
        panelClassName="modal-cancel-panel"
        bodyClassName="modal-body--cancel-reason"
        footer={
          <>
            <button type="button" className="btn-clear" onClick={() => setCancelReason("")}>
              Clear
            </button>
            <button
              type="button"
              className="btn-submit-cancel"
              onClick={() => {
                const t = String(cancelReason || "").trim();
                if (t.length < 3) {
                  window.alert("Please enter a cancellation reason (at least 3 characters) before continuing.");
                  return;
                }
                setConfirmOpen(true);
              }}
            >
              Submit cancellation
            </button>
          </>
        }
      >
        <p className="cancel-label">Please provide a reason for cancellation.</p>
        <p className="cancel-policy-note" role="note">
          Once a booking is confirmed and you cancel it, any payment or downpayment sent online is non-refundable.
        </p>
        <textarea
          className="cancel-textarea"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Write your reason here…"
          rows={5}
        />
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={closeConfirm}
        placement="center"
        contentOnly
        shellStyle={false}
        size="sm"
        panelClassName="confirm-box"
        ariaLabel="Confirm cancellation"
      >
        <div className="confirm-icon">!</div>
        <p className="confirm-text">
          Are you sure you want to
          <br />
          cancel your booking?
        </p>
        <div className="confirm-btns">
          <button type="button" className="btn-confirm-cancel" onClick={closeConfirm}>
            Cancel
          </button>
          <button type="button" className="btn-confirm-submit" onClick={submitCancellation} disabled={cancelSubmitting}>
            {cancelSubmitting ? "Submitting…" : "Submit"}
          </button>
        </div>
      </Modal>

      <Modal
        open={successOpen}
        onClose={() => {
          setSuccessOpen(false);
          setSuccessWasCancel(false);
        }}
        placement="center"
        contentOnly
        shellStyle={false}
        size="sm"
        panelClassName="success-box"
        ariaLabel="Submission successful"
      >
        <div className="success-icon">✓</div>
        <div className="success-title">{successWasCancel ? "Booking cancelled" : "Submitted Successfully!"}</div>
        <div className="success-sub">
          {successWasCancel
            ? "Your reservation was cancelled. A notice was added to your account notifications."
            : "Your booking is under review. Please wait for an SMS confirmation."}
        </div>
      </Modal>

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}
