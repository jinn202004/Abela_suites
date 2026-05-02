import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { TopbarUserIcon } from "../frontdesks/frontdeskTopbarIcons";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { isVenueAvailableForDates } from "./guestAvailability";
import { createBookingBackend, bookingSaveAlertMessage, dispatchFrontdeskNotificationsRefresh } from "../api/guestApi";
import { useGuestTopbarNotifications } from "./useGuestTopbarNotifications";
import GuestSidebar from "./GuestSidebar";
import { GuestArchiveIcon } from "./guestArchiveIcon";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
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

// --- Venue Data ---
const VENUES = [
  {
    id: "skybar",
    name: "Mini Sky Bar",
    price: "₱1,148",
    guests: "30–40 Guests",
    maxGuests: 40,
    desc: "Perfect for debuts, seminars, meetings, birthdays, and more.",
    features: ["30 Chairs", "Speaker", "10 Tables", "Microphone"],
    img: "https://www.therooftopguide.com/rooftop-bars-in-hanoi/Bilder/moonlight-sky-bar-600-3.jpg",
  },
  {
    id: "hall",
    name: "Function Hall",
    price: "₱2,205",
    guests: "20–30 Guests",
    maxGuests: 30,
    desc: "With free Breakfast, private toilet and bath, aircon, and wifi.",
    features: ["30 Chairs", "Speaker", "10 Tables", "Microphone", "Smart TV", "Air Conditioning"],
    img: "/venue-function-hall.png",
  },
];

// --- Booking Database ---
const INITIAL_BOOKED_DATES = [
  { venueId: "skybar", startDate: "2026-04-05", endDate: "2026-04-05" },
  { venueId: "skybar", startDate: "2026-04-20", endDate: "2026-04-22" },
  { venueId: "hall",   startDate: "2026-04-10", endDate: "2026-04-11" },
];

// --- Helpers ---
function isVenueAvailable(venueId, wantStart, wantEnd, bookedDates) {
  return isVenueAvailableForDates(venueId, wantStart, wantEnd, bookedDates);
}

