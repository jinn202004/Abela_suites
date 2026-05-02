import { useState, useEffect, useRef, useCallback, useLayoutEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TopbarUserIcon } from "../frontdesks/frontdeskTopbarIcons";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { fetchBookingsBackend, patchBookingBackend, fetchRoomsCatalog, fetchEventVenuesBackend } from "../api/guestApi";
import {
  buildRoomIdToNumberMap,
  buildEventVenueIdToEventNumMap,
  buildEventVenueIdToNameMap,
  eventNumberColumn,
  eventVenueNameFromBooking,
  formatRoomTableNumber,
  getBookingRoomNumber,
  looksLikeMongoObjectId,
} from "./bookingRoomDisplay";
import { getBackendBaseURL } from "../api/config";
import { getStoredAuthToken, clearStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { useGuestTopbarNotifications } from "./useGuestTopbarNotifications";
import { resolveGuestIdImageSrc } from "./guestBookingIdPhoto";
import GuestSidebar from "./GuestSidebar";
import { GuestArchiveIcon } from "./guestArchiveIcon";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
import { Modal } from "../components/Modal";
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

const SLIDES = [
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
const TOTAL_DOTS = 3;
const SLIDES_PER_DOT = 3;

function parseMoney(v) {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : null;
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

function bookingReferenceDisplay(booking) {
  if (!booking) return "—";
  const dateCompact = booking.createdAt
    ? new Date(booking.createdAt).toISOString().slice(0, 10).replace(/-/g, "")
    : "";
  const idVal = booking.id ?? booking._id;
  let suffix = "0000";
  if (idVal != null) {
    const s =
      typeof idVal === "object" && idVal != null && "$oid" in idVal
        ? String(idVal.$oid)
        : String(idVal);
    const idStr = s.trim();
    if (looksLikeMongoObjectId(idStr)) {
      suffix = String(parseInt(idStr.slice(-4), 16) % 10000).padStart(4, "0");
    } else {
      const digits = idStr.replace(/\D/g, "");
      if (digits.length >= 4) suffix = digits.slice(-4);
      else if (idStr.length >= 4) {
        const tail = idStr.slice(-4).replace(/[^a-zA-Z0-9]/g, "");
        if (tail) suffix = tail.toUpperCase();
      }
    }
  }
  if (!dateCompact) return `ABR-${suffix}`;
  return `ABR-${dateCompact}-${suffix}`;
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
  if (k === "declined" || k === "rejected") return "Declined";
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
      const resList = bookings.filter((b) => b.type === "room");
      const evList = bookings.filter((b) => b.type === "event");
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
    function onAuthChanged() {
      loadBookings();
      loadGuestNotifications();
    }
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuthChanged);
  }, [loadBookings, loadGuestNotifications]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % TOTAL_DOTS);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const updateCarouselTransform = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slideEl = track.querySelector(".carousel-slide");
    if (!slideEl) return;
    const slideW = slideEl.offsetWidth + 12;
    track.style.transform = `translateX(-${current * slideW * SLIDES_PER_DOT}px)`;
  }, [current]);

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
  }

  function openCancelFlow() {
    setCancelReason("");
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
    setCancelSubmitting(true);
    try {
      if (!getStoredAuthToken()) {
        window.alert("Log in with your guest account to cancel a booking.");
        return;
      }
      await patchBookingBackend(selectedRow.id, { status: "cancelled" });
      setUnifiedRows((rows) => rows.filter((r) => r.key !== selectedRow.key));
      loadGuestNotifications();
      setConfirmOpen(false);
      setCancelOpen(false);
      setSelectedRow(null);
      setSuccessOpen(true);
      window.setTimeout(() => setSuccessOpen(false), 3200);
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
    ["pending", "approved", "confirmed"].includes(normStatus(selectedRow.status));

  const roomRaw = selectedRow?.kind === "room" ? selectedRow.raw : null;
  const eventRaw = selectedRow?.kind === "event" ? selectedRow.raw : null;
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
                {SLIDES.map((src, i) => (
                  <div className="carousel-slide" key={i}>
                    <img src={src} alt={`Deal ${i + 1}`} />
                  </div>
                ))}
              </div>
            </div>
            <div className="carousel-dots">
              {Array.from({ length: TOTAL_DOTS }).map((_, i) => (
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
                    {hasGuestEmail
                      ? "You don&apos;t have any active bookings yet. Reserve a room or venue to see it here."
                      : "Log in, or complete a reservation with your email, to see your bookings here."}
                  </p>
                  <Link to="/rooms">
                    <button type="button" className="btn-book-now">
                      Book Now
                    </button>
                  </Link>
                </div>
              )}

              {!bookingsLoading && unifiedRows.length > 0 && (
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
        placement="top"
        overlayClassName="guest-home-modal-overlay"
        panelClassName="guest-reservation-details modal-box--details"
        bodyClassName="modal-body--details-scroll"
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
              {roomRaw && (() => {
                const roomBm = roomBookingMoneyForDisplay(roomRaw);
                const { downpaymentShown, totalPaidShown } = roomBookingModalBillingSplit(roomRaw, roomBm);
                return (
                <>
                  <div className="modal-two-col modal-two-col--detail-hero">
                    <div className="modal-card">
                      <h4 className="modal-card-title">Room Details</h4>
                      <div className="detail-grid">
                        <div>
                          <span className="detail-label">Room</span>
                          <span className="detail-value">{roomDetailDisplayNumber(roomRaw, roomIdToNumber)}</span>
                        </div>
                        <div>
                          <span className="detail-label">Type</span>
                          <span className="detail-value">{roomRaw.roomTitle || "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Price</span>
                          <span className="detail-value">{formatPesoModal(roomBm.total)}</span>
                        </div>
                        <div>
                          <span className="detail-label">Status</span>
                          <span className="detail-value">{statusTableLabel(roomRaw.status)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="modal-card">
                      <h4 className="modal-card-title">Guest Information</h4>
                      <div className="detail-list">
                        <div>
                          <span className="detail-label">Guest</span>
                          <span className="detail-value">{roomRaw.customerName || "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Email</span>
                          <span className="detail-value">{roomRaw.email || "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Contact</span>
                          <span className="detail-value">{roomRaw.contactNumber || "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Check-In</span>
                          <span className="detail-value">{roomRaw.checkIn || "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Check-Out</span>
                          <span className="detail-value">{roomRaw.checkOut || "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Additional Guest</span>
                          <span className="detail-value">{String(roomRaw.additionalGuests ?? "0")}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-card guest-details-balance-strip">
                    <div className="guest-details-balance-grid">
                      <div>
                        <span className="detail-label remaining">Remaining Balance</span>
                        <span className="detail-value remaining guest-details-balance-value">
                          {formatPesoModal(roomBm.balance)}
                        </span>
                      </div>
                      <div>
                        <span className="detail-label paid">Total Paid</span>
                        <span className="detail-value paid guest-details-balance-value">
                          {formatPesoModal(totalPaidShown)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="modal-card">
                    <h4 className="modal-card-title">Billing Summary</h4>
                    <div className="billing-grid billing-grid--compact">
                      <div>
                        <span className="detail-label">Total Amount</span>
                        <span className="detail-value">{formatPesoModal(roomBm.total)}</span>
                      </div>
                      <div>
                        <span className="detail-label">Downpayment</span>
                        <span className="detail-value">{formatPesoModal(downpaymentShown)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="modal-card guest-details-ref-card">
                    <h4 className="modal-card-title">Reference Number</h4>
                    <span className="detail-value reference-number-value">{bookingReferenceDisplay(roomRaw)}</span>
                  </div>
                  <div className="modal-two-col modal-two-col--detail-payment">
                    <div className="modal-card">
                      <h4 className="modal-card-title">Payment Details</h4>
                      <div className="detail-grid detail-grid--payment-block">
                        <div>
                          <span className="detail-label">Payment Method</span>
                          <span className="detail-value">{roomRaw.paymentType || roomRaw.paymentMethod || "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Amount Paid</span>
                          <span className="detail-value">{formatPesoModal(totalPaidShown)}</span>
                        </div>
                        <div className="detail-grid__full">
                          <span className="detail-label">Transaction ID</span>
                          <span className="detail-value">
                            {roomRaw.paymentTransactionId || roomRaw.transactionId || "—"}
                          </span>
                        </div>
                        <div>
                          <span className="detail-label">Date</span>
                          <span className="detail-value">{formatPaymentDateDisplay(roomRaw.paymentDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="id-uploaded-card guest-details-id-card">
                      <h4 className="id-uploaded-card-title">ID Uploaded</h4>
                      <div className="id-uploaded-frame">
                        {roomIdPhotoSrc ? (
                          <img
                            src={roomIdPhotoSrc}
                            alt="Government ID"
                            className="id-img"
                            decoding="async"
                            onError={(e) => {
                              const el = e.currentTarget;
                              el.style.background = "#e8dcc8";
                              el.style.minHeight = "100px";
                            }}
                          />
                        ) : (
                          <div className="id-placeholder">No government ID on file</div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
                );
              })()}

              {eventRaw && (
                <>
                  <div className="modal-two-col">
                    <div className="modal-card">
                      <h4 className="modal-card-title">Venue</h4>
                      <div className="detail-list">
                        <div>
                          <span className="detail-label">Venue</span>
                          <span className="detail-value">{eventRaw.venueName || "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Event</span>
                          <span className="detail-value">{eventRaw.eventTitle || "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Date</span>
                          <span className="detail-value">{eventRaw.eventDate || "—"}</span>
                        </div>
                        {eventRaw.eventEndDate && (
                          <div>
                            <span className="detail-label">End date</span>
                            <span className="detail-value">{eventRaw.eventEndDate}</span>
                          </div>
                        )}
                        <div>
                          <span className="detail-label">Expected pax</span>
                          <span className="detail-value">{eventRaw.expectedPax ?? "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Status</span>
                          <span className="detail-value">{(eventRaw.status || "pending").replace(/^./, (c) => c.toUpperCase())}</span>
                        </div>
                      </div>
                    </div>
                    <div className="modal-card">
                      <h4 className="modal-card-title">Contact</h4>
                      <div className="detail-list">
                        <div>
                          <span className="detail-label">Name</span>
                          <span className="detail-value">{eventRaw.customerName || "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Email</span>
                          <span className="detail-value">{eventRaw.email || "—"}</span>
                        </div>
                        <div>
                          <span className="detail-label">Phone</span>
                          <span className="detail-value">{eventRaw.contactNumber || "—"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="modal-card">
                    <h4 className="modal-card-title">Billing</h4>
                    <div className="billing-grid">
                      <div>
                        <span className="detail-label">Quoted price</span>
                        <span className="detail-value">{formatPeso(parseMoney(eventRaw.venuePrice))}</span>
                      </div>
                    </div>
                  </div>
                  <div className="id-uploaded-card id-uploaded-card--standalone guest-details-id-card--event">
                    <h4 className="id-uploaded-card-title">ID Uploaded</h4>
                    <div className="id-uploaded-frame">
                      {eventIdPhotoSrc ? (
                        <img
                          src={eventIdPhotoSrc}
                          alt="Government ID"
                          className="id-img"
                          decoding="async"
                          onError={(e) => {
                            const el = e.currentTarget;
                            el.style.background = "#e8dcc8";
                            el.style.minHeight = "100px";
                          }}
                        />
                      ) : (
                        <div className="id-placeholder">No government ID on file</div>
                      )}
                    </div>
                  </div>
                </>
              )}
      </Modal>

      <Modal
        open={cancelOpen && !!selectedRow}
        onClose={closeCancel}
        title="Reason of Cancelation"
        size="sm"
        placement="top"
        overlayClassName="guest-home-modal-overlay"
      >
        <p className="cancel-label">Please provide a reason for cancellation</p>
        <textarea
          className="cancel-textarea"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="Write reason here..."
        />
        <div className="modal-footer space-between">
          <button type="button" className="btn-clear" onClick={() => setCancelReason("")}>
            Clear
          </button>
          <button type="button" className="btn-submit-cancel" onClick={() => setConfirmOpen(true)}>
            Submit Cancellation
          </button>
        </div>
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
        onClose={() => setSuccessOpen(false)}
        placement="center"
        contentOnly
        shellStyle={false}
        size="sm"
        panelClassName="success-box"
        ariaLabel="Submission successful"
      >
        <div className="success-icon">✓</div>
        <div className="success-title">Submitted Successfully!</div>
        <div className="success-sub">Your booking is under review. Please wait for an SMS confirmation.</div>
      </Modal>

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}
