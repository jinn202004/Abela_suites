import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getStoredAuthToken } from "../api/authApi";
import TopbarAvatar from "../topbar/TopbarAvatar";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { computeRoomAvailabilitySearch } from "./roomAvailabilitySearch";
import { isRoomAvailableForDates } from "./guestAvailability";
import {
  parseLocalYmd,
  formatLocalYmd,
  formatLocalTodayYmd,
  countStayNights,
  blockedCheckInSetFromRanges,
  splitGuestStayNightsByTone,
  addLocalDays,
} from "./roomStayDates";
import {
  computeRoomBookingBill,
  paymentSnapshotFromBill,
  formatPeso,
} from "./bookingBilling";
import BillingSummary from "./BillingSummary";
import BillingPaymentPills from "./BillingPaymentPills";
import "./billing-summary.css";
import { fetchRoomBookedRangesMerged } from "./roomBookingOccupancy";
import {
  createBookingBackend,
  fetchRoomsCatalog,
  fetchRoomAvailabilityWindow,
  bookingSaveAlertMessage,
  dispatchFrontdeskNotificationsRefresh,
  dispatchGuestBookingsRefreshPing,
  GUEST_BOOKINGS_STORAGE_PING_KEY,
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
import { DayPicker, labelDayButton as defaultLabelDayButton } from "react-day-picker";
import "react-day-picker/style.css";
import "./guest-room.css";

/** GCash mark for payment card: `public/Gcash.png`. Scan-to-pay QR: `public/gcash-payment-qr.png`. */
const GCASH_CARD_ICON = "/Gcash.png";

/** Scan-to-pay QR: `public/QR.png` (or change GCASH_PAYMENT_QR). */
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
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  { label: "Rooms",        icon: <RoomIcon />,     href: "/rooms", active: true                       },
  { label: "Event Venues", icon: <EventIcon />,    href: "/event-venues"                },
  { label: "Archive",      icon: <GuestArchiveIcon />, href: "/booking-history" },
  { label: "Settings",     icon: <SettingsIcon />, href: "/settings"  },
];

