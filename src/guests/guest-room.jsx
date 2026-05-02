import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getStoredAuthToken } from "../api/authApi";
import { TopbarUserIcon } from "../frontdesks/frontdeskTopbarIcons";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { isRoomAvailableForDates } from "./guestAvailability";
import {
  createBookingBackend,
  fetchRoomsCatalog,
  bookingSaveAlertMessage,
  dispatchFrontdeskNotificationsRefresh,
} from "../api/guestApi";
import { useGuestTopbarNotifications } from "./useGuestTopbarNotifications";
import GuestSidebar from "./GuestSidebar";
import { GuestArchiveIcon } from "./guestArchiveIcon";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
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
  const title = String(api.title ?? "").trim();
  return {
    id: String(api.id ?? ""),
    roomNumber: String(api.roomNumber ?? "").trim(),
    name: title || `Room ${String(api.roomNumber ?? "").trim() || "—"}`,
    priceOld: null,
    priceNew: formatRoomPriceDisplay(api.price),
    priceNum: Number.isFinite(priceNum) ? priceNum : 0,
    maxGuests: guests,
    guestLabel: `Up to ${guests} Guest${guests > 1 ? "s" : ""}`,
    desc: String(api.description ?? "").trim() || "—",
    features: Array.isArray(api.features) && api.features.length ? api.features : [],
    img: String(api.image ?? "").trim() || "https://placehold.co/800x500/f5f5f5/666666?text=Room",
    packageLabel: String(api.package ?? "").trim(),
  };
}

/**
 * When the catalog has exactly two rooms, show Abela’s public suite lineup:
 * cheaper listing → Single Suite ₱824, other → Executive ₱2,940, with your photos in `public/`.
 * (Keeps the same `id` / `roomNumber` so bookings still target the correct catalog row.)
 */
function applyAbelaSuitePresentation(viewRooms) {
  if (!Array.isArray(viewRooms) || viewRooms.length !== 2) return viewRooms;
  const sorted = [...viewRooms].sort(
    (a, b) => a.priceNum - b.priceNum || String(a.id).localeCompare(String(b.id)),
  );
  Object.assign(sorted[0], {
    name: "Single Suite",
    priceNum: 824,
    priceNew: "₱824",
    img: "/room-single-suite.png",
  });
  Object.assign(sorted[1], {
    name: "Executive",
    priceNum: 2940,
    priceNew: "₱2,940",
    img: "/room-executive.png",
  });
  return viewRooms;
}

// --- Helpers ---
function isRoomAvailable(roomId, wantIn, wantOut, bookedDates) {
  return isRoomAvailableForDates(roomId, wantIn, wantOut, bookedDates);
}

