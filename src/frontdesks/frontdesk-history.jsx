import { useState, useEffect, useCallback, useRef } from "react";
import { TopbarUserIcon } from "./frontdeskTopbarIcons";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { useFrontdeskPendingNotifications } from "./useFrontdeskPendingNotifications";
import { Modal } from "../components/Modal";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useFrontdeskShell } from "./FrontdeskShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import FrontdeskSidebarToggle from "./FrontdeskSidebarToggle";
import FrontdeskSidebar from "./FrontdeskSidebar";
import { StaffNotificationDetailModal, useStaffNotificationDetail } from "./StaffNotificationDetailModal";
import { fetchBookingsBackend, fetchRoomsCatalog, GUEST_BOOKINGS_STORAGE_PING_KEY } from "../api/guestApi";
import {
  bookingAddressDisplay,
  bookingCustomerDisplayName,
  bookingEmailDisplay,
  bookingPhoneDisplay,
  buildRoomIdToNumberMap,
  formatRoomTableNumber,
} from "../guests/bookingRoomDisplay";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import "./frontdesk-history.css";

/** From label e.g. "Single Suites - RM01" */
function splitWalkinRoomSelection(roomSel) {
  if (!roomSel || typeof roomSel !== "string") return { roomno: "—", packageLabel: "" };
  const trimmed = roomSel.trim();
  const rm = trimmed.match(/\b(RM\d{2,})\b/i);
  const roomno = rm ? rm[1].toUpperCase() : "—";
  const parts = trimmed.split("-");
  const packageLabel = parts.length > 1 ? parts.slice(0, -1).join("-").trim() : trimmed;
  return { roomno, packageLabel: packageLabel || trimmed };
}

