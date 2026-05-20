import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import TopbarAvatar from "../topbar/TopbarAvatar";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import {
  isVenueAvailableForDates,
  eventBookedRangesFromBookings,
  guestEventCalendarNightsFromBookedRanges,
} from "./guestAvailability";
import { DayPicker, DayButton, labelDayButton as defaultLabelDayButton } from "react-day-picker";
import "react-day-picker/style.css";
import { parseLocalYmd, formatLocalYmd, addLocalDays } from "./roomStayDates";
import {
  EVENT_BASE_INCLUDED_HOURS,
  EVENT_EXTRA_HOUR_FLAT_RATE,
  durationHoursDecimalFromTimes,
  buildEventTimeSlotLabel,
  eventNewRangeOverlapsExisting,
  parseEventStartEndMinutes,
} from "./eventVenueTimeShared";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import {
  createBookingBackend,
  bookingSaveAlertMessage,
  dispatchFrontdeskNotificationsRefresh,
  dispatchGuestBookingsRefreshPing,
  GUEST_BOOKINGS_STORAGE_PING_KEY,
  fetchGuestEventCalendarBookings,
  fetchEventVenuesBackend,
} from "../api/guestApi";
import {
  uploadBookingGuestValidIdDirectBackend,
  uploadPaymentProofDirectBackend,
} from "../api/imageUploadApi";
import {
  handleImageFileInputChange,
  isBookingSubmitImageRef,
  isHttpImageUrl,
  resolveImageUrlForSubmit,
} from "../utils/s3ImageUpload";
import { useGuestTopbarNotifications } from "./useGuestTopbarNotifications";
import GuestSidebar from "./GuestSidebar";
import { GuestArchiveIcon } from "./guestArchiveIcon";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
import BillingSummary from "./BillingSummary";
import BillingPaymentPills from "./BillingPaymentPills";
import { computeEventBookingBill, formatPeso, paymentSnapshotFromBill } from "./bookingBilling";
import "./billing-summary.css";
import "./guest-room.css";
import "./guest-events.css";

/** GCash mark: `public/Gcash.png`. Scan-to-pay QR: `public/QR.png`. */
const GCASH_CARD_ICON = "/Gcash.png";
const GCASH_PAYMENT_QR = "/QR.png";

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
const GuestsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const XIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="12" cy="10" r="3" />
    <path d="M7 21v-1a5 5 0 0 1 10 0v1" />
  </svg>
);
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const CardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);
const CashPayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M7 12h.01M17 12h.01" />
  </svg>
);

// --- Nav Items ---
const navItems = [
  { label: "Homepage",     icon: <HomeIcon />,     href: "/home"           },
  { label: "Rooms",        icon: <RoomIcon />,     href: "/rooms"                       },
  { label: "Event Venues", icon: <EventIcon />,    href: "/event-venues", active: true                },
  { label: "Archive",      icon: <GuestArchiveIcon />, href: "/booking-history" },
  { label: "Settings",     icon: <SettingsIcon />, href: "/settings"   },
];

function eventCalendarRowAccent(statusRaw) {
  const s = String(statusRaw || "").toLowerCase();
  if (s === "occupied") return "#e74c3c";
  if (s === "pending") return "#f1c40f";
  if (s === "approved" || s === "confirmed") return "#3498db";
  return "#95a5a6";
}

// --- Venue Data ---
const VENUES = [
  {
    id: "skybar",
    name: "Mini Sky Bar",
    typeLabel: "Rooftop venue",
    price: "?1,148",
    priceNum: 1148,
    guests: "30–40 Guests",
    maxGuests: 40,
    desc: "Perfect for debuts, seminars, meetings, birthdays, and more.",
    features: ["30 Chairs", "Speaker", "10 Tables", "Microphone"],
    img: "https://www.therooftopguide.com/rooftop-bars-in-hanoi/Bilder/moonlight-sky-bar-600-3.jpg",
  },
  {
    id: "hall",
    name: "Function Hall",
    typeLabel: "Banquet hall",
    price: "?2,205",
    priceNum: 2205,
    guests: "20–30 Guests",
    maxGuests: 30,
    desc: "With free Breakfast, private toilet and bath, aircon, and wifi.",
    features: ["30 Chairs", "Speaker", "10 Tables", "Microphone", "Smart TV", "Air Conditioning"],
    img: "/venue-function-hall.png",
  },
];

/** Use only real API rows for occupancy / calendar (no synthetic demo ranges). */
function resolveEventOccupancyRangesFromRows(apiRows) {
  const list = Array.isArray(apiRows) ? apiRows : [];
  return eventBookedRangesFromBookings(list);
}

// --- Helpers ---
function isVenueAvailable(venueId, wantStart, wantEnd, bookedDates) {
  return isVenueAvailableForDates(venueId, wantStart, wantEnd, bookedDates);
}