function fmtDate(str) {
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function parsePriceToNumber(priceStr) {
  const n = Number(String(priceStr || "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function buildRoomReservationPayload(viewRooms, form, resRoom, { paymentAmountNum = 0, transactionId = "", idDataUrl = null } = {}) {
  const room = viewRooms.find((r) => r.name === resRoom);
  const total = room ? room.priceNum : 0;
  const minDown = Math.round(total * 0.3);
  const email = form.customerEmail.trim().toLowerCase();
  const hasId = typeof idDataUrl === "string" && idDataUrl.startsWith("data:image");
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
    totalStayAmount: String(total),
    roomTotal: String(total),
    minimumDownPayment: String(minDown),
    paymentAmount: String(paymentAmountNum),
    paymentMethod: form.payment === "gcash" ? "Gcash" : "Cash",
    ...(transactionId ? { transactionId } : {}),
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
  };
}

async function saveRoomReservation(p) {
  await createBookingBackend(roomPayloadToApi(p));
}

const today = new Date().toISOString().split("T")[0];

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
  /** Local overlap hints until bookings are loaded from the API. */
  const [bookedDates, setBookedDates] = useState([]);
  // Availability bar
  const [barCheckIn, setBarCheckIn]   = useState("");
  const [barCheckOut, setBarCheckOut] = useState("");
  const [barGuests, setBarGuests]     = useState("1");
  const [availResult, setAvailResult] = useState(null);
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

  // Payment modal
  const [payOpen, setPayOpen]   = useState(false);
  const [payQrMissing, setPayQrMissing] = useState(false);
  const [payForm, setPayForm]   = useState({ amount: "", date: "", txId: "" });
  const [proofFile, setProofFile]       = useState(null);
  const [proofPreview, setProofPreview] = useState(null);
  const [payErrors, setPayErrors]       = useState({});

  // Confirm & success
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resSuccess, setResSuccess]   = useState(false);
  const [paySuccess, setPaySuccess]   = useState(false);
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
        setRooms(applyAbelaSuitePresentation(list.map(mapApiRoomToView)));
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

  // --- Availability ---
  function checkAvailability() {
    if (!barCheckIn || !barCheckOut) {
      setAvailResult({ dot: "#9a8060", text: "Please select both a check-in and check-out date." }); return;
    }
    if (barCheckOut <= barCheckIn) {
      setAvailResult({ dot: "#e74c3c", text: "Check-out date must be after check-in date." }); return;
    }
    if (new Date(barCheckIn) < new Date(today)) {
      setAvailResult({ dot: "#e74c3c", text: "Check-in date cannot be in the past." }); return;
    }
    const guests = parseInt(barGuests, 10);
    const statuses = {};
    let availCount = 0;
    for (const r of rooms) {
      const guestOk = guests <= r.maxGuests;
      const dateOk  = isRoomAvailable(r.id, barCheckIn, barCheckOut, bookedDates);
      const ok = guestOk && dateOk;
      statuses[r.id] = {
        ok,
        label: !guestOk ? "Too many guests" : ok ? "Available" : "Not Available",
        dateLabel: fmtDate(barCheckIn) + " – " + fmtDate(barCheckOut),
      };
      if (ok) availCount++;
    }
    setRoomStatuses(statuses);
    if (rooms.length === 0) {
      setAvailResult({ dot: "#9a8060", text: "No rooms to check — load the room list first." });
      return;
    }
    if (availCount === rooms.length)
      setAvailResult({ dot: "#27ae60", text: `All rooms are available for ${fmtDate(barCheckIn)} – ${fmtDate(barCheckOut)} (${guests} guest${guests > 1 ? "s" : ""})` });
    else if (availCount === 0)
      setAvailResult({ dot: "#e74c3c", text: "No rooms available for the selected dates / guest count." });
    else
      setAvailResult({ dot: "#e6a817", text: `${availCount} of ${rooms.length} rooms available for ${fmtDate(barCheckIn)} – ${fmtDate(barCheckOut)}` });
    setForm(f => ({ ...f, checkInDate: barCheckIn, checkOutDate: barCheckOut }));
  }

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
    setResRoom(name);
    setResOpen(true);
  }
  function closeRes()    { setResOpen(false); setFormErrors({}); }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setFormErrors(fe => ({ ...fe, [name]: false }));
  }

  function handleIdUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) return;
    setIdFile(file);
    setFormErrors(fe => ({ ...fe, id: false }));
    const reader = new FileReader();
    reader.onload = (ev) => setIdPreview(ev.target.result);
    reader.onerror = () => setIdPreview(null);
    reader.readAsDataURL(file);
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
    if (!idFile) errs.id = "Please upload a valid government ID.";
    if (!form.termsCheck)   errs.termsCheck = "You must accept the Terms and Conditions.";
    if (!form.privacyCheck) errs.privacyCheck = "You must agree to the Data Privacy & Policy.";
    if (!form.stayCheck)    errs.stayCheck = "You must agree to the Terms & Conditions of Stay.";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmitRes() { if (validateRes()) setConfirmOpen(true); }

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
      setConfirmOpen(false);
      setPayOpen(true);
      return;
    }
    setResSubmitting(true);
    try {
      const payload = buildRoomReservationPayload(rooms, form, resRoom, { paymentAmountNum: 0, idDataUrl: idPreview });
      await saveRoomReservation(payload);
      dispatchFrontdeskNotificationsRefresh();
      try {
        sessionStorage.setItem("abela_guest_email", payload.email);
      } catch {
        /* ignore */
      }
      setBookedDates((bd) => [...bd, { roomId: roomMeta.id, checkIn: form.checkInDate, checkOut: form.checkOutDate }]);
      setConfirmOpen(false);
      setResOpen(false);
      clearResForm();
      setResSuccess(true);
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
    clearPayForm();
  }

  // --- Payment: Cash = selection only; GCash opens upload / details modal ---
  function selectPayment(val) {
    setForm(f => ({ ...f, payment: val }));
    if (val === "gcash") {
      setPayErrors({});
      setPayOpen(true);
    } else {
      setPayOpen(false);
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

  function handleProofUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type && !file.type.startsWith("image/")) return;
    setProofFile(file);
    setPayErrors(pe => ({ ...pe, proof: false }));
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target.result);
    reader.onerror = () => setProofPreview(null);
    reader.readAsDataURL(file);
  }

  async function submitPayment() {
    const errs = {};
    if (!payForm.amount.trim()) errs.amount = "Amount paid is required.";
    if (!payForm.date.trim())   errs.date = "Payment date is required.";
    if (!payForm.txId.trim())   errs.txId = "Transaction ID is required.";
    if (!proofFile)             errs.proof = "Please upload proof of payment.";
    setPayErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (form.payment !== "gcash") {
      closePay();
      setPaySuccess(true);
      return;
    }

    const roomMeta = rooms.find((r) => r.name === resRoom);
    if (!roomMeta || !form.checkInDate || !form.checkOutDate) {
      window.alert("Reservation details are missing. Please start your booking again.");
      return;
    }
    if (!getStoredAuthToken()) {
      window.alert(bookingSaveAlertMessage({ code: "NO_TOKEN" }));
      return;
    }

    const paid = parsePriceToNumber(payForm.amount);
    const stayTotal = Number(roomMeta.priceNum);
    if (Number.isFinite(stayTotal) && stayTotal > 0 && paid > stayTotal) {
      setPayErrors((prev) => ({
        ...prev,
        amount: `Amount paid cannot be greater than your stay total (₱${stayTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`,
      }));
      return;
    }

    setResSubmitting(true);
    try {
      const payload = buildRoomReservationPayload(rooms, form, resRoom, {
        paymentAmountNum: paid,
        transactionId: payForm.txId.trim(),
        idDataUrl: idPreview,
      });
      await saveRoomReservation(payload);
      dispatchFrontdeskNotificationsRefresh();
      try {
        sessionStorage.setItem("abela_guest_email", payload.email);
      } catch {
        /* ignore */
      }
      setBookedDates((bd) => [...bd, { roomId: roomMeta.id, checkIn: form.checkInDate, checkOut: form.checkOutDate }]);
      closePay();
      setResOpen(false);
      clearResForm();
      setPaySuccess(true);
    } catch (err) {
      window.alert(bookingSaveAlertMessage(err));
    } finally {
      setResSubmitting(false);
    }
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
              <TopbarUserIcon className="topbar-icon" />
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

          {roomsError && (
            <div className="avail-results-bar" style={{ marginBottom: "12px" }}>
              <span className="avail-dot" style={{ background: "#e74c3c" }} />
              <span>{roomsError}</span>
            </div>
          )}

          {/* Room Cards */}
          <div className="rooms-list">
            {roomsLoading && (
              <p style={{ padding: "24px", color: "#666" }}>Loading rooms…</p>
            )}
            {!roomsLoading && !roomsError && rooms.length === 0 && (
              <p style={{ padding: "24px", color: "#666" }}>No rooms are published yet.</p>
            )}
            {rooms.map(r => {
              const st = roomStatuses[r.id];
              const isUnavailable = st && !st.ok;
              return (
                <div key={r.id} className={`room-card${isUnavailable ? " unavailable" : ""}`}>
                  <span className={`avail-badge${st ? (st.ok ? " badge-available" : " badge-unavailable") : ""}`}>
                    {st && !st.ok ? <XIcon /> : <CheckIcon />}
                    <span>{st ? st.label : "Available"}</span>
                  </span>
                  <div className="room-img-wrap">
                    <img src={r.img} alt={r.name} />
                  </div>
                  <div className="room-info">
                    <h2 className="room-name">{r.name}</h2>
                    <div className="room-pricing">
                      {r.priceOld && <span className="room-price-old">{r.priceOld}</span>}
                      <span className="room-price-new">{r.priceNew}</span>
                      <span className="room-guests"><GuestsIcon /> {r.guestLabel}</span>
                    </div>
                    <p className="room-desc">{r.desc}</p>
                    <p className="features-label">Features:</p>
                    <div className="features-grid">
                      {r.features.map(f => <span key={f} className="feature-item">✔ {f}</span>)}
                    </div>
                    <div className="room-footer">
                      <span className="dates-tag">{st?.dateLabel || ""}</span>
                      <button className="btn-book-now" disabled={isUnavailable}
                        onClick={() => openRes(r.name)}>Book Now</button>
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
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{resRoom} — Reservation</h2>
              <button className="modal-close" onClick={closeRes}>✕</button>
            </div>
            <div className="modal-body">

              <div className="form-row">
                <div className="form-group">
                  <label>Customer Name <span className="required">*</span></label>
                  <input type="text" name="customerName" value={form.customerName}
                    placeholder="Enter your full name"
                    className={formErrors.customerName ? "input-error" : ""}
                    onChange={handleFormChange} />
                  {formErrors.customerName && <span className="field-error">{formErrors.customerName}</span>}
                </div>
                <div className="form-group">
                  <label>Email <span className="required">*</span></label>
                  <input type="email" name="customerEmail" value={form.customerEmail}
                    placeholder="Enter your email"
                    className={formErrors.customerEmail ? "input-error" : ""}
                    onChange={handleFormChange} />
                  {formErrors.customerEmail && <span className="field-error">{formErrors.customerEmail}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Contact Number <span className="required">*</span></label>
                  <input type="text" name="contactNumber" value={form.contactNumber}
                    placeholder="Enter contact number"
                    className={formErrors.contactNumber ? "input-error" : ""}
                    onChange={handleFormChange} />
                  {formErrors.contactNumber && <span className="field-error">{formErrors.contactNumber}</span>}
                </div>
                <div className="form-group">
                  <label>Address <span className="required">*</span></label>
                  <input type="text" name="customerAddress" value={form.customerAddress}
                    placeholder="Enter your address"
                    className={formErrors.customerAddress ? "input-error" : ""}
                    onChange={handleFormChange} />
                  {formErrors.customerAddress && <span className="field-error">{formErrors.customerAddress}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Check-In Date <span className="required">*</span></label>
                  <input type="date" name="checkInDate" value={form.checkInDate}
                    className={formErrors.checkInDate ? "input-error" : ""}
                    onChange={handleFormChange} />
                  {formErrors.checkInDate && <span className="field-error">{formErrors.checkInDate}</span>}
                </div>
                <div className="form-group">
                  <label>Additional Guest</label>
                  <input type="text" name="additionalGuest" value={form.additionalGuest}
                    placeholder="Number of additional guests"
                    onChange={handleFormChange} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Guests ID <span className="required">*</span></label>
                  <label className={`upload-box${formErrors.id ? " box-error" : ""}`}>
                    <input type="file" accept="image/*" onChange={handleIdUpload} style={{ display: "none" }} />
                    {idPreview
                      ? <img src={idPreview} className="upload-preview" alt="ID Preview" />
                      : <div className="upload-placeholder"><UserIcon /><span>Click to upload ID image</span></div>}
                  </label>
                  {formErrors.id && <span className="field-error">{formErrors.id}</span>}
                </div>
                <div className="form-group">
                  <label>Check-Out Date <span className="required">*</span></label>
                  <input type="date" name="checkOutDate" value={form.checkOutDate}
                    className={formErrors.checkOutDate ? "input-error" : ""}
                    onChange={handleFormChange} />
                  {formErrors.checkOutDate && <span className="field-error">{formErrors.checkOutDate}</span>}
                </div>
              </div>

              <div className="form-group full-width">
                <label>Additional Requests</label>
                <textarea name="additionalRequests" rows={5} value={form.additionalRequests}
                  placeholder="Any special requests or notes..."
                  onChange={handleFormChange} />
              </div>

              {/* Payment Options */}
              <div className="payment-block">
                <div className="payment-heading">
                  <CardIcon /><strong>Payment Options</strong>
                </div>
                <p className="payment-sub">Pay with cash on arrival, or choose GCash to scan and complete the payment form.</p>
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

              <div className="modal-actions">
                <button className="btn-clear" onClick={clearResForm}>Clear</button>
                <button className="btn-submit-reservation" onClick={handleSubmitRes}>Submit Reservation</button>
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
                    <input type="file" accept="image/*" onChange={handleProofUpload} style={{ display: "none" }} />
                    {proofPreview
                      ? <img src={proofPreview} className="upload-preview" alt="Proof Preview" />
                      : <div className="upload-placeholder"><UploadIcon /><span>Upload your proof of payment here...</span></div>}
                  </label>
                  {payErrors.proof && <span className="field-error">{payErrors.proof}</span>}
                </div>
                <div className="payment-form-actions">
                  <button type="button" className="btn-clear" onClick={clearPayForm} disabled={resSubmitting}>
                    Clear
                  </button>
                  <button type="button" className="btn-submit-reservation" onClick={submitPayment} disabled={resSubmitting}>
                    {resSubmitting ? "Saving…" : "Submit"}
                  </button>
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
            <h3 className="confirm-title">Submit Reservation?</h3>
            <div className="confirm-btns">
              <button type="button" className="btn-cancel-confirm" onClick={() => setConfirmOpen(false)} disabled={resSubmitting}>
                Cancel
              </button>
              <button type="button" className="btn-submit-confirm" onClick={confirmSubmit} disabled={resSubmitting}>
                {resSubmitting ? "Saving…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ RESERVATION SUCCESS ══ */}
      {resSuccess && (
        <div className="success-overlay visible">
          <div className="success-card">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="success-title">Reservation Submitted!</h1>
            <p className="success-msg">
              Your reservation has been submitted successfully.<br />
              We will confirm your booking shortly.<br />
              <a href="#" onClick={e => { e.preventDefault(); setResSuccess(false); }}>Back to Rooms</a>
            </p>
          </div>
        </div>
      )}

      {/* ══ PAYMENT SUCCESS ══ */}
      {paySuccess && (
        <div className="success-overlay visible">
          <div className="success-card">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="success-title">GCash payment submitted!</h1>
            <p className="success-msg">
              Your GCash payment details were received.<br />
              We will verify your payment shortly.<br />
              <a href="#" onClick={e => { e.preventDefault(); setPaySuccess(false); }}>Back to Rooms</a>
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