function formatRoomPriceDisplay(n) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const num = Number(n);
  return `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Map `GET /api/rooms` items to the UI card shape (see `be/abela-be/README.md`). */
function mapApiRoomToView(api) {
  const priceNum = Number(api.price);
  const guests = Math.max(1, parseInt(String(api.guests), 10) || 1);
  const name =
    String(api.package ?? "").trim() ||
    String(api.title ?? "").trim() ||
    `Room ${String(api.roomNumber ?? "").trim() || "—"}`;
  return {
    id: String(api.id ?? ""),
    roomNumber: String(api.roomNumber ?? "").trim(),
    name,
    priceOld: null,
    priceNew: formatRoomPriceDisplay(api.price),
    priceNum: Number.isFinite(priceNum) ? priceNum : 0,
    maxGuests: guests,
    guestLabel: `Up to ${guests} Guest${guests > 1 ? "s" : ""}`,
    desc: String(api.description ?? "").trim() || "—",
    features: Array.isArray(api.features) && api.features.length ? api.features : [],
    img: String(api.image ?? "").trim() || "https://placehold.co/800x500/f5f5f5/666666?text=Room",
    packageLabel: String(api.package ?? api.title ?? "").trim(),
  };
}

// --- Helpers ---
function parsePriceToNumber(priceStr) {
  const n = Number(String(priceStr || "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatStayDateLabel(ymd) {
  const d = parseLocalYmd(ymd);
  if (!d) return String(ymd || "").trim() || "—";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function buildRoomReservationPayload(
  viewRooms,
  form,
  resRoom,
  { bill, paymentAmountNum = 0, transactionId = "", idDataUrl = null, paymentProofData = "", paymentDate = "" } = {},
) {
  const room = viewRooms.find((r) => r.name === resRoom);
  const total = bill?.total ?? 0;
  const email = form.customerEmail.trim().toLowerCase();
  const hasId = isHttpImageUrl(idDataUrl);
  const hasProof = isHttpImageUrl(paymentProofData);
  return {
    roomId: String(room?.id ?? ""),
    customerName: form.customerName.trim(),
    email,
    customerEmail: email,
    contactNumber: form.contactNumber.trim(),
    address: form.customerAddress.trim(),
    checkIn: form.checkInDate,
    checkOut: form.checkOutDate,
    additionalGuests: Math.max(0, parseInt(form.additionalGuest, 10) || 0),
    guestIdPhotoName: hasId ? "uploaded" : "default.png",
    guestIdPhotoData: hasId ? idDataUrl : "",
    additionalRequests: (form.additionalRequests || "").trim(),
    roomTitle: resRoom,
    roomNumber: String(room?.roomNumber ?? "").trim(),
    createdAt: new Date().toISOString(),
    status: "pending",
    totalStayAmount: total > 0 ? total.toFixed(2) : "0",
    roomTotal: total > 0 ? total.toFixed(2) : "0",
    minimumDownPayment: String(bill?.minimumDownPayment ?? 0),
    paymentAmount: String(paymentAmountNum),
    paymentMethod: form.payment === "gcash" ? "Gcash" : "Cash",
    ...(transactionId ? { transactionId } : {}),
    paymentDate: String(paymentDate || "").trim(),
    paymentProofData: hasProof ? paymentProofData : "",
    paymentProofName: hasProof ? "uploaded" : "",
  };
}

/** Body for `POST /api/bookings` (`type: "room"`). */
function roomPayloadToApi(p) {
  return {
    type: "room",
    customerName: p.customerName,
    email: p.email,
    contactNumber: p.contactNumber,
    address: p.address,
    roomId: p.roomId,
    roomNumber: String(p.roomNumber ?? "").trim(),
    roomTitle: String(p.roomTitle ?? "").trim(),
    checkIn: p.checkIn,
    checkOut: p.checkOut,
    additionalGuests: p.additionalGuests,
    guestIdPhotoName: p.guestIdPhotoName,
    guestIdPhotoData: p.guestIdPhotoData,
    additionalRequests: p.additionalRequests,
    totalAmount: p.totalStayAmount || p.roomTotal || "0",
    paymentAmount: p.paymentAmount,
    paymentMethod: p.paymentMethod,
    transactionId: p.transactionId || "",
    paymentDate: p.paymentDate || "",
    paymentProofData: p.paymentProofData || "",
    paymentProofName: p.paymentProofName || "",
  };
}

async function saveRoomReservation(p) {
  await createBookingBackend(roomPayloadToApi(p));
}

const today = formatLocalTodayYmd();

// ============================================================
export default function Rooms() {
  const location = useLocation();
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
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(null);
  /** After a successful availability search, list only rooms that match dates + PAX. */
  const [availabilityFilterActive, setAvailabilityFilterActive] = useState(false);
  const [availSearchLoading, setAvailSearchLoading] = useState(false);
  // Availability bar
  const [barCheckIn, setBarCheckIn]   = useState("");
  const [barCheckOut, setBarCheckOut] = useState("");
  const [barGuests, setBarGuests]     = useState("1");
  const [availError, setAvailError] = useState(null);
  const [roomStatuses, setRoomStatuses] = useState({});

  // Reservation modal
  const [resOpen, setResOpen]   = useState(false);
  const [resRoom, setResRoom]   = useState("");
  const [form, setForm] = useState({
    customerName: "", customerEmail: "", contactNumber: "", customerAddress: "",
    checkInDate: "", checkOutDate: "", additionalGuest: "", additionalRequests: "",
    payment: "cash", termsCheck: false, privacyCheck: false, stayCheck: false,
  });
  const [idFile, setIdFile]         = useState(null);
  const [idPreview, setIdPreview]   = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [roomOccupancyRanges, setRoomOccupancyRanges] = useState([]);
  const [occupancyLoading, setOccupancyLoading] = useState(false);
  const [occupancyErr, setOccupancyErr] = useState("");
  /** Bumped when front desk approves/rejects (or other tabs) so calendars refetch server occupancy. */
  const [guestBookingsPing, setGuestBookingsPing] = useState(0);

  // Payment modal
  const [payOpen, setPayOpen]   = useState(false);
  const [payQrMissing, setPayQrMissing] = useState(false);
  const [payForm, setPayForm]   = useState({ amount: "", date: "", txId: "" });
  const [proofFile, setProofFile]       = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [payErrors, setPayErrors]       = useState({});
  /** GCash details + proof saved in the form until the guest confirms submission (not sent to the server yet). */
  const [pendingGcash, setPendingGcash] = useState(null);

  // Confirm & success (toast only — no full-screen overlay)
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** null | "room" (cash / direct submit) | "gcash" (payment flow) */
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

  useEffect(() => {
    const onMouseDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [notifRef, setNotifOpen]);

  useEffect(() => {
    if (!bookingSuccessToast) return undefined;
    const t = window.setTimeout(() => setBookingSuccessToast(null), 5200);
    return () => window.clearTimeout(t);
  }, [bookingSuccessToast]);

  useEffect(() => {
    if (payOpen) setPayQrMissing(false);
  }, [payOpen]);

  /** Load catalog when the guest opens the Rooms page (sidebar “Rooms” / route `/rooms`). */
  useEffect(() => {
    let cancelled = false;
    setRoomsLoading(true);
    setRoomsError(null);
    fetchRoomsCatalog()
      .then((list) => {
        if (cancelled) return;
        setRooms(list.map(mapApiRoomToView));
      })
      .catch(() => {
        if (cancelled) return;
        setRooms([]);
        setRoomsError(
          "Could not load rooms. Check that the API is running and `VITE_API_BASE_URL` matches your backend (or leave it unset to use /api via the dev proxy)."
        );
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [location.key]);

  const displayedRooms = useMemo(() => {
    if (!availabilityFilterActive) return rooms;
    return rooms.filter((r) => roomStatuses[r.id]?.ok);
  }, [rooms, availabilityFilterActive, roomStatuses]);

  const resRoomId = useMemo(() => {
    const r = rooms.find((x) => x.name === resRoom);
    return r ? String(r.id) : "";
  }, [rooms, resRoom]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.name === resRoom) ?? null,
    [rooms, resRoom],
  );

  const nightlyRateForBill = useMemo(() => {
    if (!selectedRoom) return 0;
    if (selectedRoom.priceNum > 0) return selectedRoom.priceNum;
    return parsePriceToNumber(selectedRoom.priceNew);
  }, [selectedRoom]);

  const stayNightsCount = useMemo(() => {
    if (!form.checkInDate || !form.checkOutDate) return 0;
    return countStayNights(form.checkInDate, form.checkOutDate);
  }, [form.checkInDate, form.checkOutDate]);

  const stayBill = useMemo(() => {
    if (!selectedRoom || !form.checkInDate || !form.checkOutDate) return null;
    if (stayNightsCount < 1) return null;
    return computeRoomBookingBill({
      roomTitle: resRoom,
      nightlyRate: nightlyRateForBill,
      checkIn: form.checkInDate,
      checkOut: form.checkOutDate,
      includedGuests: selectedRoom.maxGuests,
      additionalGuests: form.additionalGuest,
    });
  }, [
    selectedRoom,
    resRoom,
    form.checkInDate,
    form.checkOutDate,
    form.additionalGuest,
    stayNightsCount,
    nightlyRateForBill,
  ]);

  const livePayment = useMemo(() => {
    if (!stayBill) return null;
    const paidNum =
      form.payment === "gcash" && pendingGcash
        ? Number(pendingGcash.paidNum) || 0
        : 0;
    return paymentSnapshotFromBill(stayBill, paidNum);
  }, [stayBill, form.payment, pendingGcash]);

  const occupancyWindowTo = useMemo(() => addLocalDays(today, 540), []);

  const occupancyRangesForAvailability = useMemo(
    () =>
      roomOccupancyRanges.map((b) => ({
        roomId: resRoomId,
        checkIn: String(b.checkIn ?? "").trim(),
        checkOut: String(b.checkOut ?? "").trim(),
      })),
    [roomOccupancyRanges, resRoomId],
  );

  const blockedCheckInSet = useMemo(() => blockedCheckInSetFromRanges(roomOccupancyRanges), [roomOccupancyRanges]);

  const { occupiedNightSet, reservedNightSet } = useMemo(
    () => splitGuestStayNightsByTone(roomOccupancyRanges),
    [roomOccupancyRanges],
  );

  const bookingCalendarLabels = useMemo(
    () => ({
      labelDayButton(date, modifiers, options, dateLib) {
        let label = defaultLabelDayButton(date, modifiers, options, dateLib);
        const key = formatLocalYmd(date);
        if (resRoomId && blockedCheckInSet.has(key)) {
          const detail = occupiedNightSet.has(key)
            ? " In-house stay (guest is currently checked in)."
            : " This night is already reserved for this room.";
          label = `${label}.${detail} You cannot choose it as your check-in date.`;
        }
        return label;
      },
    }),
    [resRoomId, blockedCheckInSet, occupiedNightSet],
  );

  const checkInDisabledMatchers = useMemo(() => {
    const t0 = parseLocalYmd(today);
    return [t0 ? { before: t0 } : { before: new Date() }, (date) => blockedCheckInSet.has(formatLocalYmd(date))];
  }, [blockedCheckInSet, today]);

  const checkoutDisabledMatcher = useCallback(
    (date) => {
      if (!form.checkInDate) return true;
      const s = formatLocalYmd(date);
      if (s <= form.checkInDate) return true;
      if (!resRoomId) return false;
      return !isRoomAvailableForDates(resRoomId, form.checkInDate, s, occupancyRangesForAvailability);
    },
    [form.checkInDate, resRoomId, occupancyRangesForAvailability],
  );

  useEffect(() => {
    function bumpOccupancyRefresh() {
      setGuestBookingsPing((n) => n + 1);
    }
    window.addEventListener("abela-guest-bookings-ping", bumpOccupancyRefresh);
    function onStorage(e) {
      if (e.key === GUEST_BOOKINGS_STORAGE_PING_KEY) bumpOccupancyRefresh();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("abela-guest-bookings-ping", bumpOccupancyRefresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!resOpen || !resRoomId) return undefined;
    let cancelled = false;
    setOccupancyLoading(true);
    setOccupancyErr("");
    (async () => {
      try {
        const { ranges, primaryErr } = await fetchRoomBookedRangesMerged(resRoomId, today, occupancyWindowTo);
        if (!cancelled) {
          setRoomOccupancyRanges(ranges);
          setOccupancyErr(ranges.length === 0 && primaryErr ? primaryErr : "");
        }
      } catch (e) {
        if (!cancelled) {
          setRoomOccupancyRanges([]);
          setOccupancyErr(e?.message || "Could not load room availability.");
        }
      } finally {
        if (!cancelled) setOccupancyLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resOpen, resRoomId, occupancyWindowTo, guestBookingsPing]);

  /** Changing dates or guest count exits the filtered view until the guest runs search again. */
  useEffect(() => {
    setAvailabilityFilterActive(false);
    setRoomStatuses({});
    setAvailError(null);
  }, [barCheckIn, barCheckOut, barGuests]);

  // --- Availability (server-backed overlaps + capacity) ---
  const checkAvailability = useCallback(async () => {
    if (!barCheckIn || !barCheckOut) {
      setAvailError("Please select both check-in and check-out.");
      return;
    }
    if (barCheckOut <= barCheckIn) {
      setAvailError("Check-out must be after check-in.");
      return;
    }
    if (new Date(barCheckIn) < new Date(today)) {
      setAvailError("Check-in cannot be in the past.");
      return;
    }
    if (rooms.length === 0) {
      setAvailError("No rooms loaded yet.");
      return;
    }

    setAvailSearchLoading(true);
    setAvailError(null);
    const snapIn = barCheckIn;
    const snapOut = barCheckOut;
    const snapGuests = barGuests;
    try {
      const windowData = await fetchRoomAvailabilityWindow(snapIn, snapOut);
      if (snapIn !== barCheckIn || snapOut !== barCheckOut || snapGuests !== barGuests) {
        return;
      }
      const guests = Math.max(1, parseInt(snapGuests, 10) || 1);
      const { statuses } = computeRoomAvailabilitySearch(
        rooms,
        windowData,
        barCheckIn,
        barCheckOut,
        guests,
      );
      setRoomStatuses(statuses);
      setAvailabilityFilterActive(true);
      setForm((f) => ({ ...f, checkInDate: snapIn, checkOutDate: snapOut }));
    } catch (err) {
      const msg =
        err?.message && /network|fetch|failed/i.test(String(err.message))
          ? "Could not reach the server. Check the API and try again."
          : err?.message || "Availability check failed.";
      setAvailError(msg);
      setRoomStatuses({});
      setAvailabilityFilterActive(false);
    } finally {
      setAvailSearchLoading(false);
    }
  }, [rooms, barCheckIn, barCheckOut, barGuests]);

  // --- Reservation (POST /api/bookings requires JWT — same as guest Home bookings) ---
  function openRes(name) {
    if (!getStoredAuthToken()) {
      if (
        window.confirm(
          "Sign-in is required to book a room. Open the Login page now? (After signing in, come back to Rooms.)",
        )
      ) {
        navigate("/login");
      }
      return;
    }
    setPendingGcash(null);
    setPayOpen(false);
    setConfirmOpen(false);
    clearPayForm();
    setRoomOccupancyRanges([]);
    setOccupancyErr("");
    setResRoom(name);
    setResOpen(true);
  }
  function closeRes() {
    setResOpen(false);
    setFormErrors({});
    setRoomOccupancyRanges([]);
    setOccupancyErr("");
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setFormErrors(fe => ({ ...fe, [name]: false }));
  }

  function handleSelectCheckIn(d) {
    const s = d ? formatLocalYmd(d) : "";
    setForm((f) => {
      const next = { ...f, checkInDate: s };
      if (
        f.checkOutDate &&
        (f.checkOutDate <= s ||
          (resRoomId &&
            !isRoomAvailableForDates(resRoomId, s, f.checkOutDate, occupancyRangesForAvailability)))
      ) {
        next.checkOutDate = "";
      }
      return next;
    });
    setFormErrors((fe) => ({ ...fe, checkInDate: false, checkOutDate: false }));
  }

  function handleSelectCheckOut(d) {
    const s = d ? formatLocalYmd(d) : "";
    setForm((f) => ({ ...f, checkOutDate: s }));
    setFormErrors((fe) => ({ ...fe, checkOutDate: false }));
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
        setFormErrors((fe) => ({ ...fe, id: msg || "Please upload a valid government ID." }));
        if (msg) window.alert(msg);
      },
    });
  }

  function validateRes() {
    const errs = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.customerName.trim())    errs.customerName = "Full name is required.";
    if (!form.customerEmail.trim())   errs.customerEmail = "Email address is required.";
    else if (!emailRegex.test(form.customerEmail.trim())) errs.customerEmail = "Please enter a valid email.";
    if (!form.contactNumber.trim())   errs.contactNumber = "Contact number is required.";
    if (!form.customerAddress.trim()) errs.customerAddress = "Address is required.";
    if (!form.checkInDate.trim())     errs.checkInDate = "Check-in date is required.";
    if (!form.checkOutDate.trim())    errs.checkOutDate = "Check-out date is required.";
    else if (form.checkInDate && form.checkOutDate <= form.checkInDate) errs.checkOutDate = "Check-out must be after check-in.";
    if (form.checkInDate && blockedCheckInSet.has(form.checkInDate)) {
      errs.checkInDate = "This check-in date is unavailable (already booked).";
    }
    if (
      resRoomId &&
      form.checkInDate &&
      form.checkOutDate &&
      !isRoomAvailableForDates(resRoomId, form.checkInDate, form.checkOutDate, occupancyRangesForAvailability)
    ) {
      errs.checkOutDate = "These dates overlap an existing stay for this room. Please adjust your check-out.";
    }
    if (!isBookingSubmitImageRef(idPreview)) errs.id = "Please upload a valid government ID.";
    if (!form.termsCheck)   errs.termsCheck = "You must accept the Terms and Conditions.";
    if (!form.privacyCheck) errs.privacyCheck = "You must agree to the Data Privacy & Policy.";
    if (!form.stayCheck)    errs.stayCheck = "You must agree to the Terms & Conditions of Stay.";
    if (
      form.checkInDate &&
      form.checkOutDate &&
      form.checkOutDate > form.checkInDate &&
      resRoom &&
      (!stayBill || !(stayBill.total > 0))
    ) {
      errs.checkOutDate = "Could not calculate the stay total. Please verify your dates and room.";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmitRes() {
    if (!validateRes()) return;
    if (form.payment === "gcash" && !pendingGcash) {
      openGcashPaymentModal();
      return;
    }
    setConfirmOpen(true);
  }

  function preparePayModalFromDraft() {
    setPayErrors({});
    if (pendingGcash) {
      setPayForm({
        amount: pendingGcash.amount,
        date: pendingGcash.date,
        txId: pendingGcash.txId,
      });
      setProofPreview(pendingGcash.proofPreview || null);
      setProofFile(null);
    } else {
      clearPayForm();
    }
  }

  function openGcashPaymentModal() {
    preparePayModalFromDraft();
    setPayOpen(true);
  }

  async function confirmSubmit() {
    if (!getStoredAuthToken()) {
      window.alert(bookingSaveAlertMessage({ code: "NO_TOKEN" }));
      setConfirmOpen(false);
      return;
    }
    const roomMeta = rooms.find((r) => r.name === resRoom);
    if (!roomMeta || !form.checkInDate || !form.checkOutDate) {
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
        const payload = buildRoomReservationPayload(rooms, form, resRoom, {
          bill: stayBill,
          paymentAmountNum: pendingGcash.paidNum,
          transactionId: pendingGcash.txId,
          idDataUrl: idUrl,
          paymentProofData: proofUrl,
          paymentDate: pendingGcash.date,
        });
        await saveRoomReservation(payload);
        dispatchFrontdeskNotificationsRefresh();
        dispatchGuestBookingsRefreshPing();
        try {
          sessionStorage.setItem("abela_guest_email", payload.email);
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
      const payload = buildRoomReservationPayload(rooms, form, resRoom, {
        bill: stayBill,
        paymentAmountNum: 0,
        idDataUrl: idUrl,
      });
      await saveRoomReservation(payload);
      dispatchFrontdeskNotificationsRefresh();
      dispatchGuestBookingsRefreshPing();
      try {
        sessionStorage.setItem("abela_guest_email", payload.email);
      } catch {
        /* ignore */
      }
      setConfirmOpen(false);
      setResOpen(false);
      clearResForm();
      setBookingSuccessToast("room");
    } catch (err) {
      window.alert(bookingSaveAlertMessage(err));
    } finally {
      setResSubmitting(false);
    }
  }

  function clearPayForm() {
    setPayForm({ amount:"", date:"", txId:"" });
    setProofFile(null); setProofPreview(null);
    setPayErrors({});
  }

  function clearResForm() {
    setForm({ customerName:"", customerEmail:"", contactNumber:"", customerAddress:"", checkInDate:"", checkOutDate:"", additionalGuest:"", additionalRequests:"", payment:"cash", termsCheck:false, privacyCheck:false, stayCheck:false });
    setIdFile(null); setIdPreview(null);
    setFormErrors({});
    setPayOpen(false);
    setPendingGcash(null);
    clearPayForm();
  }

  // --- Payment: Cash = selection only; GCash opens upload / details modal ---
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
        setPayErrors((pe) => ({ ...pe, proof: msg || "Please upload proof of payment." }));
        if (msg) window.alert(msg);
      },
    });
  }

  function submitPayment() {
    const errs = {};
    if (!payForm.amount.trim()) errs.amount = "Amount paid is required.";
    if (!payForm.date.trim())   errs.date = "Payment date is required.";
    if (!payForm.txId.trim())   errs.txId = "Transaction ID is required.";
    if (!isBookingSubmitImageRef(proofPreview)) errs.proof = "Please upload proof of payment.";
    setPayErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (form.payment !== "gcash") {
      closePay();
      return;
    }

    if (!form.checkInDate || !form.checkOutDate || !resRoom) {
      window.alert("Reservation details are missing. Please start your booking again.");
      return;
    }
    if (!getStoredAuthToken()) {
      window.alert(bookingSaveAlertMessage({ code: "NO_TOKEN" }));
      return;
    }

    const paid = parsePriceToNumber(payForm.amount);
    const stayTotal = stayBill?.total ?? 0;
    const minDown = stayBill?.minimumDownPayment ?? 0;
    if (stayTotal > 0 && paid > stayTotal) {
      setPayErrors((prev) => ({
        ...prev,
        amount: `Amount paid cannot be greater than your stay total (${formatPeso(stayTotal)}).`,
      }));
      return;
    }
    if (minDown > 0 && paid < minDown) {
      setPayErrors((prev) => ({
        ...prev,
        amount: `Minimum down payment is ${formatPeso(minDown)}.`,
      }));
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

  return (
    <>
      <RailPortalShell
        rootClassName="guest-room-page guest-portal-layout"
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
        {/* ── TOPBAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <HousekeepingSidebarToggle
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              mobileSidebarOpen={mobileSidebarOpen}
            />
            <span className="breadcrumb-title">Rooms</span>
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
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
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

        {/* ── CONTENT ── */}
        <main className="content">

          {/* Availability Bar */}
          <div className="availability-bar">
            <div className="avail-field">
              <label>Check In Date</label>
              <input type="date" min={today} value={barCheckIn}
                onChange={e => { setBarCheckIn(e.target.value); if (barCheckOut && barCheckOut <= e.target.value) setBarCheckOut(""); }} />
            </div>
            <div className="avail-field">
              <label>Check Out Date</label>
              <input type="date" min={barCheckIn || today} value={barCheckOut}
                onChange={e => setBarCheckOut(e.target.value)} />
            </div>
            <div className="avail-field">
              <label>Guests</label>
              <select value={barGuests} onChange={e => setBarGuests(e.target.value)}>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="avail-field">
              <label>Check Availability</label>
              <button
                type="button"
                className="btn-availability"
                disabled={availSearchLoading || roomsLoading}
                onClick={() => void checkAvailability()}
              >
                {availSearchLoading ? "Checking…" : "Availability"}
              </button>
            </div>
          </div>

          {availError ? <p className="avail-error-line">{availError}</p> : null}

          {roomsError ? <p className="avail-error-line avail-error-line--rooms">{roomsError}</p> : null}

          {/* Room Cards */}
          <div className="rooms-list">
            {roomsLoading && (
              <p style={{ padding: "24px", color: "#666" }}>Loading rooms…</p>
            )}
            {!roomsLoading && !roomsError && rooms.length === 0 && (
              <p style={{ padding: "24px", color: "#666" }}>No rooms are published yet.</p>
            )}
            {!roomsLoading && !roomsError && rooms.length > 0 && displayedRooms.length === 0 && (
              <div className="rooms-empty-search" role="status">
                <p className="rooms-empty-search__text">No rooms match these dates and guest count.</p>
              </div>
            )}
            {displayedRooms.map((r) => {
              const st = roomStatuses[r.id];
              const isUnavailable = Boolean(st && !st.ok);
              const highlightMatch = Boolean(availabilityFilterActive && st?.ok);
              return (
                <div
                  key={r.id}
                  className={`room-card${isUnavailable ? " unavailable" : ""}${highlightMatch ? " room-card--search-match" : ""}`}
                >
                  <span className={`avail-badge${st ? (st.ok ? " badge-available" : " badge-unavailable") : ""}`}>
                    {st && !st.ok ? <XIcon /> : <CheckIcon />}
                    <span>{st ? st.label : "Available"}</span>
                  </span>
                  <div className="room-img-wrap">
                    <div className="room-img-aspect">
                      <img src={r.img} alt={r.name} decoding="async" />
                    </div>
                  </div>
                  <div className="room-info">
                    <h2 className="room-name">{r.name}</h2>
                    <p className="room-type-line">
                      <span className="room-type-label">Type</span>{" "}
                      <span className="room-type-value">{r.packageLabel || "Room"}</span>
                    </p>
                    <div className="room-pricing">
                      {r.priceOld && <span className="room-price-old">{r.priceOld}</span>}
                      <span className="room-price-new">{r.priceNew}</span>
                      <span className="room-guests">
                        <GuestsIcon /> {r.guestLabel}
                      </span>
                    </div>
                    <p className="room-desc">{r.desc}</p>
                    <p className="features-label">Features:</p>
                    <div className="features-grid">
                      {r.features.map((f) => (
                        <span key={f} className="feature-item">
                          ✔ {f}
                        </span>
                      ))}
                    </div>
                    <div className="room-footer">
                      <span className="dates-tag">{st?.dateLabel || ""}</span>
                      <button
                        className="btn-book-now"
                        disabled={isUnavailable}
                        onClick={() => openRes(r.name)}
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </RailPortalShell>

      {/* ══ RESERVATION MODAL ══ */}
      {resOpen && (
        <div className="modal-backdrop active"
          onClick={e => { if (e.target === e.currentTarget) closeRes(); }}>
          <div className="modal modal--booking" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title">
            <div className="modal-header modal-header--booking">
              <h2 id="booking-modal-title" className="modal-title">{resRoom} — Reservation</h2>
              <button type="button" className="modal-close" onClick={closeRes} aria-label="Close">✕</button>
            </div>
            <div className="modal-body modal-body--booking">
              <div className="booking-form">

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="booking-customer-name">Full name <span className="required">*</span></label>
                  <input id="booking-customer-name" type="text" name="customerName" value={form.customerName}
                    placeholder="Enter your full name"
                    className={formErrors.customerName ? "input-error" : ""}
                    onChange={handleFormChange} />
                  {formErrors.customerName && <span className="field-error">{formErrors.customerName}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="booking-customer-email">Email <span className="required">*</span></label>
                  <input id="booking-customer-email" type="email" name="customerEmail" value={form.customerEmail}
                    placeholder="Enter your email"
                    className={formErrors.customerEmail ? "input-error" : ""}
                    onChange={handleFormChange} />
                  {formErrors.customerEmail && <span className="field-error">{formErrors.customerEmail}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="booking-contact">Contact number <span className="required">*</span></label>
                  <input id="booking-contact" type="text" name="contactNumber" value={form.contactNumber}
                    placeholder="Enter contact number"
                    className={formErrors.contactNumber ? "input-error" : ""}
                    onChange={handleFormChange} />
                  {formErrors.contactNumber && <span className="field-error">{formErrors.contactNumber}</span>}
                </div>
                <div className="form-group">
                  <label htmlFor="booking-address">Address <span className="required">*</span></label>
                  <input id="booking-address" type="text" name="customerAddress" value={form.customerAddress}
                    placeholder="Enter your address"
                    className={formErrors.customerAddress ? "input-error" : ""}
                    onChange={handleFormChange} />
                  {formErrors.customerAddress && <span className="field-error">{formErrors.customerAddress}</span>}
                </div>
              </div>

              <div className="form-row form-row--stay-calendars">
                <p className="booking-cal-unavailable-hint">
                  <strong>Calendar key:</strong> <span className="booking-cal-unavailable-hint__inline">Occupied</span> (red) and{" "}
                  <span className="booking-cal-unavailable-hint__inline">Reserved</span> (gold) nights match the front desk view. They cannot be used as your check-in date for this room.
                </p>
                <div className="form-group">
                  <span className="form-label-static" id="booking-checkin-label">Check-in date <span className="required">*</span></span>
                  <div className={formErrors.checkInDate ? "booking-day-picker-wrap booking-day-picker-wrap--error" : "booking-day-picker-wrap"}>
                    <DayPicker
                      key={`guest-ci-${resRoomId}`}
                      mode="single"
                      selected={form.checkInDate ? parseLocalYmd(form.checkInDate) : undefined}
                      onSelect={handleSelectCheckIn}
                      startMonth={parseLocalYmd(today) ?? undefined}
                      endMonth={parseLocalYmd(occupancyWindowTo) ?? undefined}
                      defaultMonth={parseLocalYmd(form.checkInDate) ?? parseLocalYmd(today) ?? undefined}
                      disabled={checkInDisabledMatchers}
                      labels={bookingCalendarLabels}
                      modifiers={{
                        stayOccupied: (date) =>
                          Boolean(resRoomId) && occupiedNightSet.has(formatLocalYmd(date)),
                        stayReserved: (date) =>
                          Boolean(resRoomId) && reservedNightSet.has(formatLocalYmd(date)),
                      }}
                      modifiersClassNames={{
                        stayOccupied: "fd-cal-cell fd-cal-cell--occupied",
                        stayReserved: "fd-cal-cell fd-cal-cell--reserved",
                      }}
                      className="booking-day-picker"
                      id="booking-checkin-calendar"
                      aria-labelledby="booking-checkin-label"
                    />
                  </div>
                  {occupancyLoading && <span className="booking-cal-hint">Loading availability…</span>}
                  {formErrors.checkInDate && <span className="field-error">{formErrors.checkInDate}</span>}
                </div>
                <div className="form-group">
                  <span className="form-label-static" id="booking-checkout-label">
                    Check-out date <span className="required">*</span>
                    {!form.checkInDate ? (
                      <span className="booking-checkout-locked-label"> — choose check-in first</span>
                    ) : null}
                  </span>
                  <div
                    className={`${formErrors.checkOutDate ? "booking-day-picker-wrap booking-day-picker-wrap--error" : "booking-day-picker-wrap"}${!form.checkInDate ? " booking-day-picker-wrap--checkout-locked" : ""}`}
                  >
                    <DayPicker
                      key={`guest-co-${resRoomId}-${form.checkInDate || "none"}`}
                      mode="single"
                      selected={form.checkOutDate ? parseLocalYmd(form.checkOutDate) : undefined}
                      onSelect={handleSelectCheckOut}
                      startMonth={parseLocalYmd(today) ?? undefined}
                      endMonth={parseLocalYmd(occupancyWindowTo) ?? undefined}
                      defaultMonth={
                        parseLocalYmd(form.checkOutDate) ??
                        parseLocalYmd(form.checkInDate) ??
                        parseLocalYmd(today) ??
                        undefined
                      }
                      disabled={checkoutDisabledMatcher}
                      labels={bookingCalendarLabels}
                      modifiers={{
                        stayOccupied: (date) =>
                          Boolean(resRoomId) && occupiedNightSet.has(formatLocalYmd(date)),
                        stayReserved: (date) =>
                          Boolean(resRoomId) && reservedNightSet.has(formatLocalYmd(date)),
                      }}
                      modifiersClassNames={{
                        stayOccupied: "fd-cal-cell fd-cal-cell--occupied",
                        stayReserved: "fd-cal-cell fd-cal-cell--reserved",
                      }}
                      className="booking-day-picker"
                      id="booking-checkout-calendar"
                      aria-labelledby="booking-checkout-label"
                    />
                  </div>
                  {!form.checkInDate && (
                    <span className="booking-cal-hint">Select check-in first, then choose check-out.</span>
                  )}
                  {formErrors.checkOutDate && <span className="field-error">{formErrors.checkOutDate}</span>}
                </div>
              </div>
              {occupancyErr && roomOccupancyRanges.length === 0 ? (
                <p className="booking-occupancy-warn" role="status">
                  Could not load booked dates for this room ({occupancyErr}). You can still submit; the front desk will confirm availability. Double booking is possible until dates load — try again or pick dates you know are open.
                </p>
              ) : null}
              <div className="booking-form-fd-cal-legend">
                <div className="fd-cal-legend" aria-label="Calendar legend">
                  <span className="fd-cal-legend-item">
                    <span className="fd-cal-legend-swatch fd-cal-legend-swatch--available" aria-hidden /> Available
                  </span>
                  <span className="fd-cal-legend-item">
                    <span className="fd-cal-legend-swatch fd-cal-legend-swatch--reserved" aria-hidden /> Reserved / Pending
                  </span>
                  <span className="fd-cal-legend-item">
                    <span className="fd-cal-legend-swatch fd-cal-legend-swatch--occupied" aria-hidden /> Occupied
                  </span>
                </div>
                <p className="booking-cal-legend-help">
                  Each night shows this room&apos;s status. <strong>Gold</strong> covers pending and approved stays not yet checked in.{" "}
                  <strong>Red</strong> means a guest is currently in-house. Open dates are available for your stay.
                </p>
              </div>
              <p className="booking-schedule-note" role="note">
                <strong>Note:</strong> Check-in time is 2:00 PM and check-out time is 12:00 PM. Colors match the front desk calendar: <strong>Occupied</strong> (red) and <strong>Reserved</strong> (gold) nights cannot be used as check-in. The next guest may check in from 2:00 PM on the departure date of an existing stay.
              </p>

              {stayNightsCount >= 1 && form.checkInDate && form.checkOutDate ? (
                <div className="booking-stay-estimate" aria-live="polite">
                  <p className="booking-stay-estimate__label">Your stay</p>
                  <p className="booking-stay-estimate__dates">
                    <strong>{formatStayDateLabel(form.checkInDate)}</strong>
                    {" → "}
                    <strong>{formatStayDateLabel(form.checkOutDate)}</strong>
                    <span className="booking-stay-estimate__nights">
                      ({stayNightsCount} night{stayNightsCount !== 1 ? "s" : ""})
                    </span>
                  </p>
                  {nightlyRateForBill > 0 ? (
                    <p className="booking-stay-estimate__rate">
                      Room rate: {formatPeso(nightlyRateForBill)} / night
                    </p>
                  ) : null}
                  <p className="booking-stay-estimate__preview-note">
                    Amounts below are calculated on this device only. Nothing is saved until you submit your reservation.
                  </p>
                </div>
              ) : null}

              {stayBill ? (
                <div className="booking-form-billing-block">
                  <BillingSummary bill={stayBill} title="Billing summary" showMinimumDown />
                  {livePayment ? (
                    <BillingPaymentPills
                      total={livePayment.total}
                      amountPaid={livePayment.amountPaid}
                      balanceDue={livePayment.balanceDue}
                      minimumDownPayment={livePayment.minimumDownPayment}
                    />
                  ) : null}
                </div>
              ) : stayNightsCount >= 1 ? (
                <p className="booking-bill-hint" role="status">
                  {nightlyRateForBill <= 0
                    ? "We could not read this room's nightly rate. The front desk will confirm your total when you arrive."
                    : "Choose a room above to see your billing summary."}
                </p>
              ) : null}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="booking-additional-guests">Additional guests</label>
                  <input id="booking-additional-guests" type="text" name="additionalGuest" inputMode="numeric" value={form.additionalGuest}
                    placeholder="0"
                    onChange={handleFormChange} />
                </div>
                <div className="form-group">
                  <span className="form-label-static">Guest ID <span className="required">*</span></span>
                  <label htmlFor="booking-id-file" className={`upload-box upload-box--booking-id${formErrors.id ? " box-error" : ""}`}>
                    <input id="booking-id-file" type="file" accept="image/*" onChange={handleIdUpload} />
                    {idPreview
                      ? <img src={idPreview} className="upload-preview" alt="ID preview" />
                      : <div className="upload-placeholder"><UserIcon /><span>Upload government ID</span></div>}
                  </label>
                  {formErrors.id && <span className="field-error">{formErrors.id}</span>}
                </div>
              </div>

              <div className="form-section form-section--textarea">
                <label className="form-section__label" htmlFor="booking-requests">Additional requests</label>
                <textarea id="booking-requests" name="additionalRequests" rows={4} value={form.additionalRequests}
                  placeholder="Special requests or notes (optional)"
                  onChange={handleFormChange} />
              </div>

              <div className="form-section form-section--payment">
                <div className="form-section__head">
                  <CardIcon aria-hidden />
                  <h3 className="form-section__title">Payment options</h3>
                </div>
                <p className="form-section__desc">
                  Pay with cash on arrival, or choose GCash to scan and save your payment details here. Saving GCash details does not send your booking until you click Submit Reservation and confirm.
                </p>
                <div className="payment-options">
                  <label className={`payment-card${form.payment === "cash" ? " selected" : ""}`}
                    onClick={() => selectPayment("cash")}>
                    <input type="radio" name="payment" value="cash" readOnly checked={form.payment === "cash"} />
                    <div className="payment-card-inner">
                      <CashPayIcon />
                      <strong>Cash</strong>
                      <span>Pay at the front desk — no online form needed</span>
                    </div>
                  </label>
                  <label className={`payment-card${form.payment === "gcash" ? " selected" : ""}`}
                    onClick={() => selectPayment("gcash")}>
                    <input type="radio" name="payment" value="gcash" readOnly checked={form.payment === "gcash"} />
                    <div className="payment-card-inner">
                      <div className="payment-gcash-icon-wrap">
                        <img src={GCASH_CARD_ICON} alt="" className="payment-logo-gcash" width={32} height={32} decoding="async" />
                      </div>
                      <strong>GCash</strong>
                      <span>Scan QR and fill in amount, date, and proof</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Terms */}
              <div className="terms-block">
                <h3 className="terms-title">Terms and Conditions</h3>
                <div className="terms-body">
                  <ol>
                    <li><strong>Valid ID Requirement</strong>
                      <ul>
                        <li>A clear photo or scanned copy of a valid government-issued ID must be uploaded with your reservation request.</li>
                        <li>The reservation name must match the name on the ID.</li>
                      </ul>
                    </li>
                    <li><strong>Verification &amp; Confirmation</strong>
                      <ul><li>All reservation requests are subject to approval after ID verification.</li></ul>
                    </li>
                  </ol>
                </div>
                <label className={`checkbox-label${formErrors.termsCheck ? " check-error" : ""}`}>
                  <input type="checkbox" checked={!!form.termsCheck}
                    onChange={e => { setForm(f => ({ ...f, termsCheck: e.target.checked })); setFormErrors(fe => ({ ...fe, termsCheck: false })); }} />
                  I have read and accept the <a href="#">Terms and Conditions</a>
                </label>
                {formErrors.termsCheck && <span className="field-error">{formErrors.termsCheck}</span>}
              </div>

              {/* Agreements */}
              <div className="agreements-block">
                <h3 className="agreements-title">Required Agreements</h3>
                <label className={`checkbox-label${formErrors.privacyCheck ? " check-error" : ""}`}>
                  <input type="checkbox" checked={!!form.privacyCheck}
                    onChange={e => { setForm(f => ({ ...f, privacyCheck: e.target.checked })); setFormErrors(fe => ({ ...fe, privacyCheck: false })); }} />
                  I have read and agree to the <a href="#">Data Privacy &amp; Policy</a>
                </label>
                {formErrors.privacyCheck && <span className="field-error">{formErrors.privacyCheck}</span>}
                <label className={`checkbox-label${formErrors.stayCheck ? " check-error" : ""}`}>
                  <input type="checkbox" checked={!!form.stayCheck}
                    onChange={e => { setForm(f => ({ ...f, stayCheck: e.target.checked })); setFormErrors(fe => ({ ...fe, stayCheck: false })); }} />
                  I have read and agree to the <a href="#">Terms &amp; Conditions of Stay</a>
                </label>
                {formErrors.stayCheck && <span className="field-error">{formErrors.stayCheck}</span>}
              </div>

              {resRoom && (form.checkInDate || form.checkOutDate || form.customerName.trim()) ? (
                <div className="booking-review-summary" aria-labelledby="booking-review-summary-title">
                  <h3 id="booking-review-summary-title" className="booking-review-summary__title">
                    Booking summary
                  </h3>
                  <ul className="booking-review-summary__list">
                    <li>
                      <span className="booking-review-summary__k">Room</span>
                      <span className="booking-review-summary__v">{resRoom}</span>
                    </li>
                    <li>
                      <span className="booking-review-summary__k">Check-in</span>
                      <span className="booking-review-summary__v">{form.checkInDate || "—"}</span>
                    </li>
                    <li>
                      <span className="booking-review-summary__k">Check-out</span>
                      <span className="booking-review-summary__v">{form.checkOutDate || "—"}</span>
                    </li>
                    <li>
                      <span className="booking-review-summary__k">Additional guests</span>
                      <span className="booking-review-summary__v">{form.additionalGuest || "0"}</span>
                    </li>
                    <li>
                      <span className="booking-review-summary__k">Guest</span>
                      <span className="booking-review-summary__v">{form.customerName.trim() || "—"}</span>
                    </li>
                    {stayBill ? (
                      <>
                        <li>
                          <span className="booking-review-summary__k">Nights</span>
                          <span className="booking-review-summary__v">{stayBill.nights}</span>
                        </li>
                        <li>
                          <span className="booking-review-summary__k">Total amount</span>
                          <span className="booking-review-summary__v">{formatPeso(stayBill.total)}</span>
                        </li>
                        <li>
                          <span className="booking-review-summary__k">Down payment (min.)</span>
                          <span className="booking-review-summary__v">{formatPeso(stayBill.minimumDownPayment)}</span>
                        </li>
                        {livePayment ? (
                          <li>
                            <span className="booking-review-summary__k">Remaining balance</span>
                            <span className="booking-review-summary__v">{formatPeso(livePayment.balanceDue)}</span>
                          </li>
                        ) : null}
                      </>
                    ) : null}
                    <li>
                      <span className="booking-review-summary__k">Payment method</span>
                      <span className="booking-review-summary__v">{form.payment === "gcash" ? "GCash" : "Cash on arrival"}</span>
                    </li>
                    {form.payment === "gcash" && pendingGcash ? (
                      <li>
                        <span className="booking-review-summary__k">GCash</span>
                        <span className="booking-review-summary__v">
                          Amount paid ₱{Number(pendingGcash.paidNum).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })},{" "}
                          paid on {pendingGcash.date}, ref. {pendingGcash.txId}
                          {pendingGcash.proofPreview ? " · Proof attached" : ""}
                        </span>
                      </li>
                    ) : form.payment === "gcash" ? (
                      <li>
                        <span className="booking-review-summary__k">GCash</span>
                        <span className="booking-review-summary__v booking-review-summary__v--muted">
                          Not saved yet — click Submit Reservation to open the payment form.
                        </span>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {form.payment === "gcash" && pendingGcash ? (
                <p className="booking-gcash-draft-note" role="status">
                  GCash details are saved in this form only. Review the summary above, then click Submit Reservation to send your request to the hotel.
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

      {/* ══ PAYMENT MODAL ══ */}
      {payOpen && (
        <div className="modal-backdrop active"
          onClick={e => { if (e.target === e.currentTarget) closePay(); }}>
          <div className="modal payment-modal">
            <div className="modal-header">
              <h2 className="modal-title">GCash Payment</h2>
              <button className="modal-close" onClick={closePay}>✕</button>
            </div>
            <div className="modal-body payment-modal-body">
              <p className="payment-modal-lead">
                Enter your transfer details and proof here. This step only saves them in your booking form — your reservation is not sent until you click Submit Reservation and confirm.
              </p>
              <div className="payment-modal-columns">
              <div className="payment-qr-side">
                <div className="payment-qr-brand">
                  <div className={`qr-payment-frame${payQrMissing ? " qr-payment-frame--empty" : ""}`}>
                    {!payQrMissing && (
                      <img
                        src={GCASH_PAYMENT_QR}
                        alt=""
                        className="qr-img qr-img-payment"
                        decoding="async"
                        onError={() => setPayQrMissing(true)}
                      />
                    )}
                    {payQrMissing && (
                      <div className="qr-payment-placeholder" aria-hidden>
                        <span className="qr-payment-placeholder-label">QR code</span>
                      </div>
                    )}
                  </div>
                  <p className="qr-name">GCash</p>
                </div>
                <p className="qr-handle">@Abela Suites</p>
              </div>
              <div className="payment-form-side">
                <h3 className="payment-form-title">Fill this Form</h3>
                <div className="payment-form-grid">
                  <div className="form-group">
                    <label>Amount Paid <span className="required">*</span></label>
                    <input type="text" name="amount" value={payForm.amount}
                      placeholder="e.g. 1,666"
                      className={payErrors.amount ? "input-error" : ""}
                      onChange={handlePayFormChange} />
                    {payErrors.amount && <span className="field-error">{payErrors.amount}</span>}
                  </div>
                  <div className="form-group">
                    <label>Date <span className="required">*</span></label>
                    <input type="date" name="date" value={payForm.date}
                      className={payErrors.date ? "input-error" : ""}
                      onChange={handlePayFormChange} />
                    {payErrors.date && <span className="field-error">{payErrors.date}</span>}
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: "10px" }}>
                  <label>Transaction ID <span className="required">*</span></label>
                  <input type="text" name="txId" value={payForm.txId}
                    placeholder="Enter transaction ID"
                    className={payErrors.txId ? "input-error" : ""}
                    onChange={handlePayFormChange} />
                  {payErrors.txId && <span className="field-error">{payErrors.txId}</span>}
                </div>
                <div className="form-group" style={{ marginTop: "10px" }}>
                  <label>Proof of payment <span className="required">*</span></label>
                  <label className={`upload-box proof-upload${payErrors.proof ? " box-error" : ""}`}>
                    <input type="file" accept="image/*" onChange={handleProofUpload} />
                    {proofPreview
                      ? <img src={proofPreview} className="upload-preview" alt="Proof Preview" />
                      : <div className="upload-placeholder"><UploadIcon /><span>Upload your proof of payment here...</span></div>}
                  </label>
                  {payErrors.proof && <span className="field-error">{payErrors.proof}</span>}
                </div>
                <div className="payment-form-actions">
                  <button type="button" className="btn-clear" onClick={clearPayForm}>
                    Clear
                  </button>
                  <button type="button" className="btn-submit-reservation" onClick={submitPayment}>
                    Save payment details
                  </button>
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CONFIRM DIALOG ══ */}
      {confirmOpen && (
        <div className="confirm-backdrop active">
          <div className="confirm-dialog">
            <div className="confirm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="confirm-exclaim">!</span>
            </div>
            <h3 className="confirm-title">Submit reservation?</h3>
            <p className="confirm-sub">Please confirm the details below. This sends your request to the hotel.</p>
            {resRoom ? (
              <div className="confirm-booking-summary">
                <p><strong>Room</strong> {resRoom}</p>
                <p><strong>Stay</strong> {form.checkInDate || "—"} → {form.checkOutDate || "—"}</p>
                <p><strong>Guest</strong> {form.customerName.trim() || "—"}</p>
                {stayBill ? (
                  <>
                    <p><strong>Nights</strong> {stayBill.nights}</p>
                    <p><strong>Total amount</strong> {formatPeso(stayBill.total)}</p>
                    <p><strong>Minimum down</strong> {formatPeso(stayBill.minimumDownPayment)}</p>
                    {livePayment ? (
                      <p><strong>Remaining balance</strong> {formatPeso(livePayment.balanceDue)}</p>
                    ) : null}
                  </>
                ) : null}
                <p><strong>Payment</strong> {form.payment === "gcash" ? "GCash" : "Cash on arrival"}</p>
                {form.payment === "gcash" && pendingGcash ? (
                  <p>
                    <strong>GCash</strong> ₱{Number(pendingGcash.paidNum).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
                    on {pendingGcash.date} · Ref. {pendingGcash.txId}
                    {pendingGcash.proofPreview ? " · Proof attached" : ""}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className="confirm-btns">
              <button type="button" className="btn-cancel-confirm" onClick={() => setConfirmOpen(false)} disabled={resSubmitting}>
                Cancel
              </button>
              <button type="button" className="btn-submit-confirm" onClick={confirmSubmit} disabled={resSubmitting}>
                {resSubmitting ? "Sending…" : "Confirm & submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ Booking submitted toast (no full-page overlay) ══ */}
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