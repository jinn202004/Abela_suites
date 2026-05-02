import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TopbarUserIcon } from "../frontdesks/frontdeskTopbarIcons";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { TOPBAR } from "../topbar/roleTopbarData";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { useGuestTopbarNotifications } from "./useGuestTopbarNotifications";
import GuestSidebar from "./GuestSidebar";
import { GuestArchiveIcon } from "./guestArchiveIcon";
import {
  fetchBookingsBackend,
  fetchRoomsCatalog,
  fetchEventVenuesBackend,
  dispatchGuestNotificationsRefresh,
  GUEST_BOOKINGS_STORAGE_PING_KEY,
  fetchMyReviewsBackend,
  submitGuestReviewBackend,
} from "../api/guestApi";
import {
  buildRoomIdToNumberMap,
  buildEventVenueIdToEventNumMap,
  buildEventVenueIdToNameMap,
  eventNumberColumn,
  eventVenueNameFromBooking,
  formatRoomTableNumber,
} from "./bookingRoomDisplay";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { resolveGuestIdImageSrc } from "./guestBookingIdPhoto";
import "./idUploadedCard.css";
import "./booking-history.css";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";

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
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const SuccessIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24"
    fill="none" stroke="#2ecc71" strokeWidth="2.2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const navItems = [
  { label: "Homepage",     icon: <HomeIcon />,     href: "/home"           },
  { label: "Rooms",        icon: <RoomIcon />,     href: "/rooms"                       },
  { label: "Event Venues", icon: <EventIcon />,    href: "/event-venues"                },
  { label: "Archive",      icon: <GuestArchiveIcon />, href: "/booking-history", active: true },
  { label: "Settings",     icon: <SettingsIcon />, href: "/settings"   },
];

function formatPesoAmount(v) {
  const n = Number(String(v ?? "").replace(/[₱,\s]/g, ""));
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-PH");
}

function formatDateLabel(s) {
  if (s == null || s === "") return "—";
  const str = String(s);
  const d = str.includes("T") ? new Date(str) : new Date(`${str}T12:00:00`);
  return Number.isNaN(d.getTime()) ? str : d.toLocaleDateString("en-PH");
}

function shortId(id) {
  const s = id != null ? String(id) : "";
  return s.length > 10 ? `${s.slice(0, 8)}…` : s || "—";
}

function GuestBookingStatus({ status }) {
  const s = String(status || "").toLowerCase();
  let label = "Pending approval";
  let cls = "bh-status bh-status--pending";
  if (s === "approved" || s === "confirmed") {
    label = "Approved";
    cls = "bh-status bh-status--approved";
  } else if (s === "rejected" || s === "declined") {
    label = "Rejected";
    cls = "bh-status bh-status--rejected";
  } else if (s === "cancelled") {
    label = "Cancelled";
    cls = "bh-status bh-status--rejected";
  } else if (s === "completed") {
    label = "Completed";
    cls = "bh-status bh-status--approved";
  } else if (s === "pending") {
    label = "Pending approval";
  } else if (status) {
    label = String(status);
    cls = "bh-status bh-status--muted";
  }
  return <span className={cls}>{label}</span>;
}