function fmtDate(str) {
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function parsePriceToNumber(priceStr) {
  const n = Number(String(priceStr || "").replace(/[?,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Map GET /api/event-venues row ? guest Event Venues card (same shape as legacy VENUES). */
function mapApiEventVenueToGuestCard(v) {
  const id = String(v?.id ?? v?._id ?? "").trim();
  const priceNum =
    typeof v?.price === "number" && Number.isFinite(v.price)
      ? v.price
      : parsePriceToNumber(String(v?.price ?? "0"));
  const name = String(v?.name || v?.venueName || v?.package || "Event venue").trim();
  const capacity = Number(v?.capacity);
  const maxGuests = Number.isFinite(capacity) && capacity > 0 ? capacity : 100;
  const limitStr = String(v?.limit || "").trim();
  const guests = limitStr && /\d/.test(limitStr) ? limitStr : `${maxGuests} guests`;
  const desc = String(v?.description || "").trim() || "Reserve this venue for your special event.";
  const rawFeatures = Array.isArray(v?.features) ? v.features : Array.isArray(v?.amenities) ? v.amenities : [];
  const features = rawFeatures.length ? rawFeatures : ["See venue details"];
  const img =
    String(v?.imageUrl || v?.image || "").trim() ||
    "https://images.unsplash.com/photo-1519167758481-83f29da34588?w=800";
  const priceLabel = priceNum > 0 ? `?${Math.round(priceNum).toLocaleString("en-PH")}` : "?0";
  const typeLabel =
    String(v?.package || "").trim() ||
    String(v?.venueType || v?.type || "").trim() ||
    "Event venue";
  return { id, name, typeLabel, price: priceLabel, priceNum, guests, maxGuests, desc, features, img };
}

/** Listed venue price = base for the first N hours; each hour beyond that is a flat add-on. */

function roundMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

function computeEventVenueBill(basePriceNum, durationHoursStr) {
  const parsed = parseFloat(String(durationHoursStr ?? "").replace(/,/g, ""));
  const durationHours =
    Number.isFinite(parsed) && parsed > 0 ? parsed : EVENT_BASE_INCLUDED_HOURS;
  const base = Number.isFinite(basePriceNum) && basePriceNum > 0 ? basePriceNum : 0;
  const extraHoursRaw = Math.max(0, durationHours - EVENT_BASE_INCLUDED_HOURS);
  const hourlyRate = EVENT_EXTRA_HOUR_FLAT_RATE;
  const additionalCharge = roundMoney(extraHoursRaw * hourlyRate);
  const total = roundMoney(base + additionalCharge);
  return {
    basePrice: base,
    includedHours: EVENT_BASE_INCLUDED_HOURS,
    durationHours,
    extraHours: roundMoney(extraHoursRaw),
    hourlyRate: roundMoney(hourlyRate),
    additionalCharge,
    total,
  };
}

function formatEvPeso(n) {
  return formatPeso(roundMoney(n));
}

function buildEventPricingFootnote(bill) {
  return (
    `[Venue hire ${bill.durationHours} h — base (${EVENT_BASE_INCLUDED_HOURS} h) ${formatEvPeso(bill.basePrice)}; ` +
    `extra ${bill.extraHours} h @ ${formatEvPeso(bill.hourlyRate)}/h = ${formatEvPeso(bill.additionalCharge)}; ` +
    `total ${formatEvPeso(bill.total)}]`
  );
}

function buildEventBookingPayload(
  form,
  venuePick,
  { paymentAmountNum = 0, transactionId = "", idDataUrl = null, paymentProofData = "", paymentDate = "" } = {},
) {
  if (!venuePick?.id) {
    const err = new Error("Missing event venue. Please pick a venue again.");
    err.code = "NO_VENUE";
    throw err;
  }
  const baseListed =
    typeof venuePick.priceNum === "number" && Number.isFinite(venuePick.priceNum)
      ? venuePick.priceNum
      : parsePriceToNumber(venuePick.price);
  const durH = durationHoursDecimalFromTimes(form.startTime, form.endTime);
  const bill = computeEventVenueBill(baseListed, String(durH > 0 ? durH : EVENT_BASE_INCLUDED_HOURS));
  const totalStr = bill.total.toFixed(2);
  const foot = buildEventPricingFootnote(bill);
  const req = (form.requests || "").trim();
  const additionalRequests = req ? `${req}\n\n${foot}` : foot;
  const email = form.email.trim().toLowerCase();
  const pax = Math.max(1, parseInt(form.attendees, 10) || 1);
  const hasId = isHttpImageUrl(idDataUrl);
  const hasProof = isHttpImageUrl(paymentProofData);
  const slotLabel = buildEventTimeSlotLabel(form.startTime, form.endTime);
  return {
    eventVenueId: String(venuePick.id),
    venueName: venuePick.name,
    venuePrice: totalStr,
    totalAmount: totalStr,
    customerName: form.customerName.trim(),
    email,
    customerEmail: email,
    contactNumber: form.contact.trim(),
    address: "",
    eventTitle: form.eventName.trim(),
    eventDate: form.date,
    eventEndDate: form.date,
    expectedPax: pax,
    additionalRequests,
    timeSlot: slotLabel || "",
    startTime: String(form.startTime || "").trim(),
    endTime: String(form.endTime || "").trim(),
    createdAt: new Date().toISOString(),
    status: "pending",
    paymentAmount: String(paymentAmountNum),
    paymentMethod: form.payment === "gcash" ? "Gcash" : "Cash",
    ...(transactionId ? { transactionId } : {}),
    guestIdPhotoName: hasId ? "uploaded" : "",
    guestIdPhotoData: hasId ? idDataUrl : "",
    paymentDate: String(paymentDate || "").trim(),
    paymentProofData: hasProof ? paymentProofData : "",
    paymentProofName: hasProof ? "uploaded" : "",
  };
}

function eventPayloadToApi(p) {
  return {
    type: "event",
    customerName: p.customerName,
    email: p.email,
    contactNumber: p.contactNumber,
    address: p.address || "",
    eventVenueId: p.eventVenueId,
    venueName: p.venueName,
    venuePrice: p.venuePrice,
    totalAmount: p.totalAmount,
    eventTitle: p.eventTitle,
    eventDate: p.eventDate,
    eventEndDate: p.eventEndDate,
    expectedPax: p.expectedPax,
    additionalRequests: p.additionalRequests,
    timeSlot: p.timeSlot,
    startTime: p.startTime,
    endTime: p.endTime,
    paymentAmount: p.paymentAmount,
    paymentMethod: p.paymentMethod,
    transactionId: p.transactionId || "",
    guestIdPhotoName: p.guestIdPhotoName,
    guestIdPhotoData: p.guestIdPhotoData,
    paymentDate: p.paymentDate || "",
    paymentProofData: p.paymentProofData || "",
    paymentProofName: p.paymentProofName || "",
  };
}

async function saveEventBooking(payload) {
  await createBookingBackend(eventPayloadToApi(payload));
}

const today = new Date().toISOString().split("T")[0];

// ============================================================
export default function EventVenues() {
  const navigate = useNavigate();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const {
    notifRef,
    notifOpen,
    setNotifOpen,
    bellUnreadCount,
    displayNotifications,
  } = useGuestTopbarNotifications();
  const { topbarProfile } = useTopbarUserProfile("guest");
  const userRef = useRef(null);
  const [userOpen, setUserOpen] = useState(false);
  const [bookedDates, setBookedDates] = useState(() => []);
  /** Raw rows from GET /api/bookings/event-calendar (for time overlap + schedule list). */
  const [eventCalRowsRaw, setEventCalRowsRaw] = useState([]);
  /** Catalog: API venues when logged in; demo VENUES when logged out or before load. */
  const [venueCatalog, setVenueCatalog] = useState(VENUES);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [resPick, setResPick] = useState(null);
  const [barStart, setBarStart]         = useState("");
  const [barEnd, setBarEnd]             = useState("");
  const [barGuests, setBarGuests]       = useState("30");
  const [availResult, setAvailResult]   = useState(null);
  const [venueStatuses, setVenueStatuses] = useState({});

  // Reservation modal
  const [resOpen, setResOpen]   = useState(false);
  const [form, setForm] = useState({
    eventName: "", customerName: "", contact: "", email: "",
    date: "", startTime: "09:00", endTime: "12:00", attendees: "", requests: "",
    payment: "cash", chkTerms: false, chkPrivacy: false, chkTOS: false,
  });
  const [idFile, setIdFile]         = useState(null);
  const [idPreview, setIdPreview]   = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [showBanner, setShowBanner] = useState(false);
  /** Same as guest-room: refetch event calendar when this tab or another tab signals a booking change. */
  const [guestBookingsPing, setGuestBookingsPing] = useState(0);
  const [eventCalLoading, setEventCalLoading] = useState(false);
  const [eventCalErr, setEventCalErr] = useState("");

  // Payment modal
  const [payOpen, setPayOpen]   = useState(false);
  const [payQrMissing, setPayQrMissing] = useState(false);
  const [payForm, setPayForm]   = useState({ amount: "", date: "", txId: "" });
  const [proofFile, setProofFile]       = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [payErrors, setPayErrors]       = useState({});
  /** GCash details + proof kept in the form until final confirmation (no API until then). */
  const [pendingGcash, setPendingGcash] = useState(null);

  // Confirm & success (toast only — same pattern as guest-room; no full-screen dim overlay)
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** null | "event" (cash / direct submit) | "gcash" */
  const [bookingSuccessToast, setBookingSuccessToast] = useState(null);
  const [resSubmitting, setResSubmitting] = useState(false);
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

  /** Local calendar date (avoid UTC off-by-one from `toISOString().slice(0,10)`). */
  const eventCalToday = useMemo(() => formatLocalYmd(new Date()), [resOpen]);
  const eventCalWindowEnd = useMemo(() => addLocalDays(eventCalToday, 540), [eventCalToday]);
  const guestEventVenueId = resPick?.id ? String(resPick.id) : "";

  const {
    eventGuestOccupiedNightSet,
    eventGuestReservedNightSet,
    guestEventDayLabelSuffixByKey,
    guestEventDayTitleByKey,
  } = useMemo(() => {
    const { occupied, reserved, dayLabelSuffixByKey, dayTitleByKey } = guestEventCalendarNightsFromBookedRanges(
      bookedDates,
      guestEventVenueId,
    );
    return {
      eventGuestOccupiedNightSet: occupied,
      eventGuestReservedNightSet: reserved,
      guestEventDayLabelSuffixByKey: dayLabelSuffixByKey,
      guestEventDayTitleByKey: dayTitleByKey,
    };
  }, [bookedDates, guestEventVenueId]);

  const guestEventCalendarComponents = useMemo(
    () => ({
      DayButton: function GuestEventDayButton(props) {
        const key = formatLocalYmd(props.day.date);
        const tip =
          guestEventVenueId && guestEventDayTitleByKey.has(key) ? guestEventDayTitleByKey.get(key) : undefined;
        return <DayButton {...props} title={tip} />;
      },
    }),
    [guestEventVenueId, guestEventDayTitleByKey],
  );

  const eventGuestDateCalendarLabels = useMemo(
    () => ({
      labelDayButton(date, modifiers, options, dateLib) {
        let label = defaultLabelDayButton(date, modifiers, options, dateLib);
        const key = formatLocalYmd(date);
        if (guestEventVenueId && guestEventDayLabelSuffixByKey.has(key)) {
          label = `${label}.${guestEventDayLabelSuffixByKey.get(key)}`;
        }
        return label;
      },
    }),
    [guestEventVenueId, guestEventDayLabelSuffixByKey],
  );

  const checkGuestEventDateDisabledMatchers = useMemo(() => {
    const t0 = parseLocalYmd(eventCalToday);
    return [t0 ? { before: t0 } : { before: new Date() }];
  }, [eventCalToday]);

  const handleSelectGuestEventDate = useCallback((d) => {
    const s = d ? formatLocalYmd(d) : "";
    setForm((f) => ({ ...f, date: s }));
    setFormErrors((fe) => ({ ...fe, date: false }));
    setShowBanner(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      /** Real occupancy for all guests' event bookings (GET /api/bookings is user-scoped only). */
      const calPromise = fetchGuestEventCalendarBookings().catch(() => []);

      if (!getStoredAuthToken()) {
        setVenueCatalog(VENUES);
        try {
          const calRows = await calPromise;
          const list = Array.isArray(calRows) ? calRows : [];
          setEventCalRowsRaw(list);
          setBookedDates(resolveEventOccupancyRangesFromRows(list));
        } catch {
          setEventCalRowsRaw([]);
          setBookedDates(resolveEventOccupancyRangesFromRows([]));
        }
        setCatalogLoading(false);
        return;
      }
      setCatalogLoading(true);
      try {
        const [venuesRaw, calRows] = await Promise.all([fetchEventVenuesBackend(), calPromise]);
        if (cancelled) return;
        const mapped = (Array.isArray(venuesRaw) ? venuesRaw : [])
          .map(mapApiEventVenueToGuestCard)
          .filter((x) => x.id);
        setVenueCatalog(mapped);
        const list = Array.isArray(calRows) ? calRows : [];
        setEventCalRowsRaw(list);
        setBookedDates(resolveEventOccupancyRangesFromRows(list));
      } catch {
        if (!cancelled) {
          setVenueCatalog(VENUES);
          try {
            const calRows = await fetchGuestEventCalendarBookings().catch(() => []);
            const list = Array.isArray(calRows) ? calRows : [];
            setEventCalRowsRaw(list);
            setBookedDates(resolveEventOccupancyRangesFromRows(list));
          } catch {
            setEventCalRowsRaw([]);
            setBookedDates(resolveEventOccupancyRangesFromRows([]));
          }
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }

    loadCatalog();
    function onAuthChange() {
      loadCatalog();
    }
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthChange);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthChange);
    };
  }, []);

  useEffect(() => {
    function bumpGuestBookingsPing() {
      setGuestBookingsPing((n) => n + 1);
    }
    window.addEventListener("abela-guest-bookings-ping", bumpGuestBookingsPing);
    function onStorage(e) {
      if (e.key === GUEST_BOOKINGS_STORAGE_PING_KEY) bumpGuestBookingsPing();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("abela-guest-bookings-ping", bumpGuestBookingsPing);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  /** Refresh occupancy when opening the reservation modal (and on ping while open), matching guest-room modal pattern. */
  useEffect(() => {
    if (!resOpen) return undefined;
    let cancelled = false;
    setEventCalLoading(true);
    setEventCalErr("");
    (async () => {
      let failed = false;
      try {
        const calRows = await fetchGuestEventCalendarBookings().catch(() => {
          failed = true;
          return [];
        });
        if (cancelled) return;
        const list = Array.isArray(calRows) ? calRows : [];
        setEventCalRowsRaw(list);
        const ranges = resolveEventOccupancyRangesFromRows(list);
        setBookedDates(ranges);
        setEventCalErr(failed && ranges.length === 0 ? "Could not load event availability." : "");
      } catch (e) {
        if (!cancelled) {
          setEventCalErr(e?.message || "Could not load event availability.");
        }
      } finally {
        if (!cancelled) setEventCalLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resOpen, venueCatalog, guestBookingsPing]);

  useEffect(() => {
    const onMouseDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [notifRef, setNotifOpen]);

  useEffect(() => {
    if (payOpen) setPayQrMissing(false);
  }, [payOpen]);

  useEffect(() => {
    if (!bookingSuccessToast) return undefined;
    const t = window.setTimeout(() => setBookingSuccessToast(null), 5200);
    return () => window.clearTimeout(t);
  }, [bookingSuccessToast]);

  useEffect(() => {
    if (!payOpen || !resPick) return;
    if (pendingGcash) {
      setPayForm({
        amount: pendingGcash.amount,
        date: pendingGcash.date,
        txId: pendingGcash.txId,
      });
      setProofPreview(pendingGcash.proofPreview || null);
      setProofFile(null);
      return;
    }
    const dh = durationHoursDecimalFromTimes(form.startTime, form.endTime);
    const bill = computeEventVenueBill(resPick.priceNum, String(dh > 0 ? dh : EVENT_BASE_INCLUDED_HOURS));
    const amt = bill.total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setPayForm((f) => ({ ...f, amount: amt }));
  }, [payOpen, resPick, form.startTime, form.endTime, pendingGcash]);

  // --- Availability ---
  function checkAvailability() {
    if (!barStart) {
      setAvailResult({ dot: "#9a8060", text: "Please select a start date." }); return;
    }
    if (new Date(barStart) < new Date(today)) {
      setAvailResult({ dot: "#e74c3c", text: "Start date cannot be in the past." }); return;
    }
    const effectiveEnd = barEnd || barStart;
    if (barEnd && barEnd < barStart) {
      setAvailResult({ dot: "#e74c3c", text: "End date must be on or after the start date." }); return;
    }
    const guests = parseInt(barGuests, 10);
    const statuses = {};
    let availCount = 0;
    const n = venueCatalog.length;
    for (const v of venueCatalog) {
      const guestOk = guests <= v.maxGuests;
      const dateOk  = isVenueAvailable(v.id, barStart, effectiveEnd, bookedDates);
      const ok = guestOk && dateOk;
      const dateLabel = effectiveEnd !== barStart
        ? fmtDate(barStart) + " – " + fmtDate(effectiveEnd)
        : fmtDate(barStart);
      statuses[v.id] = { ok, label: !guestOk ? "Too many guests" : ok ? "Available" : "Not Available", dateLabel };
      if (ok) availCount++;
    }
    setVenueStatuses(statuses);
    const effectiveLabel = effectiveEnd !== barStart
      ? fmtDate(barStart) + " – " + fmtDate(effectiveEnd)
      : fmtDate(barStart);
    if (n === 0) {
      setAvailResult({ dot: "#9a8060", text: "No event venues are available in the catalog yet." });
      return;
    }
    if (availCount === n)
      setAvailResult({ dot: "#27ae60", text: `All venues are available for ${effectiveLabel} (${guests} guests)` });
    else if (availCount === 0)
      setAvailResult({ dot: "#e74c3c", text: "No venues available for the selected dates / guest count." });
    else
      setAvailResult({ dot: "#e6a817", text: `${availCount} of ${n} venues available for ${effectiveLabel}` });
    setForm(f => ({ ...f, date: barStart }));
  }

  // --- Reservation ---
  function openRes(venueRow) {
    setPendingGcash(null);
    setPayOpen(false);
    setConfirmOpen(false);
    clearPayForm();
    setEventCalErr("");
    setResPick(venueRow);
    setForm((f) => ({ ...f, startTime: "09:00", endTime: "12:00" }));
    setResOpen(true);
  }
  function closeRes() {
    setResOpen(false);
    setResPick(null);
    setEventCalErr("");
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setFormErrors(fe => ({ ...fe, [name]: false }));
    setShowBanner(false);
  }

  async function handleIdUpload(e) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setIdFile(file);
    setFormErrors((fe) => ({ ...fe, id: false }));
    await handleImageFileInputChange(file, {
      uploadFn: uploadBookingGuestValidIdDirectBackend,
      setPreview: setIdPreview,
      requireS3: true,
      setError: (msg) => {
        setIdPreview(null);
        setIdFile(null);
        setFormErrors((fe) => ({ ...fe, id: true }));
        if (msg) window.alert(msg);
      },
    });
  }

  function validateRes() {
    const errs = {};
    if (!form.eventName.trim())    errs.eventName = true;
    if (!form.customerName.trim()) errs.customerName = true;
    if (!form.contact.trim() || !/^[0-9]{10,11}$/.test(form.contact.trim())) errs.contact = true;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = true;
    if (!form.date.trim()) errs.date = true;
    const tOk = parseEventStartEndMinutes(form.startTime, form.endTime);
    if (!tOk) {
      errs.startTime = true;
      errs.endTime = true;
    } else {
      const dh = durationHoursDecimalFromTimes(form.startTime, form.endTime);
      if (!Number.isFinite(dh) || dh < 0.5 || dh > 72) {
        errs.startTime = true;
        errs.endTime = true;
      } else if (
        resPick?.id &&
        form.date.trim() &&
        eventNewRangeOverlapsExisting(String(resPick.id), form.date.trim(), form.startTime, form.endTime, eventCalRowsRaw)
      ) {
        errs.startTime = true;
        errs.endTime = true;
      }
    }
    if (!isBookingSubmitImageRef(idPreview)) errs.id = true;
    if (!form.attendees || parseInt(form.attendees) < 1) errs.attendees = true;
    if (!form.chkTerms)   errs.chkTerms = true;
    if (!form.chkPrivacy) errs.chkPrivacy = true;
    if (!form.chkTOS)     errs.chkTOS = true;
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) { setShowBanner(true); return false; }
    return true;
  }

  function preparePayModalFromDraft() {
    setPayErrors({});
    if (!pendingGcash) clearPayForm();
  }

  function openGcashPaymentModal() {
    preparePayModalFromDraft();
    setPayOpen(true);
  }

  function handleSubmitRes() {
    if (!validateRes()) return;
    if (form.payment === "gcash" && !pendingGcash) {
      openGcashPaymentModal();
      return;
    }
    setConfirmOpen(true);
  }

  async function confirmSubmit() {
    if (!getStoredAuthToken()) {
      window.alert(bookingSaveAlertMessage({ code: "NO_TOKEN" }));
      setConfirmOpen(false);
      return;
    }
    if (!resPick || !form.date) {
      setConfirmOpen(false);
      return;
    }
    if (
      eventNewRangeOverlapsExisting(String(resPick.id), form.date.trim(), form.startTime, form.endTime, eventCalRowsRaw)
    ) {
      window.alert(
        "This venue is unavailable during the selected time because it overlaps with an existing booking or cleaning schedule.",
      );
      setConfirmOpen(false);
      return;
    }
    if (form.payment === "gcash") {
      if (!pendingGcash) {
        setConfirmOpen(false);
        openGcashPaymentModal();
        return;
      }
      setResSubmitting(true);
      try {
        const idUrl = await resolveImageUrlForSubmit(
          idPreview,
          idFile,
          uploadBookingGuestValidIdDirectBackend,
          "Government ID photo",
        );
        const proofUrl = await resolveImageUrlForSubmit(
          pendingGcash.proofPreview,
          pendingGcash.proofFile,
          uploadPaymentProofDirectBackend,
          "Payment proof",
        );
        const payload = buildEventBookingPayload(form, resPick, {
          paymentAmountNum: pendingGcash.paidNum,
          transactionId: pendingGcash.txId,
          idDataUrl: idUrl,
          paymentProofData: proofUrl,
          paymentDate: pendingGcash.date,
        });
        await saveEventBooking(payload);
        dispatchFrontdeskNotificationsRefresh();
        dispatchGuestBookingsRefreshPing();
        try {
          sessionStorage.setItem("abela_guest_email", payload.email);
        } catch {
          /* ignore */
        }
        try {
          const calRows = await fetchGuestEventCalendarBookings();
          const list = Array.isArray(calRows) ? calRows : [];
          setEventCalRowsRaw(list);
          setBookedDates(resolveEventOccupancyRangesFromRows(list));
        } catch {
          /* ignore */
        }
        setConfirmOpen(false);
        setResOpen(false);
        clearResForm();
        setBookingSuccessToast("gcash");
      } catch (err) {
        window.alert(bookingSaveAlertMessage(err));
      } finally {
        setResSubmitting(false);
      }
      return;
    }
    setResSubmitting(true);
    try {
      const idUrl = await resolveImageUrlForSubmit(
        idPreview,
        idFile,
        uploadBookingGuestValidIdDirectBackend,
        "Government ID photo",
      );
      const payload = buildEventBookingPayload(form, resPick, { paymentAmountNum: 0, idDataUrl: idUrl });
      await saveEventBooking(payload);
      dispatchFrontdeskNotificationsRefresh();
      dispatchGuestBookingsRefreshPing();
      try {
        sessionStorage.setItem("abela_guest_email", payload.email);
      } catch {
        /* ignore */
      }
      try {
        const calRows = await fetchGuestEventCalendarBookings();
        const list = Array.isArray(calRows) ? calRows : [];
        setEventCalRowsRaw(list);
        setBookedDates(resolveEventOccupancyRangesFromRows(list));
      } catch {
        /* ignore */
      }
      setConfirmOpen(false);
      setResOpen(false);
      clearResForm();
      setBookingSuccessToast("event");
    } catch (err) {
      window.alert(bookingSaveAlertMessage(err));
    } finally {
      setResSubmitting(false);
    }
  }

  function clearResForm() {
    setForm({
      eventName: "",
      customerName: "",
      contact: "",
      email: "",
      date: "",
      startTime: "09:00",
      endTime: "12:00",
      attendees: "",
      requests: "",
      payment: "cash",
      chkTerms: false,
      chkPrivacy: false,
      chkTOS: false,
    });
    setIdFile(null); setIdPreview(null);
    setFormErrors({}); setShowBanner(false);
    setResPick(null);
    setPayOpen(false);
    setPendingGcash(null);
    clearPayForm();
  }

  function clearPayForm() {
    setPayForm({ amount:"", date:"", txId:"" });
    setProofFile(null); setProofPreview(null);
    setPayErrors({});
  }

  // --- Payment: Cash = selection only; GCash opens payment form modal ---
  function selectPayment(val) {
    setForm(f => ({ ...f, payment: val }));
    if (val === "gcash") {
      openGcashPaymentModal();
    } else {
      setPayOpen(false);
      setPendingGcash(null);
      clearPayForm();
    }
  }
  function closePay() {
    setPayOpen(false);
    clearPayForm();
  }

  function handlePayFormChange(e) {
    const { name, value } = e.target;
    setPayForm(f => ({ ...f, [name]: value }));
    setPayErrors(pe => ({ ...pe, [name]: false }));
  }

  async function handleProofUpload(e) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setProofFile(file);
    setPayErrors((pe) => ({ ...pe, proof: false }));
    await handleImageFileInputChange(file, {
      uploadFn: uploadPaymentProofDirectBackend,
      setPreview: setProofPreview,
      requireS3: true,
      setError: (msg) => {
        setProofPreview(null);
        setProofFile(null);
        setPayErrors((pe) => ({ ...pe, proof: true }));
        if (msg) window.alert(msg);
      },
    });
  }

  function submitPayment() {
    const errs = {};
    if (!payForm.amount.trim()) errs.amount = true;
    if (!payForm.date.trim())   errs.date = true;
    if (!payForm.txId.trim())   errs.txId = true;
    if (!isBookingSubmitImageRef(proofPreview)) errs.proof = true;
    setPayErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (form.payment !== "gcash") {
      closePay();
      return;
    }

    if (!resPick || !form.date) {
      window.alert("Booking details are missing. Please start your reservation again.");
      return;
    }
    if (!getStoredAuthToken()) {
      window.alert(bookingSaveAlertMessage({ code: "NO_TOKEN" }));
      return;
    }

    const paid = parsePriceToNumber(payForm.amount);
    const dh = durationHoursDecimalFromTimes(form.startTime, form.endTime);
    const eventTotal = computeEventVenueBill(resPick.priceNum, String(dh > 0 ? dh : EVENT_BASE_INCLUDED_HOURS)).total;
    if (Number.isFinite(eventTotal) && eventTotal > 0 && paid > eventTotal) {
      window.alert(
        `Amount paid cannot be greater than the booking total (?${eventTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`,
      );
      return;
    }

    setPendingGcash({
      amount: payForm.amount.trim(),
      date: payForm.date.trim(),
      txId: payForm.txId.trim(),
      proofPreview: proofPreview || "",
      proofFile: proofFile || null,
      paidNum: paid,
    });
    setPayOpen(false);
    clearPayForm();
  }

  const activeVenueMeta = resPick;
  const durationHoursForBill = String(
    durationHoursDecimalFromTimes(form.startTime, form.endTime) || EVENT_BASE_INCLUDED_HOURS,
  );
  const eventVenueBill =
    activeVenueMeta != null ? computeEventVenueBill(activeVenueMeta.priceNum, durationHoursForBill) : null;

  const eventBookingBill = useMemo(() => {
    if (!activeVenueMeta || !form.startTime || !form.endTime) return null;
    const hours = durationHoursDecimalFromTimes(form.startTime, form.endTime);
    if (!(hours > 0)) return null;
    return computeEventBookingBill({
      venueName: activeVenueMeta.name,
      basePrice: activeVenueMeta.priceNum,
      startTime: form.startTime,
      endTime: form.endTime,
      includedPax: activeVenueMeta.maxGuests,
      expectedPax: form.attendees,
    });
  }, [activeVenueMeta, form.startTime, form.endTime, form.attendees]);

  const eventLivePayment = useMemo(() => {
    if (!eventBookingBill) return null;
    const paidNum =
      form.payment === "gcash" && pendingGcash
        ? Number(pendingGcash.paidNum) || 0
        : 0;
    return paymentSnapshotFromBill(eventBookingBill, paidNum);
  }, [eventBookingBill, form.payment, pendingGcash]);

  return (
    <>
      <RailPortalShell
        rootClassName="guest-events-page guest-portal-layout"
        shellClassName={shellClassName}
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%", background: "#f5f5f5" }}
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
        {/* -- TOPBAR -- */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <HousekeepingSidebarToggle
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              mobileSidebarOpen={mobileSidebarOpen}
            />
            <span className="breadcrumb-title">Event Venues</span>
          </div>
          <div className="topbar-actions">
            <RoleTopbarBell
              ref={notifRef}
              isOpen={notifOpen}
              onBellClick={(e) => {
                e.stopPropagation();
                setNotifOpen((v) => !v);
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
                setUserOpen((v) => !v);
                setNotifOpen(false);
              }}
            >
              <TopbarAvatar src={topbarProfile.avatarUrl} className="topbar-nav-avatar" />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)" }}>?</span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={topbarProfile}
                profilePath={TOPBAR.guest.profilePath}
                onCloseMenus={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                }}
                onLogout={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                  requestLogout();
                }}
              />
            </div>
          </div>
        </header>

        {/* -- CONTENT -- */}
        <main className="content">

          {/* Availability Bar */}
          <div className="availability-bar">
            <div className="avail-field">
              <label>Start Date</label>
              <input type="date" min={today} value={barStart}
                onChange={e => { setBarStart(e.target.value); if (barEnd && barEnd < e.target.value) setBarEnd(""); }} />
            </div>
            <div className="avail-field">
              <label>End Date</label>
              <input type="date" min={barStart || today} value={barEnd}
                onChange={e => setBarEnd(e.target.value)} />
            </div>
            <div className="avail-field">
              <label>Guests</label>
              <select value={barGuests} onChange={e => setBarGuests(e.target.value)}>
                {[30, 40, 50, 60, 80, 100].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="avail-field">
              <label>Check Availability</label>
              <button className="btn-availability" onClick={checkAvailability}>Availability</button>
            </div>
          </div>

          {/* Results Banner */}
          {availResult && (
            <div className="avail-results-bar">
              <span className="avail-dot" style={{ background: availResult.dot }}></span>
              <span>{availResult.text}</span>
            </div>
          )}

          {catalogLoading && getStoredAuthToken() && (
            <p style={{ margin: "0 0 12px", color: "#9a8060", fontSize: 14 }}>Loading venues from the server…</p>
          )}

          {/* Venue cards — same shell classes as guest Rooms for consistent shape & responsive image band */}
          <div className="rooms-list">
            {venueCatalog.length === 0 && !catalogLoading ? (
              <p style={{ padding: "1.5rem", color: "#9a8060", textAlign: "center" }}>
                No event venues are in the catalog yet. Please check back later, or log out to see sample venues for
                demo browsing.
              </p>
            ) : (
              venueCatalog.map((v) => {
              const st = venueStatuses[v.id];
              const isUnavailable = Boolean(st && !st.ok);
              return (
                <div key={v.id} className={`room-card${isUnavailable ? " unavailable" : ""}`}>
                  <span className={`avail-badge${st ? (st.ok ? " badge-available" : " badge-unavailable") : ""}`}>
                    {st && !st.ok ? <XIcon /> : <CheckIcon />}
                    <span>{st ? st.label : "Available"}</span>
                  </span>
                  <div className="room-img-wrap">
                    <div className="room-img-aspect">
                      <img src={v.img} alt={v.name} decoding="async" />
                    </div>
                  </div>
                  <div className="room-info">
                    <h2 className="room-name">{v.name}</h2>
                    <p className="room-type-line">
                      <span className="room-type-label">Type</span>{" "}
                      <span className="room-type-value">{v.typeLabel}</span>
                    </p>
                    <div className="room-pricing">
                      <span className="room-price-new">{v.price}</span>
                      <span className="venue-price-note">Base · {EVENT_BASE_INCLUDED_HOURS} h</span>
                      <span className="room-guests"><GuestsIcon /> {v.guests}</span>
                    </div>
                    <p className="room-desc">{v.desc}</p>
                    <p className="features-label">Features:</p>
                    <div className="features-grid">
                      {v.features.map((f, i) => (
                        <span key={`${v.id}-f-${i}`} className="feature-item">? {f}</span>
                      ))}
                    </div>
                    <div className="room-footer">
                      <span className="dates-tag">{st?.dateLabel || ""}</span>
                      <button type="button" className="btn-book-now" disabled={isUnavailable}
                        onClick={() => openRes(v)}>Reserve</button>
                    </div>
                  </div>
                </div>
              );
              })
            )}
          </div>
        </main>
      </RailPortalShell>

      {/* -- RESERVATION MODAL -- */}
      {resOpen && (
        <div className="modal-backdrop active"
          onClick={e => { if (e.target === e.currentTarget) closeRes(); }}>
          <div className="modal modal--booking" role="dialog" aria-modal="true" aria-labelledby="ev-reservation-modal-title">
            <div className="modal-header modal-header--booking">
              <h2 id="ev-reservation-modal-title" className="modal-title">{resPick?.name || "Venue"} - Reservation</h2>
              <button type="button" className="modal-close" onClick={closeRes} aria-label="Close">{"\u2715"}</button>
            </div>
            <div className="modal-body modal-body--booking">
              <div className="booking-form booking-form--event">

              {showBanner ? (
                <p className="booking-form-error-banner" role="alert">
                  Please fill in all required fields before submitting.
                </p>
              ) : null}

              <div className="ev-form-row">
                <div className="ev-form-group">
                  <label>Event Name <span style={{ color: "#e74c3c" }}>*</span></label>
                  <input type="text" name="eventName" value={form.eventName}
                    placeholder="e.g. Birthday Party"
                    className={formErrors.eventName ? "ev-error" : ""}
                    onChange={handleFormChange} />
                  <span className={`ev-field-err${formErrors.eventName ? " visible" : ""}`}>Event name is required.</span>
                </div>
                <div className="ev-form-group">
                  <label>Customer Name <span style={{ color: "#e74c3c" }}>*</span></label>
                  <input type="text" name="customerName" value={form.customerName}
                    placeholder="e.g. Janah Cultura"
                    className={formErrors.customerName ? "ev-error" : ""}
                    onChange={handleFormChange} />
                  <span className={`ev-field-err${formErrors.customerName ? " visible" : ""}`}>Customer name is required.</span>
                </div>
              </div>

              <div className="ev-form-row">
                <div className="ev-form-group">
                  <label>Contact Number <span style={{ color: "#e74c3c" }}>*</span></label>
                  <input type="text" name="contact" value={form.contact}
                    placeholder="e.g. 09XXXXXXXXX" maxLength={11}
                    className={formErrors.contact ? "ev-error" : ""}
                    onChange={e => { e.target.value = e.target.value.replace(/\D/g, ""); handleFormChange(e); }} />
                  <span className={`ev-field-err${formErrors.contact ? " visible" : ""}`}>Valid 10–11 digit contact number is required.</span>
                </div>
                <div className="ev-form-group">
                  <label>Email <span style={{ color: "#e74c3c" }}>*</span></label>
                  <input type="email" name="email" value={form.email}
                    placeholder="e.g. example@email.com"
                    className={formErrors.email ? "ev-error" : ""}
                    onChange={handleFormChange} />
                  <span className={`ev-field-err${formErrors.email ? " visible" : ""}`}>A valid email address is required.</span>
                </div>
              </div>

              <div className="form-row form-row--event-schedule ev-form-row--guest-event-date-cal">
                <p className="booking-cal-unavailable-hint">
                  <strong>How to book:</strong> Past dates are disabled. Red or gold marks full-day holds. When times are on file, pick a date and choose start/end that do not overlap another booking or the 2-hour cleaning buffer.
                </p>
                <div className="ev-form-group">
                  <span className="form-label-static" id="ev-guest-date-label">
                    Date <span className="required">*</span>
                  </span>
                  <div
                    className={
                      formErrors.date ? "booking-day-picker-wrap booking-day-picker-wrap--error" : "booking-day-picker-wrap"
                    }
                  >
                    <DayPicker
                      mode="single"
                      components={guestEventCalendarComponents}
                      selected={form.date ? parseLocalYmd(form.date) : undefined}
                      onSelect={handleSelectGuestEventDate}
                      startMonth={parseLocalYmd(eventCalToday) ?? undefined}
                      endMonth={parseLocalYmd(eventCalWindowEnd) ?? undefined}
                      defaultMonth={parseLocalYmd(form.date) ?? parseLocalYmd(eventCalToday) ?? undefined}
                      disabled={checkGuestEventDateDisabledMatchers}
                      labels={eventGuestDateCalendarLabels}
                      modifiers={{
                        evGuestOccupied: (date) =>
                          Boolean(guestEventVenueId) && eventGuestOccupiedNightSet.has(formatLocalYmd(date)),
                        evGuestReserved: (date) =>
                          Boolean(guestEventVenueId) && eventGuestReservedNightSet.has(formatLocalYmd(date)),
                      }}
                      modifiersClassNames={{
                        evGuestOccupied: "fd-cal-cell fd-cal-cell--occupied",
                        evGuestReserved: "fd-cal-cell fd-cal-cell--reserved",
                      }}
                      className="booking-day-picker"
                      id="ev-guest-date-calendar"
                      aria-labelledby="ev-guest-date-label"
                    />
                  </div>
                  {eventCalLoading && <span className="booking-cal-hint">Loading availability…</span>}
                  {eventCalErr ? (
                    <p className="booking-occupancy-warn" role="status">
                      Could not load booked dates for event venues ({eventCalErr}). You can still submit; the front desk
                      will confirm availability. Double booking is possible until dates load — try again or pick dates
                      you know are open.
                    </p>
                  ) : null}
                  <span className={`ev-field-err${formErrors.date ? " visible" : ""}`}>
                    Please select a date (not in the past).
                  </span>
                </div>
                <div className="ev-form-group ev-form-group--event-times">
                  <div className="ev-time-stack">
                    <div className="ev-time-field">
                      <label className="form-label-static" htmlFor="ev-guest-start-time">
                        Event start time <span className="required">*</span>
                      </label>
                      <input
                        id="ev-guest-start-time"
                        type="time"
                        name="startTime"
                        value={form.startTime}
                        className={formErrors.startTime ? "ev-error" : ""}
                        onChange={handleFormChange}
                      />
                    </div>
                    <div className="ev-time-field">
                      <label className="form-label-static" htmlFor="ev-guest-end-time">
                        Event end time <span className="required">*</span>
                      </label>
                      <input
                        id="ev-guest-end-time"
                        type="time"
                        name="endTime"
                        value={form.endTime}
                        className={formErrors.endTime ? "ev-error" : ""}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>
                  <span className={`ev-field-err${formErrors.startTime || formErrors.endTime ? " visible" : ""}`}>
                    Choose end after start (0.5–72 hours). Times must not overlap another booking or the 2-hour cleaning
                    buffer after an existing event.
                  </span>
                  <p className="booking-schedule-note" role="note">
                    <strong>Note:</strong> The first {EVENT_BASE_INCLUDED_HOURS} hours are included in the venue base rate. Each additional hour is {formatPeso(EVENT_EXTRA_HOUR_FLAT_RATE)}.
                  </p>
                </div>
              </div>
              <div className="ev-guest-ev-cal-legend-wrap">
                <div className="fd-cal-legend" aria-label="Schedule legend">
                  <span className="fd-cal-legend-item">
                    <span className="fd-cal-legend-swatch fd-cal-legend-swatch--occupied" aria-hidden /> Occupied
                  </span>
                  <span className="fd-cal-legend-item">
                    <span className="fd-cal-legend-swatch" style={{ background: "#3498db", border: "1px solid #2980b9" }} aria-hidden /> Approved / Confirmed
                  </span>
                  <span className="fd-cal-legend-item">
                    <span className="fd-cal-legend-swatch fd-cal-legend-swatch--reserved" aria-hidden /> Pending
                  </span>
                  <span className="fd-cal-legend-item">
                    <span className="fd-cal-legend-swatch" style={{ background: "#bdc3c7", border: "1px solid #95a5a6" }} aria-hidden /> Cleaning buffer (2 h after events)
                  </span>
                </div>
              </div>

              {form.date && guestEventVenueId ? (
                <div className="ev-guest-ev-day-schedule" style={{ marginTop: 4 }}>
                  <p className="ev-field-hint" style={{ marginBottom: 10 }}>
                    <strong>Booked times on {form.date}</strong> (live from hotel reservations). Full-day holds show when
                    no start/end times are stored yet.
                  </p>
                  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {eventCalRowsRaw
                      .filter((r) => {
                        const vid = String(r.eventVenueId || "").trim();
                        if (vid !== String(guestEventVenueId).trim()) return false;
                        const d0 = String(r.eventDate || "").slice(0, 10);
                        const d1 = String(r.eventEndDate || r.eventDate || "").slice(0, 10);
                        const fd = form.date.trim();
                        return fd >= d0 && fd <= d1;
                      })
                      .map((r) => {
                        const label =
                          buildEventTimeSlotLabel(r.startTime, r.endTime) ||
                          String(r.timeSlot || "").trim() ||
                          "Time on file";
                        const accent = eventCalendarRowAccent(r.status);
                        return (
                          <li
                            key={String(r.id || `${r.eventDate}-${r.status}-${label}`)}
                            style={{
                              borderLeft: `4px solid ${accent}`,
                              padding: "8px 10px",
                              marginBottom: 8,
                              background: "#faf9f6",
                              borderRadius: 6,
                            }}
                          >
                            <strong>{label}</strong>
                            <span style={{ color: "#6b5a3e", marginLeft: 8 }}>
                              · {String(r.status || "").trim() || "—"}
                            </span>
                            {r.customerName ? (
                              <span style={{ color: "#6b5a3e", marginLeft: 6 }}>({r.customerName})</span>
                            ) : null}
                          </li>
                        );
                      })}
                  </ul>
                  {eventCalRowsRaw.filter(
                    (r) =>
                      String(r.eventVenueId || "").trim() === String(guestEventVenueId).trim() &&
                      form.date.trim() >= String(r.eventDate || "").slice(0, 10) &&
                      form.date.trim() <= String(r.eventEndDate || r.eventDate || "").slice(0, 10),
                  ).length === 0 ? (
                    <p className="ev-field-hint">No blocking reservations on this date for this venue.</p>
                  ) : null}
                </div>
              ) : null}

              {eventBookingBill ? (
                <div className="booking-form-billing-block">
                  <BillingSummary bill={eventBookingBill} title="Billing summary" showMinimumDown />
                  {eventLivePayment ? (
                    <BillingPaymentPills
                      total={eventLivePayment.total}
                      amountPaid={eventLivePayment.amountPaid}
                      balanceDue={eventLivePayment.balanceDue}
                      minimumDownPayment={eventLivePayment.minimumDownPayment}
                    />
                  ) : null}
                </div>
              ) : form.startTime && form.endTime ? (
                <p className="booking-bill-hint" role="status">
                  Set valid start and end times to see your billing summary.
                </p>
              ) : null}

              <div className="ev-form-row">
                <div className="ev-form-group">
                  <span className="ev-form-label-static">Customer ID <span style={{ color: "#e74c3c" }}>*</span></span>
                  <label htmlFor="ev-id-file" className={`ev-upload-box ev-upload-box--id${formErrors.id ? " ev-error" : ""}`}>
                    <input id="ev-id-file" type="file" accept="image/*" onChange={handleIdUpload} />
                    {idPreview
                      ? <img src={idPreview} className="ev-upload-preview" alt="ID preview" />
                      : <div className="ev-upload-placeholder"><UserIcon /><span>Upload government ID</span></div>}
                  </label>
                  <span className={`ev-field-err${formErrors.id ? " visible" : ""}`}>Please upload a valid government ID.</span>
                </div>
                <div className="ev-form-group">
                  <label>Estimated Attendees <span style={{ color: "#e74c3c" }}>*</span></label>
                  <input type="number" name="attendees" value={form.attendees}
                    min="1" placeholder="e.g. 30"
                    className={formErrors.attendees ? "ev-error" : ""}
                    onChange={handleFormChange} />
                  <span className={`ev-field-err${formErrors.attendees ? " visible" : ""}`}>Please enter the number of attendees.</span>
                </div>
              </div>

              <div className="ev-form-section ev-form-section--textarea">
                <label className="ev-form-section__label" htmlFor="ev-requests">Additional requests</label>
                <textarea id="ev-requests" name="requests" rows={4} value={form.requests}
                  placeholder="Special requests or notes (optional)"
                  onChange={handleFormChange} />
              </div>

              {/* Payment Options */}
              <div className="ev-form-section ev-form-section--payment">
                <div className="ev-form-section__head">
                  <CardIcon aria-hidden />
                  <h3 className="ev-form-section__title">Payment options</h3>
                </div>
                <p className="ev-form-section__desc">
                  Pay with cash on arrival, or choose GCash to scan and save your payment details in this form. Saving GCash details does not send your booking until you click Submit Reservation and confirm.
                </p>
                <div className="ev-payment-options">
                  <label className={`ev-payment-card${form.payment === "cash" ? " ev-selected" : ""}`}
                    onClick={() => selectPayment("cash")}>
                    <input type="radio" name="evPayment" value="cash" readOnly checked={form.payment === "cash"} />
                    <div className="ev-payment-card-inner">
                      <CashPayIcon />
                      <strong>Cash</strong>
                      <span>Pay at the venue — no online form needed</span>
                    </div>
                  </label>
                  <label className={`ev-payment-card${form.payment === "gcash" ? " ev-selected" : ""}`}
                    onClick={() => selectPayment("gcash")}>
                    <input type="radio" name="evPayment" value="gcash" readOnly checked={form.payment === "gcash"} />
                    <div className="ev-payment-card-inner">
                      <div className="ev-payment-gcash-icon-wrap">
                        <img src={GCASH_CARD_ICON} alt="" className="ev-payment-logo-gcash" width={32} height={32} decoding="async" />
                      </div>
                      <strong>GCash</strong>
                      <span>Scan QR and fill in amount, date, and proof</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Terms */}
              <div className="ev-terms-block">
                <h3 className="ev-terms-title">Terms and Conditions</h3>
                <div className="ev-terms-body">
                  <ol>
                    <li><strong>Valid Identification Required</strong>
                      <ul>
                        <li>All guests are required to present a valid government-issued ID upon check-in.</li>
                        <li>Failure to provide valid identification may result in denial of entry.</li>
                      </ul>
                    </li>
                    <li><strong>Verification &amp; Confirmation</strong>
                      <ul><li>The management reserves the right to verify the authenticity of submitted identification documents.</li></ul>
                    </li>
                  </ol>
                </div>
                <label className={`ev-checkbox-label${formErrors.chkTerms ? " ev-check-error" : ""}`}>
                  <input type="checkbox" checked={!!form.chkTerms}
                    onChange={e => { setForm(f => ({ ...f, chkTerms: e.target.checked })); setFormErrors(fe => ({ ...fe, chkTerms: false })); }} />
                  I have read and accept the <a href="#">Terms and Conditions</a>
                </label>
                <span className={`ev-field-err${formErrors.chkTerms ? " visible" : ""}`}>You must accept the Terms and Conditions.</span>
              </div>

              {/* Agreements */}
              <div className="ev-agreements-block">
                <h3 className="ev-agreements-title">Required Agreements</h3>
                <label className={`ev-checkbox-label${formErrors.chkPrivacy ? " ev-check-error" : ""}`}>
                  <input type="checkbox" checked={!!form.chkPrivacy}
                    onChange={e => { setForm(f => ({ ...f, chkPrivacy: e.target.checked })); setFormErrors(fe => ({ ...fe, chkPrivacy: false })); }} />
                  I have read and agree to the <a href="#">Data Privacy &amp; Policy</a>
                </label>
                <span className={`ev-field-err${formErrors.chkPrivacy ? " visible" : ""}`}>Please agree to the Data Privacy Policy.</span>
                <label className={`ev-checkbox-label${formErrors.chkTOS ? " ev-check-error" : ""}`}>
                  <input type="checkbox" checked={!!form.chkTOS}
                    onChange={e => { setForm(f => ({ ...f, chkTOS: e.target.checked })); setFormErrors(fe => ({ ...fe, chkTOS: false })); }} />
                  I have read and agree to the <a href="#">Terms &amp; Conditions of Stay</a>
                </label>
                <span className={`ev-field-err${formErrors.chkTOS ? " visible" : ""}`}>Please agree to the Terms &amp; Conditions of Stay.</span>
              </div>

              {resPick && (form.date || form.eventName.trim() || form.customerName.trim()) ? (
                <div className="ev-booking-review-summary" aria-labelledby="ev-booking-review-title">
                  <h3 id="ev-booking-review-title" className="ev-booking-review-summary__title">
                    Booking summary
                  </h3>
                  <ul className="ev-booking-review-summary__list">
                    <li>
                      <span className="ev-booking-review-summary__k">Venue</span>
                      <span className="ev-booking-review-summary__v">{resPick.name}</span>
                    </li>
                    <li>
                      <span className="ev-booking-review-summary__k">Event</span>
                      <span className="ev-booking-review-summary__v">{form.eventName.trim() || "—"}</span>
                    </li>
                    <li>
                      <span className="ev-booking-review-summary__k">Date</span>
                      <span className="ev-booking-review-summary__v">{form.date || "—"}</span>
                    </li>
                    <li>
                      <span className="ev-booking-review-summary__k">Time</span>
                      <span className="ev-booking-review-summary__v">
                        {buildEventTimeSlotLabel(form.startTime, form.endTime) || "—"}
                      </span>
                    </li>
                    <li>
                      <span className="ev-booking-review-summary__k">Duration</span>
                      <span className="ev-booking-review-summary__v">
                        {Number(durationHoursForBill) > 0 ? `${durationHoursForBill} h` : "—"}
                      </span>
                    </li>
                    <li>
                      <span className="ev-booking-review-summary__k">Contact</span>
                      <span className="ev-booking-review-summary__v">{form.customerName.trim() || "—"}</span>
                    </li>
                    {eventBookingBill ? (
                      <li>
                        <span className="ev-booking-review-summary__k">Total due</span>
                        <span className="ev-booking-review-summary__v">{formatPeso(eventBookingBill.total)}</span>
                      </li>
                    ) : null}
                    {eventLivePayment ? (
                      <li>
                        <span className="ev-booking-review-summary__k">Remaining balance</span>
                        <span className="ev-booking-review-summary__v">{formatPeso(eventLivePayment.balanceDue)}</span>
                      </li>
                    ) : null}
                    <li>
                      <span className="ev-booking-review-summary__k">Payment</span>
                      <span className="ev-booking-review-summary__v">{form.payment === "gcash" ? "GCash" : "Cash on arrival"}</span>
                    </li>
                    {form.payment === "gcash" && pendingGcash ? (
                      <li>
                        <span className="ev-booking-review-summary__k">GCash</span>
                        <span className="ev-booking-review-summary__v">
                          {formatEvPeso(pendingGcash.paidNum)} on {pendingGcash.date}, ref. {pendingGcash.txId}
                          {pendingGcash.proofPreview ? " · Proof attached" : ""}
                        </span>
                      </li>
                    ) : form.payment === "gcash" ? (
                      <li>
                        <span className="ev-booking-review-summary__k">GCash</span>
                        <span className="ev-booking-review-summary__v ev-booking-review-summary__v--muted">
                          Not saved yet — click Submit Reservation to open the payment form.
                        </span>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {form.payment === "gcash" && pendingGcash ? (
                <p className="ev-gcash-draft-note" role="status">
                  GCash details are saved in this form only. Review the summary above, then click Submit Reservation to send your request.
                </p>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="btn-clear" onClick={clearResForm}>Clear</button>
                <button type="button" className="btn-submit-reservation" onClick={handleSubmitRes} disabled={resSubmitting}>
                  {resSubmitting ? "Sending…" : "Submit Reservation"}
                </button>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- PAYMENT MODAL -- */}
      {payOpen && (
        <div id="evPaymentBackdrop" className="ev-modal-backdrop active"
          onClick={e => { if (e.target === e.currentTarget) closePay(); }}>
          <div className="ev-modal ev-payment-modal">
            <div className="ev-modal-header">
              <h2 className="ev-modal-title">GCash Payment</h2>
              <button type="button" className="ev-modal-close" onClick={closePay} aria-label="Close">{"\u2715"}</button>
            </div>
            <div className="ev-modal-body ev-payment-modal-body">
              <div className="ev-payment-qr-side">
                <div className="ev-payment-qr-brand">
                  <div className={`ev-qr-payment-frame${payQrMissing ? " ev-qr-payment-frame--empty" : ""}`}>
                    {!payQrMissing && (
                      <img
                        src={GCASH_PAYMENT_QR}
                        alt=""
                        className="ev-qr-img ev-qr-img-payment"
                        decoding="async"
                        onError={() => setPayQrMissing(true)}
                      />
                    )}
                    {payQrMissing && (
                      <div className="ev-qr-payment-placeholder" aria-hidden>
                        <span className="ev-qr-payment-placeholder-label">QR code</span>
                      </div>
                    )}
                  </div>
                  <p className="ev-qr-name">GCash</p>
                </div>
                <p className="ev-gcash-handle">@Abela Suites</p>
              </div>
              <div className="ev-payment-form-side">
                <p className="ev-payment-modal-lead">
                  Enter your transfer details and proof here. This only saves them in your booking form — your reservation is not sent until you click Submit Reservation and confirm.
                </p>
                <div className="ev-payment-form-scroll">
                  <h3 className="ev-payment-form-title">Fill this Form</h3>
                  {eventVenueBill ? (
                    <div className="ev-pay-billing-recap" aria-live="polite">
                      <p className="ev-pay-billing-recap__label">Amount due (this booking)</p>
                      <p className="ev-pay-billing-recap__total">{formatEvPeso(eventVenueBill.total)}</p>
                      <ul className="ev-pay-billing-recap__list">
                        <li>Base ({EVENT_BASE_INCLUDED_HOURS} h): {formatEvPeso(eventVenueBill.basePrice)}</li>
                        {eventVenueBill.extraHours > 0 ? (
                          <li>
                            Extra {eventVenueBill.extraHours} h @ {formatEvPeso(eventVenueBill.hourlyRate)}/h:{" "}
                            {formatEvPeso(eventVenueBill.additionalCharge)}
                          </li>
                        ) : (
                          <li>No extra-hour charges</li>
                        )}
                      </ul>
                    </div>
                  ) : null}
                  <div className="ev-payment-form-grid">
                    <div className="ev-form-group">
                      <label>Amount Paid <span style={{ color: "#e74c3c" }}>*</span></label>
                      <input type="text" name="amount" value={payForm.amount}
                        placeholder="e.g. 1,148"
                        className={payErrors.amount ? "ev-error" : ""}
                        onChange={handlePayFormChange} />
                      <span className={`ev-field-err${payErrors.amount ? " visible" : ""}`}>Amount paid is required.</span>
                    </div>
                    <div className="ev-form-group">
                      <label>Date <span style={{ color: "#e74c3c" }}>*</span></label>
                      <input type="date" name="date" value={payForm.date}
                        className={payErrors.date ? "ev-error" : ""}
                        onChange={handlePayFormChange} />
                      <span className={`ev-field-err${payErrors.date ? " visible" : ""}`}>Payment date is required.</span>
                    </div>
                  </div>
                  <div className="ev-form-group ev-payment-form-group--spaced">
                    <label>Transaction ID <span style={{ color: "#e74c3c" }}>*</span></label>
                    <input type="text" name="txId" value={payForm.txId}
                      placeholder="Enter transaction ID"
                      className={payErrors.txId ? "ev-error" : ""}
                      onChange={handlePayFormChange} />
                    <span className={`ev-field-err${payErrors.txId ? " visible" : ""}`}>Transaction ID is required.</span>
                  </div>
                  <div className="ev-form-group ev-payment-form-group--spaced">
                    <label>Proof of Payment <span style={{ color: "#e74c3c" }}>*</span></label>
                    <label className={`ev-upload-box ev-proof-upload${payErrors.proof ? " ev-error" : ""}`}>
                      <input type="file" accept="image/*" onChange={handleProofUpload} />
                      {proofPreview
                        ? <img src={proofPreview} className="ev-upload-preview" alt="Proof Preview" />
                        : <div className="ev-upload-placeholder"><UploadIcon /><span>Upload your proof of payment here...</span></div>}
                    </label>
                    <span className={`ev-field-err${payErrors.proof ? " visible" : ""}`}>Please upload proof of payment.</span>
                  </div>
                </div>
                <div className="ev-payment-form-actions">
                  <button type="button" className="ev-btn-clear" onClick={clearPayForm}>
                    Clear
                  </button>
                  <button type="button" className="ev-btn-submit" onClick={submitPayment}>
                    Save payment details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -- CONFIRM DIALOG -- */}
      {confirmOpen && (
        <div className="ev-confirm-backdrop active">
          <div className="ev-confirm-dialog">
            <div className="ev-confirm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="ev-confirm-exclaim">!</span>
            </div>
            <h3 className="ev-confirm-title">Submit reservation?</h3>
            <p className="ev-confirm-sub">Please confirm the details below. This sends your request to the venue.</p>
            {resPick ? (
              <div className="ev-confirm-booking-summary">
                <p><strong>Venue</strong> {resPick.name}</p>
                <p><strong>Event</strong> {form.eventName.trim() || "—"}</p>
                <p>
                  <strong>Date</strong> {form.date || "—"} · <strong>Time</strong>{" "}
                  {buildEventTimeSlotLabel(form.startTime, form.endTime) || "—"}
                </p>
                {eventVenueBill ? (
                  <p><strong>Total due</strong> {formatEvPeso(eventVenueBill.total)}</p>
                ) : null}
                <p><strong>Payment</strong> {form.payment === "gcash" ? "GCash" : "Cash on arrival"}</p>
                {form.payment === "gcash" && pendingGcash ? (
                  <p>
                    <strong>GCash</strong> {formatEvPeso(pendingGcash.paidNum)} on {pendingGcash.date} · Ref. {pendingGcash.txId}
                    {pendingGcash.proofPreview ? " · Proof attached" : ""}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="ev-confirm-btns">
              <button type="button" className="ev-btn-cancel-confirm" onClick={() => setConfirmOpen(false)} disabled={resSubmitting}>
                Cancel
              </button>
              <button type="button" className="ev-btn-submit-confirm" onClick={confirmSubmit} disabled={resSubmitting}>
                {resSubmitting ? "Sending…" : "Confirm & submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Booking submitted toast (same UX as Rooms — no full-page scrim) -- */}
      {bookingSuccessToast && (
        <div className="booking-success-toast-anchor" aria-live="polite">
          <div className="booking-success-toast" role="status">
            <button
              type="button"
              className="booking-success-toast__close"
              aria-label="Dismiss notification"
              onClick={() => setBookingSuccessToast(null)}
            >
              ×
            </button>
            <div className="booking-success-toast__icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="booking-success-toast__title">Submitted Successfully!</h2>
            <p className="booking-success-toast__text">
              {bookingSuccessToast === "gcash"
                ? "Your booking and GCash payment are under review. Please wait for an SMS confirmation."
                : "Your booking is under review. Please wait for an SMS confirmation."}
            </p>
          </div>
        </div>
      )}

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}