function parsePesoNum(v) {
  if (v == null || v === "") return NaN;
  const n = Number(String(v).replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function fmtPesoFromStr(v) {
  const n = parsePesoNum(v);
  if (!Number.isFinite(n)) return v && String(v).trim() ? String(v) : "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** DD-MM-YYYY for list tables (matches reservation history design). */
function formatDateDDMMYYYY(s) {
  if (s == null || s === "" || s === "—") return "—";
  const str = String(s);
  const d = str.includes("T") ? new Date(str) : new Date(`${str}T12:00:00`);
  if (Number.isNaN(d.getTime())) return str;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function mapRoomHistoryRow(b, roomIdToNumber) {
  const { roomno, packageLabel } = splitWalkinRoomSelection(String(b.roomTitle || ""));
  const roomNoFinal = formatRoomTableNumber(b, roomIdToNumber, roomno !== "—" ? roomno : undefined);
  const roomTitleDisplay = String(b.roomTitle || "").trim() || "—";
  return {
    bookingId: String(b.id || ""),
    customer: bookingCustomerDisplayName(b),
    package: packageLabel || roomTitleDisplay,
    checkin: b.checkIn || "—",
    checkout: b.checkOut || "—",
    total: fmtPesoFromStr(b.totalAmount),
    contact: bookingPhoneDisplay(b),
    address: bookingAddressDisplay(b),
    email: bookingEmailDisplay(b),
    price: fmtPesoFromStr(b.totalAmount),
    type: "Room",
    paydate: b.updatedAt ? new Date(b.updatedAt).toLocaleDateString("en-PH") : "—",
    amountPaid: fmtPesoFromStr(b.paymentAmount),
    roomNo: roomNoFinal,
    roomTitle: roomTitleDisplay,
    status: String(b.status || "—"),
    raw: b,
  };
}

function mapEventHistoryRow(b) {
  const venueLabel = String(b.venueName || "").trim();
  const eventName = String(b.eventTitle || "").trim();
  return {
    bookingId: String(b.id || ""),
    customer: bookingCustomerDisplayName(b),
    package: venueLabel || eventName || "Event",
    checkin: b.eventDate || "—",
    checkout: b.eventEndDate || b.eventDate || "—",
    total: fmtPesoFromStr(b.totalAmount),
    contact: bookingPhoneDisplay(b),
    address: bookingAddressDisplay(b),
    email: bookingEmailDisplay(b),
    venueName: venueLabel || "—",
    eventTitle: eventName || "—",
    venueRef: String(b.eventVenueId || "").trim() || "—",
    expectedPax: b.expectedPax != null ? String(b.expectedPax) : "—",
    timeSlot: String(b.timeSlot || "").trim() || "—",
    price: fmtPesoFromStr(b.venuePrice || b.totalAmount),
    status: String(b.status || "—"),
    paydate: b.updatedAt ? new Date(b.updatedAt).toLocaleDateString("en-PH") : "—",
    amountPaid: fmtPesoFromStr(b.paymentAmount),
    raw: b,
  };
}

/* ── SVG ICONS ── */
const Icons = {
  dashboard: (<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>),
  rooms: (<svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z"/></svg>),
  events: (<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="22" height="22"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z"/></svg>),
  housekeeping: (<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>),
  bills: (<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>),
  history: (<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
  settings: (<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>),
  search: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>),
  eye: (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>),
};

export default function ReservationHistory() {
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [currentTab, setCurrentTab] = useState("room");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { staffNotification, openStaffNotification, closeStaffNotification } = useStaffNotificationDetail();
  const [roomRows, setRoomRows] = useState([]);
  const [eventRows, setEventRows] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");

  const { pendingCount, displayNotifications, markStaffNotificationsSeen } = useFrontdeskPendingNotifications({
    bookingType: "all",
  });
  const { topbarProfile } = useTopbarUserProfile("frontdesk");
  const userRef = useRef(null);
  const notifRef = useRef(null);
  const loadBookings = useCallback(async () => {
    setListLoading(true);
    setListError("");
    if (!getStoredAuthToken()) {
      setRoomRows([]);
      setEventRows([]);
      setListLoading(false);
      return;
    }
    try {
      const [list, catalog] = await Promise.all([
        fetchBookingsBackend(),
        fetchRoomsCatalog().catch(() => []),
      ]);
      const roomIdToNumber = buildRoomIdToNumberMap(catalog);
      const rows = Array.isArray(list) ? list : [];
      const rooms = rows.filter((b) => b.type === "room").map((b) => mapRoomHistoryRow(b, roomIdToNumber));
      const events = rows.filter((b) => b.type === "event").map(mapEventHistoryRow);
      setRoomRows(rooms);
      setEventRows(events);
    } catch (e) {
      setListError(e.message || "Could not load reservation history.");
      setRoomRows([]);
      setEventRows([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    const onToken = () => loadBookings();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
  }, [loadBookings]);

  /** Same-tab + cross-tab: front desk checkout / approve pings booking lists. */
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === GUEST_BOOKINGS_STORAGE_PING_KEY) loadBookings();
    };
    const onPing = () => loadBookings();
    window.addEventListener("storage", onStorage);
    window.addEventListener("abela-guest-bookings-ping", onPing);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("abela-guest-bookings-ping", onPing);
    };
  }, [loadBookings]);

  useEffect(() => {
    function handler(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = search.toLowerCase().trim();
  const filteredRoom = roomRows.filter((r) => {
    if (!q) return true;
    const blob = [
      r.customer,
      r.package,
      r.status,
      formatDateDDMMYYYY(r.checkin),
      formatDateDDMMYYYY(r.checkout),
      String(r.checkin),
      String(r.checkout),
      r.total,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });
  const filteredEvent = eventRows.filter((r) => {
    if (!q) return true;
    const blob = [
      r.customer,
      r.package,
      r.status,
      String(r.eventTitle || ""),
      String(r.venueName || ""),
      formatDateDDMMYYYY(r.checkin),
      formatDateDDMMYYYY(r.checkout),
      String(r.checkin),
      String(r.checkout),
      r.total,
    ]
      .join(" ")
      .toLowerCase();
    return blob.includes(q);
  });

  const modalRecord = modal && modal.row ? modal.row : null;

  const switchTab = (tab) => { setCurrentTab(tab); setSearch(""); };

  const { mainStyle } = useFrontdeskShell();

  return (
    <>
      <RailPortalShell
        rootClassName="frontdesk-app"
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%" }}
        mainStyle={mainStyle}
        sidebar={
          <FrontdeskSidebar
            navItems={[
              { href: "/frontdesk-dashboard", label: "Dashboard", icon: Icons.dashboard },
              { href: "/frontdesk-rooms", label: "Rooms", icon: Icons.rooms },
              { href: "/frontdesk-events", label: "Events", icon: Icons.events },
              { href: "/frontdesk-housekeeping", label: "Housekeeping", icon: Icons.housekeeping },
              { href: "/frontdesk-bills", label: "Bills", icon: Icons.bills },
              { href: "/frontdesk-history", label: "Reservation History", icon: Icons.history },
              { href: "/frontdesk-settings", label: "Settings", icon: Icons.settings },
            ]}
          />
        }
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <FrontdeskSidebarToggle />
            <span className="breadcrumb-chevron" aria-hidden>
              ›
            </span>
            <span className="breadcrumb-title">Reservation History</span>
          </div>
          <div className="topbar-actions">
            <RoleTopbarBell
              ref={notifRef}
              isOpen={notifOpen}
              onBellClick={(e) => {
                e.stopPropagation();
                setNotifOpen((v) => {
                  if (!v) void markStaffNotificationsSeen();
                  return !v;
                });
                setUserOpen(false);
              }}
              notifications={displayNotifications}
              dot={pendingCount > 0 ? "active" : null}
              dotTitle="Pending or unread alerts"
              onItemClick={(n) => {
                setNotifOpen(false);
                setUserOpen(false);
                openStaffNotification(n);
              }}
            />
            <div className="icon-btn" ref={userRef} onClick={() => setUserOpen((v) => !v)}>
              <TopbarUserIcon />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                &#9662;
              </span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={topbarProfile}
                profilePath={TOPBAR.frontdesk.profilePath}
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

        <main className="content fd-history-main">
          <div className="fd-history-stack">
            <div className="fd-history-page-hero">
              <h1 className="fd-history-page-title">Reservation History</h1>
            </div>

            <div className="fd-history-card">
              <div className="fd-history-segment-wrap">
                <div className="fd-history-segment" role="tablist" aria-label="Reservation type">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={currentTab === "room"}
                    className={
                      "fd-history-segment__btn" + (currentTab === "room" ? " fd-history-segment__btn--active" : "")
                    }
                    onClick={() => switchTab("room")}
                  >
                    Room
                  </button>
                  <div className="fd-history-segment__divider" aria-hidden />
                  <button
                    type="button"
                    role="tab"
                    aria-selected={currentTab === "event"}
                    className={
                      "fd-history-segment__btn" + (currentTab === "event" ? " fd-history-segment__btn--active" : "")
                    }
                    onClick={() => switchTab("event")}
                  >
                    Event
                  </button>
                </div>
              </div>

              <div className="fd-history-card-body">
                <div className="search-wrap fd-history-search">
                  <span className="search-icon">{Icons.search}</span>
                  <input
                    type="search"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-input"
                    autoComplete="off"
                  />
                </div>

                {listError ? <p className="fd-history-list-error">{listError}</p> : null}

                {currentTab === "room" && (
                  <div className="rh-table-wrap rh-table-wrap--in-card">
                    <table className="rh-table rh-table--reservation-mock">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Package</th>
                          <th>Check-In</th>
                          <th>Check-Out</th>
                          <th>Total</th>
                          <th className="th-action">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listLoading ? (
                          <tr>
                            <td colSpan={6} className="td-empty">
                              Loading…
                            </td>
                          </tr>
                        ) : filteredRoom.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="td-empty">
                              No reservations found.
                            </td>
                          </tr>
                        ) : (
                          filteredRoom.map((r) => (
                            <tr key={r.bookingId}>
                              <td>{r.customer}</td>
                              <td>{r.package}</td>
                              <td>{formatDateDDMMYYYY(r.checkin)}</td>
                              <td>{formatDateDDMMYYYY(r.checkout)}</td>
                              <td>{r.total}</td>
                              <td className="action-cell">
                                <button
                                  type="button"
                                  className="action-btn view-btn"
                                  title="View details"
                                  onClick={() => setModal({ type: "room", row: r })}
                                >
                                  {Icons.eye}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {currentTab === "event" && (
                  <div className="rh-table-wrap rh-table-wrap--in-card">
                    <table className="rh-table rh-table--reservation-mock">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Package</th>
                          <th>Check-In</th>
                          <th>Check-Out</th>
                          <th>Total</th>
                          <th className="th-action">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {listLoading ? (
                          <tr>
                            <td colSpan={6} className="td-empty">
                              Loading…
                            </td>
                          </tr>
                        ) : filteredEvent.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="td-empty">
                              No reservations found.
                            </td>
                          </tr>
                        ) : (
                          filteredEvent.map((r) => (
                            <tr key={r.bookingId}>
                              <td>{r.customer}</td>
                              <td>{r.package}</td>
                              <td>{formatDateDDMMYYYY(r.checkin)}</td>
                              <td>{formatDateDDMMYYYY(r.checkout)}</td>
                              <td>{r.total}</td>
                              <td className="action-cell">
                                <button
                                  type="button"
                                  className="action-btn view-btn"
                                  title="View details"
                                  onClick={() => setModal({ type: "event", row: r })}
                                >
                                  {Icons.eye}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </RailPortalShell>

      <Modal
        open={!!(modal && modalRecord)}
        onClose={() => setModal(null)}
        title="Reservation Details"
        size="lg"
        placement="top"
        panelClassName="fd-history-modal fd-history-details-modal"
        bodyClassName="modal-body-scroll"
      >
        {modal && modalRecord ? (
          <>
              <div className="modal-two-col">
                <div className="modal-card">
                  <h4 className="modal-card-title">Guest Information</h4>
                  <div className="detail-list">
                    <div><span className="detail-label">Name</span><span className="detail-value">{modalRecord.customer}</span></div>
                    <div><span className="detail-label">Contact</span><span className="detail-value">{modalRecord.contact}</span></div>
                    <div><span className="detail-label">Address</span><span className="detail-value">{modalRecord.address}</span></div>
                    <div><span className="detail-label">Email</span><span className="detail-value">{modalRecord.email}</span></div>
                  </div>
                </div>
                <div className="modal-card">
                  <h4 className="modal-card-title">Reservation Details</h4>
                  <div className="detail-list">
                    {modal.type === "room" ? (
                      <>
                        <div><span className="detail-label">Room No.</span><span className="detail-value">{modalRecord.roomNo}</span></div>
                        <div><span className="detail-label">Room</span><span className="detail-value">{modalRecord.roomTitle}</span></div>
                        <div><span className="detail-label">Check-In</span><span className="detail-value">{modalRecord.checkin}</span></div>
                        <div><span className="detail-label">Check-Out</span><span className="detail-value">{modalRecord.checkout}</span></div>
                        <div><span className="detail-label">Rate / Package</span><span className="detail-value">{modalRecord.package}</span></div>
                        <div><span className="detail-label">Price</span><span className="detail-value">{modalRecord.price}</span></div>
                        <div><span className="detail-label">Status</span><span className="detail-value">{modalRecord.status}</span></div>
                      </>
                    ) : (
                      <>
                        <div><span className="detail-label">Event</span><span className="detail-value">{modalRecord.eventTitle}</span></div>
                        <div><span className="detail-label">Venue</span><span className="detail-value">{modalRecord.venueName}</span></div>
                        <div><span className="detail-label">Event Start</span><span className="detail-value">{modalRecord.checkin}</span></div>
                        <div><span className="detail-label">Event End</span><span className="detail-value">{modalRecord.checkout}</span></div>
                        <div><span className="detail-label">Guests (Pax)</span><span className="detail-value">{modalRecord.expectedPax}</span></div>
                        {modalRecord.timeSlot && modalRecord.timeSlot !== "—" ? (
                          <div><span className="detail-label">Time Slot</span><span className="detail-value">{modalRecord.timeSlot}</span></div>
                        ) : null}
                        <div><span className="detail-label">Price</span><span className="detail-value">{modalRecord.price}</span></div>
                        <div><span className="detail-label">Venue Ref</span><span className="detail-value">{modalRecord.venueRef}</span></div>
                        <div><span className="detail-label">Status</span><span className="detail-value">{modalRecord.status}</span></div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-card billing-card">
                <h4 className="modal-card-title">Billing Summary</h4>
                <div className="billing-list">
                  <div className="bl-row"><span>Last updated</span><span>{modalRecord.paydate}</span></div>
                  <div className="bl-row"><span>Total amount</span><span>{modalRecord.total}</span></div>
                  <div className="bl-row"><span>Amount paid</span><span>{modalRecord.amountPaid}</span></div>
                </div>
              </div>
          </>
        ) : null}
      </Modal>

      <StaffNotificationDetailModal notification={staffNotification} onClose={closeStaffNotification} />

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}