export default function BookingHistory() {
  const navigate = useNavigate();
  const { bookingId: routeBookingId } = useParams();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { topbarProfile } = useTopbarUserProfile("guest");
  const {
    notifRef,
    notifOpen,
    setNotifOpen,
    bellUnreadCount,
    displayNotifications,
  } = useGuestTopbarNotifications();

  // Tabs
  const [activeTab, setActiveTab] = useState("room");

  const [roomBookings, setRoomBookings] = useState([]);
  const [eventBookings, setEventBookings] = useState([]);
  const [roomIdToNumber, setRoomIdToNumber] = useState(() => new Map());
  const [eventVenueNumMap, setEventVenueNumMap] = useState(() => new Map());
  const [eventVenueNameMap, setEventVenueNameMap] = useState(() => new Map());
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const [idModalOpen, setIdModalOpen] = useState(false);
  const [idModalRow, setIdModalRow] = useState(null);
  const [bookingDetailRow, setBookingDetailRow] = useState(null);

  const [reviewedIds, setReviewedIds] = useState(() => new Set());
  const [reviewBookingId, setReviewBookingId] = useState(null);

  // Review modal
  const [showModal, setShowModal]       = useState(false);
  const [rating, setRating]             = useState(1);
  const [reviewText, setReviewText]     = useState("");
  const [imgPreview, setImgPreview]     = useState(null);

  // Confirm dialog
  const [showConfirm, setShowConfirm]   = useState(false);

  // Success toast
  const [showToast, setShowToast]       = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewToastSub, setReviewToastSub] = useState("Thank you and always happy to serve you!");

  const fileInputRef = useRef(null);
  const userRef = useRef(null);
  const [userOpen, setUserOpen] = useState(false);
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
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [notifRef, setNotifOpen]);

  const loadBookings = useCallback(async () => {
    if (!getStoredAuthToken()) {
      setRoomBookings([]);
      setEventBookings([]);
      setRoomIdToNumber(new Map());
      setEventVenueNumMap(new Map());
      setEventVenueNameMap(new Map());
      setListLoading(false);
      setListError("");
      return;
    }
    setListLoading(true);
    setListError("");
    try {
      const [list, catalog, venues] = await Promise.all([
        fetchBookingsBackend(),
        fetchRoomsCatalog().catch(() => []),
        fetchEventVenuesBackend().catch(() => []),
      ]);
      const venuesArr = Array.isArray(venues) ? venues : [];
      setRoomIdToNumber(buildRoomIdToNumberMap(catalog));
      setEventVenueNumMap(buildEventVenueIdToEventNumMap(venuesArr));
      setEventVenueNameMap(buildEventVenueIdToNameMap(venuesArr));
      const arr = Array.isArray(list) ? list : [];
      setRoomBookings(arr.filter((b) => b.type === "room"));
      setEventBookings(arr.filter((b) => b.type === "event"));
      try {
        const mine = await fetchMyReviewsBackend();
        const ids = (Array.isArray(mine) ? mine : []).map((r) => String(r.bookingId || ""));
        setReviewedIds(new Set(ids.filter(Boolean)));
      } catch {
        setReviewedIds(new Set());
      }
      dispatchGuestNotificationsRefresh();
    } catch (e) {
      setListError(e.message || "Could not load bookings.");
      setRoomBookings([]);
      setEventBookings([]);
      setRoomIdToNumber(new Map());
      setEventVenueNumMap(new Map());
      setEventVenueNameMap(new Map());
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const bookingId = String(routeBookingId || "").trim();
    if (!bookingId) return;
    const all = [...roomBookings, ...eventBookings];
    const row = all.find((b) => String(b?.id || "") === bookingId);
    if (!row) return;
    setActiveTab(row.type === "event" ? "event" : "room");
    setBookingDetailRow(row);
  }, [eventBookings, roomBookings, routeBookingId]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === GUEST_BOOKINGS_STORAGE_PING_KEY) loadBookings();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") loadBookings();
    };
    const onAuth = () => loadBookings();
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible" && getStoredAuthToken()) loadBookings();
    }, 45_000);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
      window.clearInterval(poll);
    };
  }, [loadBookings]);

  const idPhotoSrc = idModalRow ? resolveGuestIdImageSrc(idModalRow) : null;

  // ── Handlers ──
  const openIdModal = (b) => {
    setIdModalRow(b);
    setIdModalOpen(true);
  };
  const closeIdModal = () => {
    setIdModalOpen(false);
    setIdModalRow(null);
  };

  const openReviewModal = (bookingId) => {
    setReviewBookingId(bookingId);
    setShowModal(true);
    setRating(1);
  };

  const closeModal = () => {
    setShowModal(false);
    setReviewBookingId(null);
  };

  const clearForm = () => {
    setRating(1);
    setReviewText("");
    setImgPreview(null);
  };

  const handleImgChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImgPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const bid = reviewBookingId != null ? String(reviewBookingId) : "";
    const comment = reviewText.trim();
    if (!bid) return;
    if (!comment) {
      window.alert("Please write a short review.");
      return;
    }
    setReviewSubmitting(true);
    try {
      const review = await submitGuestReviewBackend({ bookingId: bid, rating, comment });
      setReviewToastSub(
        review?.isApproved
          ? "Thank you and always happy to serve you!"
          : "Thanks! Your review was received. It will show on Testimonials after staff approves it."
      );
      setShowConfirm(false);
      setShowModal(false);
      clearForm();
      setReviewedIds((prev) => new Set([...prev, bid]));
      setReviewBookingId(null);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4500);
    } catch (e) {
      window.alert(e?.message || "Could not submit review.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <>
      <RailPortalShell
        rootClassName="guest-booking-history-page guest-portal-layout"
        shellClassName={shellClassName}
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%", background: "#f5f0e8" }}
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
            <span className="breadcrumb-title">Archive</span>
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

        {/* ── PAGE CONTENT ── */}
        <main className="content">
          <div className="bh-wrap">

            {/* Heading */}
            <div className="bh-heading">
              <a href="/settings" className="back-arrow">‹</a>
              <div>
                <h2 className="bh-title">Booking History</h2>
                <p className="bh-sub">Your reservations and the same government ID you uploaded with each booking</p>
              </div>
            </div>

            {/* Table Card */}
            <div className="bh-card">

              {/* Tabs */}
              <div className="bh-tabs">
                <button
                  className={`bh-tab${activeTab === "room" ? " active" : ""}`}
                  onClick={() => setActiveTab("room")}>
                  Room
                </button>
                <button
                  className={`bh-tab${activeTab === "event" ? " active" : ""}`}
                  onClick={() => setActiveTab("event")}>
                  Event
                </button>
              </div>

              {listLoading && (
                <p style={{ margin: "1rem", color: "#9a8060" }}>Loading bookings…</p>
              )}
              {!listLoading && listError && (
                <p style={{ margin: "1rem", color: "#c0392b" }}>{listError}</p>
              )}

              {/* Room Table */}
              {activeTab === "room" && !listLoading && !listError && (
                <div className="bh-table-wrap">
                  <table className="bh-table">
                    <thead>
                      <tr>
                        <th>Ref</th>
                        <th>Room No.</th>
                        <th>Room</th>
                        <th>Price</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roomBookings.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: "center", color: "#9a8060", padding: "32px" }}>
                            No room bookings yet.
                          </td>
                        </tr>
                      ) : (
                        roomBookings.map((b, idx) => {
                          const bid = b.id != null ? String(b.id) : "";
                          const done = reviewedIds.has(bid);
                          const canReview = String(b.status || "").toLowerCase() === "completed";
                          return (
                            <tr key={bid || `room-${idx}`}>
                              <td>{shortId(b.id)}</td>
                              <td>{formatRoomTableNumber(b, roomIdToNumber)}</td>
                              <td>{b.roomTitle || "—"}</td>
                              <td>{formatPesoAmount(b.totalAmount)}</td>
                              <td>{formatDateLabel(b.checkIn)}</td>
                              <td>{formatDateLabel(b.checkOut)}</td>
                              <td>
                                <GuestBookingStatus status={b.status} />
                              </td>
                              <td>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                  <button
                                    type="button"
                                    className="btn-leave-review"
                                    style={{ background: "#8d7a5c", color: "#fff" }}
                                    onClick={() => openIdModal(b)}
                                  >
                                    View ID
                                  </button>
                                  <button
                                    className="btn-leave-review"
                                    onClick={() => openReviewModal(bid)}
                                    disabled={done || !canReview}
                                    title={!canReview ? "Available after your stay is marked completed" : done ? "Already submitted" : "Leave a review"}
                                    style={done || !canReview ? { background: "#aaa", cursor: "default" } : {}}
                                  >
                                    {done ? "Reviewed" : "Leave review"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Event Table */}
              {activeTab === "event" && !listLoading && !listError && (
                <div className="bh-table-wrap">
                  <table className="bh-table">
                    <thead>
                      <tr>
                        <th>Ref</th>
                        <th>Number</th>
                        <th>Event Name</th>
                        <th>Price</th>
                        <th>Date</th>
                        <th>Venue</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventBookings.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: "center", color: "#9a8060", padding: "32px" }}>
                            No event bookings yet.
                          </td>
                        </tr>
                      ) : (
                        eventBookings.map((b, idx) => {
                          const bid = b.id != null ? String(b.id) : "";
                          const done = reviewedIds.has(bid);
                          const canReview = String(b.status || "").toLowerCase() === "completed";
                          return (
                            <tr key={bid || `event-${idx}`}>
                              <td>{shortId(b.id)}</td>
                              <td>{eventNumberColumn(b, eventVenueNumMap)}</td>
                              <td>{b.eventTitle || "—"}</td>
                              <td>{formatPesoAmount(b.totalAmount ?? b.venuePrice)}</td>
                              <td>{formatDateLabel(b.eventDate)}</td>
                              <td>{eventVenueNameFromBooking(b, eventVenueNameMap)}</td>
                              <td>
                                <GuestBookingStatus status={b.status} />
                              </td>
                              <td>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                  <button
                                    type="button"
                                    className="btn-leave-review"
                                    style={{ background: "#8d7a5c", color: "#fff" }}
                                    onClick={() => openIdModal(b)}
                                  >
                                    View ID
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-leave-review"
                                    onClick={() => openReviewModal(bid)}
                                    disabled={done || !canReview}
                                    title={!canReview ? "Available after your event is marked completed" : done ? "Already submitted" : "Leave a review"}
                                    style={done || !canReview ? { background: "#aaa", cursor: "default" } : {}}
                                  >
                                    {done ? "Reviewed" : "Leave review"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        </main>
      </RailPortalShell>

      {/* ── ID preview (same card as Home / frontdesk) ── */}
      {idModalOpen && idModalRow && (
        <div className="bh-modal-backdrop active" onClick={(e) => e.target === e.currentTarget && closeIdModal()}>
          <div className="bh-modal">
            <div className="bh-modal-header bh-modal-header--id-only">
              <button type="button" className="bh-modal-close" onClick={closeIdModal} aria-label="Close">✕</button>
            </div>
            <div className="bh-modal-body bh-modal-body--id-card">
              <div className="id-uploaded-card id-uploaded-card--standalone">
                <h3 className="id-uploaded-card-title">ID Uploaded</h3>
                <div className="id-uploaded-frame">
                  {idPhotoSrc ? (
                    <img src={idPhotoSrc} alt="Government ID" className="id-img" />
                  ) : (
                    <div className="id-placeholder">No image on file</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {bookingDetailRow && (
        <div
          className="bh-modal-backdrop active"
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            setBookingDetailRow(null);
            if (routeBookingId) navigate("/booking-history", { replace: true });
          }}
        >
          <div className="bh-modal">
            <div className="bh-modal-header">
              <h2 className="bh-modal-title">Booking Details</h2>
              <button
                type="button"
                className="bh-modal-close"
                onClick={() => {
                  setBookingDetailRow(null);
                  if (routeBookingId) navigate("/booking-history", { replace: true });
                }}
              >
                ✕
              </button>
            </div>
            <div className="bh-modal-body">
              <div style={{ display: "grid", gap: 8 }}>
                <div><strong>Reference:</strong> {shortId(bookingDetailRow.id)}</div>
                <div><strong>Status:</strong> <GuestBookingStatus status={bookingDetailRow.status} /></div>
                <div><strong>Guest:</strong> {bookingDetailRow.customerName || "—"}</div>
                <div><strong>Email:</strong> {bookingDetailRow.email || "—"}</div>
                <div><strong>Contact:</strong> {bookingDetailRow.contactNumber || "—"}</div>
                <div><strong>Type:</strong> {bookingDetailRow.type === "event" ? "Event booking" : "Room reservation"}</div>
                {bookingDetailRow.type === "event" ? (
                  <>
                    <div><strong>Event venue:</strong> {eventVenueNameFromBooking(bookingDetailRow, eventVenueNameMap)}</div>
                    <div><strong>Event date:</strong> {formatDateLabel(bookingDetailRow.eventDate)}</div>
                    <div><strong>Event end:</strong> {formatDateLabel(bookingDetailRow.eventEndDate)}</div>
                    <div><strong>Expected pax:</strong> {bookingDetailRow.expectedPax || "—"}</div>
                  </>
                ) : (
                  <>
                    <div><strong>Room:</strong> {formatRoomTableNumber(bookingDetailRow, roomIdToNumber)}</div>
                    <div><strong>Check-in:</strong> {formatDateLabel(bookingDetailRow.checkIn)}</div>
                    <div><strong>Check-out:</strong> {formatDateLabel(bookingDetailRow.checkOut)}</div>
                  </>
                )}
                <div><strong>Total:</strong> PHP {formatPesoAmount(bookingDetailRow.totalAmount)}</div>
                <div><strong>Payment:</strong> {bookingDetailRow.paymentMethod || "—"} ({bookingDetailRow.paymentAmount || "0"})</div>
                <div><strong>Transaction:</strong> {bookingDetailRow.transactionId || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── REVIEW MODAL ── */}
      {showModal && (
        <div className="bh-modal-backdrop active" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="bh-modal">
            <div className="bh-modal-header">
              <h2 className="bh-modal-title">Leave Review</h2>
              <button className="bh-modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="bh-modal-body">

              {/* Stars */}
              <div className="star-rating">
                {[1,2,3,4,5].map((val) => (
                  <span key={val}
                    className={`star${rating >= val ? " filled" : ""}`}
                    onClick={() => setRating(val)}>
                    ★
                  </span>
                ))}
              </div>
              <p className="rate-us-label">Rate Us</p>

              {/* Review Text */}
              <div className="bh-form-group">
                <label>Review</label>
                <textarea
                  rows="4"
                  placeholder="Write something..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
              </div>

              {/* Upload Image */}
              <div className="bh-form-group">
                <label>Upload Image (Optional)</label>
                <label className="bh-upload-box" onClick={() => fileInputRef.current.click()}>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: "none" }}
                    onChange={handleImgChange}
                  />
                  {imgPreview ? (
                    <img src={imgPreview} className="bh-upload-preview"
                      style={{ display: "block", width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 4 }}
                      alt="Preview" />
                  ) : (
                    <div className="bh-upload-placeholder">
                      <UploadIcon />
                      <span>Upload your image here...</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Actions */}
              <div className="bh-modal-actions">
                <button className="bh-btn-clear" onClick={clearForm}>Clear</button>
                <button className="bh-btn-submit" onClick={() => setShowConfirm(true)}>Submit</button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DIALOG ── */}
      {showConfirm && (
        <div className="bh-confirm-backdrop active">
          <div className="bh-confirm-dialog">
            <div className="bh-confirm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24"
                fill="none" stroke="#e74c3c" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="bh-confirm-exclaim">!</span>
            </div>
            <h3 className="bh-confirm-title">Submit Review?</h3>
            <div className="bh-confirm-btns">
              <button className="bh-btn-cancel-confirm" onClick={() => setShowConfirm(false)} disabled={reviewSubmitting}>Cancel</button>
              <button className="bh-btn-submit-confirm" onClick={() => void handleSubmit()} disabled={reviewSubmitting}>
                {reviewSubmitting ? "Submitting…" : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUCCESS TOAST ── */}
      {showToast && (
        <div className="bh-success-toast active">
          <div className="bh-success-inner">
            <SuccessIcon />
            <div>
              <p className="bh-success-title">Review Submitted!</p>
              <p className="bh-success-sub">{reviewToastSub}</p>
            </div>
          </div>
        </div>
      )}

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