function fmtDate(str) {
  const d = new Date(str + "T00:00:00");
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function parsePriceToNumber(priceStr) {
  const n = Number(String(priceStr || "").replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function buildEventBookingPayload(form, resVenue, { paymentAmountNum = 0, transactionId = "", idDataUrl = null } = {}) {
  const venue = VENUES.find((v) => v.name === resVenue);
  const total = parsePriceToNumber(venue?.price);
  const email = form.email.trim().toLowerCase();
  const pax = Math.max(1, parseInt(form.attendees, 10) || 1);
  const hasId = typeof idDataUrl === "string" && idDataUrl.startsWith("data:image");
  return {
    eventVenueId: String(venue?.id ?? ""),
    venueName: resVenue,
    venuePrice: String(total),
    totalAmount: String(total),
    customerName: form.customerName.trim(),
    email,
    customerEmail: email,
    contactNumber: form.contact.trim(),
    address: "",
    eventTitle: form.eventName.trim(),
    eventDate: form.date,
    eventEndDate: form.date,
    expectedPax: pax,
    additionalRequests: (form.requests || "").trim(),
    timeSlot: form.timeSlot || "",
    createdAt: new Date().toISOString(),
    status: "pending",
    paymentAmount: String(paymentAmountNum),
    paymentMethod: form.payment === "gcash" ? "Gcash" : "Cash",
    ...(transactionId ? { transactionId } : {}),
    guestIdPhotoName: hasId ? "uploaded" : "",
    guestIdPhotoData: hasId ? idDataUrl : "",
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
    paymentAmount: p.paymentAmount,
    paymentMethod: p.paymentMethod,
    transactionId: p.transactionId || "",
    guestIdPhotoName: p.guestIdPhotoName,
    guestIdPhotoData: p.guestIdPhotoData,
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
  const [bookedDates, setBookedDates] = useState(INITIAL_BOOKED_DATES);

  // Availability bar
  const [barStart, setBarStart]         = useState("");
  const [barEnd, setBarEnd]             = useState("");
  const [barGuests, setBarGuests]       = useState("30");
  const [availResult, setAvailResult]   = useState(null);
  const [venueStatuses, setVenueStatuses] = useState({});

  // Reservation modal
  const [resOpen, setResOpen]   = useState(false);
  const [resVenue, setResVenue] = useState("");
  const [form, setForm] = useState({
    eventName: "", customerName: "", contact: "", email: "",
    date: "", timeSlot: "", attendees: "", requests: "",
    payment: "cash", chkTerms: false, chkPrivacy: false, chkTOS: false,
  });
  const [idFile, setIdFile]         = useState(null);
  const [idPreview, setIdPreview]   = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [showBanner, setShowBanner] = useState(false);

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
    for (const v of VENUES) {
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
    if (availCount === VENUES.length)
      setAvailResult({ dot: "#27ae60", text: `All venues are available for ${effectiveLabel} (${guests} guests)` });
    else if (availCount === 0)
      setAvailResult({ dot: "#e74c3c", text: "No venues available for the selected dates / guest count." });
    else
      setAvailResult({ dot: "#e6a817", text: `${availCount} of ${VENUES.length} venues available for ${effectiveLabel}` });
    setForm(f => ({ ...f, date: barStart }));
  }

  // --- Reservation ---
  function openRes(name) { setResVenue(name); setResOpen(true); }
  function closeRes()    { setResOpen(false); }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    setFormErrors(fe => ({ ...fe, [name]: false }));
    setShowBanner(false);
  }

  function handleIdUpload(e) {
    const file = e.target.files[0]; if (!file) return;
    setIdFile(file);
    setFormErrors(fe => ({ ...fe, id: false }));
    const reader = new FileReader();
    reader.onload = ev => setIdPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function validateRes() {
    const errs = {};
    if (!form.eventName.trim())    errs.eventName = true;
    if (!form.customerName.trim()) errs.customerName = true;
    if (!form.contact.trim() || !/^[0-9]{10,11}$/.test(form.contact.trim())) errs.contact = true;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = true;
    if (!form.date.trim())     errs.date = true;
    if (!form.timeSlot.trim()) errs.timeSlot = true;
    if (!idFile)               errs.id = true;
    if (!form.attendees || parseInt(form.attendees) < 1) errs.attendees = true;
    if (!form.chkTerms)   errs.chkTerms = true;
    if (!form.chkPrivacy) errs.chkPrivacy = true;
    if (!form.chkTOS)     errs.chkTOS = true;
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) { setShowBanner(true); return false; }
    return true;
  }

  function handleSubmitRes() { if (validateRes()) setConfirmOpen(true); }

  async function confirmSubmit() {
    const venueMeta = VENUES.find((v) => v.name === resVenue);
    if (!venueMeta || !form.date) {
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
      const payload = buildEventBookingPayload(form, resVenue, { paymentAmountNum: 0, idDataUrl: idPreview });
      await saveEventBooking(payload);
      dispatchFrontdeskNotificationsRefresh();
      try {
        sessionStorage.setItem("abela_guest_email", payload.email);
      } catch {
        /* ignore */
      }
      setBookedDates((bd) => [...bd, { venueId: venueMeta.id, startDate: form.date, endDate: form.date }]);
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

  function clearResForm() {
    setForm({ eventName:"", customerName:"", contact:"", email:"", date:"", timeSlot:"", attendees:"", requests:"", payment:"cash", chkTerms:false, chkPrivacy:false, chkTOS:false });
    setIdFile(null); setIdPreview(null);
    setFormErrors({}); setShowBanner(false);
    setPayOpen(false);
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
    reader.onload = ev => setProofPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  async function submitPayment() {
    const errs = {};
    if (!payForm.amount.trim()) errs.amount = true;
    if (!payForm.date.trim())   errs.date = true;
    if (!payForm.txId.trim())   errs.txId = true;
    if (!proofFile)             errs.proof = true;
    setPayErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (form.payment !== "gcash") {
      closePay();
      setPaySuccess(true);
      return;
    }

    const venueMeta = VENUES.find((v) => v.name === resVenue);
    if (!venueMeta || !form.date) {
      window.alert("Booking details are missing. Please start your reservation again.");
      return;
    }

    const paid = parsePriceToNumber(payForm.amount);
    const eventTotal = parsePriceToNumber(venueMeta?.price);
    if (Number.isFinite(eventTotal) && eventTotal > 0 && paid > eventTotal) {
      window.alert(
        `Amount paid cannot be greater than the booking total (₱${eventTotal.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`,
      );
      return;
    }

    setResSubmitting(true);
    try {
      const payload = buildEventBookingPayload(form, resVenue, {
        paymentAmountNum: paid,
        transactionId: payForm.txId.trim(),
        idDataUrl: idPreview,
      });
      await saveEventBooking(payload);
      dispatchFrontdeskNotificationsRefresh();
      try {
        sessionStorage.setItem("abela_guest_email", payload.email);
      } catch {
        /* ignore */
      }
      setBookedDates((bd) => [...bd, { venueId: venueMeta.id, startDate: form.date, endDate: form.date }]);
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
        {/* ── TOPBAR ── */}
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

          {/* Venue Cards */}
          <div className="venue-list">
            {VENUES.map(v => {
              const st = venueStatuses[v.id];
              const isUnavailable = st && !st.ok;
              return (
                <div key={v.id} className={`venue-card${isUnavailable ? " unavailable" : ""}`}>
                  <span className={`avail-badge${st ? (st.ok ? " badge-available" : " badge-unavailable") : ""}`}>
                    {st && !st.ok ? <XIcon /> : <CheckIcon />}
                    <span>{st ? st.label : "Available"}</span>
                  </span>
                  <div className="venue-img-wrap">
                    <img src={v.img} alt={v.name} />
                  </div>
                  <div className="venue-info">
                    <h2 className="venue-name">{v.name}</h2>
                    <div className="venue-pricing">
                      <span className="venue-price-new">{v.price}</span>
                      <span className="venue-guests"><GuestsIcon /> {v.guests}</span>
                    </div>
                    <p className="venue-desc">{v.desc}</p>
                    <p className="venue-features-label">Features:</p>
                    <div className="venue-features-grid">
                      {v.features.map(f => <span key={f} className="venue-feature-item">✔ {f}</span>)}
                    </div>
                    <div className="venue-footer">
                      <span className="dates-tag">{st?.dateLabel || ""}</span>
                      <button className="btn-reserve" disabled={isUnavailable}
                        onClick={() => openRes(v.name)}>Reserve</button>
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
        <div className="ev-modal-backdrop active"
          onClick={e => { if (e.target === e.currentTarget) closeRes(); }}>
          <div className="ev-modal">
            <div className="ev-modal-header">
              <h2 className="ev-modal-title">{resVenue} — Reservation</h2>
              <button className="ev-modal-close" onClick={closeRes}>✕</button>
            </div>
            <div className="ev-modal-body">

              <div className={`ev-error-banner${showBanner ? " visible" : ""}`}>
                Please fill in all required fields before submitting.
              </div>

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

              <div className="ev-form-row">
                <div className="ev-form-group">
                  <label>Date <span style={{ color: "#e74c3c" }}>*</span></label>
                  <input type="date" name="date" value={form.date}
                    className={formErrors.date ? "ev-error" : ""}
                    onChange={handleFormChange} />
                  <span className={`ev-field-err${formErrors.date ? " visible" : ""}`}>Please select a date.</span>
                </div>
                <div className="ev-form-group">
                  <label>Time Slot <span style={{ color: "#e74c3c" }}>*</span></label>
                  <input type="text" name="timeSlot" value={form.timeSlot}
                    placeholder="e.g. 9:00 AM - 5:00 PM"
                    className={formErrors.timeSlot ? "ev-error" : ""}
                    onChange={handleFormChange} />
                  <span className={`ev-field-err${formErrors.timeSlot ? " visible" : ""}`}>Please specify a time slot.</span>
                </div>
              </div>

              <div className="ev-form-row">
                <div className="ev-form-group">
                  <label>Customer ID <span style={{ color: "#e74c3c" }}>*</span></label>
                  <label className={`ev-upload-box${formErrors.id ? " ev-error" : ""}`}>
                    <input type="file" accept="image/*" onChange={handleIdUpload} style={{ display: "none" }} />
                    {idPreview
                      ? <img src={idPreview} className="ev-upload-preview" alt="ID Preview" />
                      : <div className="ev-upload-placeholder"><UserIcon /><span>Click to upload ID</span></div>}
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

              <div className="ev-form-group ev-full-width">
                <label>Additional Requests</label>
                <textarea name="requests" rows={4} value={form.requests}
                  placeholder="Any special requests or notes..."
                  onChange={handleFormChange} />
              </div>

              {/* Payment Options */}
              <div className="ev-payment-block">
                <div className="ev-payment-heading">
                  <CardIcon /><strong>Payment Options</strong>
                </div>
                <p className="ev-payment-sub">Pay with cash on arrival, or choose GCash to scan and complete the payment form. A deposit may be required per your agreement with the venue.</p>
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

              <div className="ev-modal-actions">
                <button className="ev-btn-clear" onClick={clearResForm}>Clear</button>
                <button className="ev-btn-submit" onClick={handleSubmitRes}>Submit Reservation</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ PAYMENT MODAL ══ */}
      {payOpen && (
        <div className="ev-modal-backdrop active"
          onClick={e => { if (e.target === e.currentTarget) closePay(); }}>
          <div className="ev-modal ev-payment-modal">
            <div className="ev-modal-header">
              <h2 className="ev-modal-title">GCash Payment</h2>
              <button className="ev-modal-close" onClick={closePay}>✕</button>
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
                <h3 className="ev-payment-form-title">Fill this Form</h3>
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
                <div className="ev-form-group" style={{ marginTop: "10px" }}>
                  <label>Transaction ID <span style={{ color: "#e74c3c" }}>*</span></label>
                  <input type="text" name="txId" value={payForm.txId}
                    placeholder="Enter transaction ID"
                    className={payErrors.txId ? "ev-error" : ""}
                    onChange={handlePayFormChange} />
                  <span className={`ev-field-err${payErrors.txId ? " visible" : ""}`}>Transaction ID is required.</span>
                </div>
                <div className="ev-form-group" style={{ marginTop: "10px" }}>
                  <label>Proof of Payment <span style={{ color: "#e74c3c" }}>*</span></label>
                  <label className={`ev-upload-box ev-proof-upload${payErrors.proof ? " ev-error" : ""}`}>
                    <input type="file" accept="image/*" onChange={handleProofUpload} style={{ display: "none" }} />
                    {proofPreview
                      ? <img src={proofPreview} className="ev-upload-preview" alt="Proof Preview" />
                      : <div className="ev-upload-placeholder"><UploadIcon /><span>Upload your proof of payment here...</span></div>}
                  </label>
                  <span className={`ev-field-err${payErrors.proof ? " visible" : ""}`}>Please upload proof of payment.</span>
                </div>
                <div className="ev-payment-form-actions">
                  <button type="button" className="ev-btn-clear" onClick={clearPayForm} disabled={resSubmitting}>
                    Clear
                  </button>
                  <button type="button" className="ev-btn-submit" onClick={submitPayment} disabled={resSubmitting}>
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
        <div className="ev-confirm-backdrop active">
          <div className="ev-confirm-dialog">
            <div className="ev-confirm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="ev-confirm-exclaim">!</span>
            </div>
            <h3 className="ev-confirm-title">Submit Reservation?</h3>
            <div className="ev-confirm-btns">
              <button type="button" className="ev-btn-cancel-confirm" onClick={() => setConfirmOpen(false)} disabled={resSubmitting}>
                Cancel
              </button>
              <button type="button" className="ev-btn-submit-confirm" onClick={confirmSubmit} disabled={resSubmitting}>
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
              <a href="#" onClick={e => { e.preventDefault(); setResSuccess(false); }}>Back to Venues</a>
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
              <a href="#" onClick={e => { e.preventDefault(); setPaySuccess(false); }}>Back to Venues</a>
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