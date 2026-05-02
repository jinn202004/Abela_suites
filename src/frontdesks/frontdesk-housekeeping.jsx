import { useState, useEffect, useRef, useCallback } from "react";
import { TopbarUserIcon } from "./frontdeskTopbarIcons";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { useFrontdeskPendingNotifications } from "./useFrontdeskPendingNotifications";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import RailPortalShell from "../layouts/RailPortalShell";
import FrontdeskSidebarToggle from "./FrontdeskSidebarToggle";
import FrontdeskSidebar from "./FrontdeskSidebar";
import { useFrontdeskShell } from "./FrontdeskShellContext";
import { StaffNotificationDetailModal, useStaffNotificationDetail } from "./StaffNotificationDetailModal";
import {
  fetchRoomsCatalog,
  HOUSEKEEPING_TASKS_REFRESH_EVENT,
  patchRoomHousekeepingStatusBackend,
  dispatchHousekeepingTasksRefresh,
} from "../api/guestApi";
import { AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import "./frontdesk-housekeeping.css";

const sidebarNav = [
  {
    to: "/frontdesk-dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: "/frontdesk-rooms",
    label: "Rooms",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
        <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z" />
      </svg>
    ),
  },
  {
    to: "/frontdesk-events",
    label: "Events",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="22" height="22">
        <path d="M5.8 11.3 2 22l10.7-3.79" /><path d="M4 3h.01" /><path d="M22 8h.01" />
        <path d="M15 2h.01" /><path d="M22 20h.01" />
        <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
        <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17" />
        <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7" />
        <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z" />
      </svg>
    ),
  },
  {
    to: "/frontdesk-housekeeping",
    label: "Housekeeping",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    ),
  },
  {
    to: "/frontdesk-bills",
    label: "Bills",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
        <rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" />
      </svg>
    ),
  },
  {
    to: "/frontdesk-history",
    label: "Reservation History",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    to: "/frontdesk-settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

function sortKey(n) {
  const v = parseInt(String(n).replace(/\D/g, ""), 10);
  return Number.isNaN(v) ? 99999 : v;
}

function assetStatusToLabel(statusRaw) {
  const s = String(statusRaw || "").toLowerCase();
  if (s === "available") return "Available";
  if (s === "occupied") return "Occupied";
  if (s === "needs_cleaning") return "Need Clean";
  if (s === "cleaning_in_progress") return "In Progress";
  if (s === "ready") return "Ready";
  return statusRaw || "—";
}

/** Match housekeeping dashboard: turnover-complete rooms show like available inventory. */
function displayStatusLabel(statusRaw) {
  const l = assetStatusToLabel(statusRaw);
  if (l === "Ready") return "Available";
  return l;
}

/** Values allowed by PATCH /api/rooms/:id/housekeeping-status */
const HK_OPTIONS = [
  { value: "needs_cleaning", label: "Needs clean" },
  { value: "ready", label: "Available" },
];

function hkBackendFromRaw(raw) {
  const s = String(raw || "").toLowerCase();
  if (s === "needs_cleaning") return "needs_cleaning";
  if (s === "ready" || s === "available") return "ready";
  /** Legacy DB value: no longer a dropdown option; treat as needs clean for the selector. */
  if (s === "cleaning_in_progress") return "needs_cleaning";
  /** Occupied (and any other state): map to needs clean so the two-option control stays valid. */
  return "needs_cleaning";
}

export default function HousekeepingRooms() {
  const { isMobile, mainStyle } = useFrontdeskShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { pendingCount, displayNotifications, markStaffNotificationsSeen } = useFrontdeskPendingNotifications({
    bookingType: "all",
  });
  const { topbarProfile } = useTopbarUserProfile("frontdesk");
  const userRef = useRef(null);
  const notifRef = useRef(null);
  const [roomRows, setRoomRows] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch]       = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen]   = useState(false);
  const [statusDraft, setStatusDraft] = useState({});
  const [savingRoomKey, setSavingRoomKey] = useState(null);
  const [rowActionError, setRowActionError] = useState({});
  const { staffNotification, openStaffNotification, closeStaffNotification } = useStaffNotificationDetail();

  const loadRooms = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) {
      setLoading(true);
      setLoadError("");
    }
    try {
      const rooms = await fetchRoomsCatalog();
      const list = Array.isArray(rooms) ? rooms : [];
      const mapped = list
        .map((r) => ({
          key: String(r.id),
          number: String(r.roomNumber ?? "").trim() || "—",
          type: String(r.title || r.package || "—").trim() || "—",
          rawStatus: String(r.status || "available").toLowerCase(),
          displayStatus: displayStatusLabel(r.status),
          sort: sortKey(r.roomNumber),
        }))
        .sort((a, b) => a.sort - b.sort);
      setRoomRows(mapped);
      if (!silent) setLoadError("");
    } catch (e) {
      setRoomRows([]);
      if (!silent) setLoadError(e.message || "Could not load rooms.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms({ silent: false });
  }, [loadRooms]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void loadRooms({ silent: true });
    };
    const onHk = () => void loadRooms({ silent: true });
    const onAuth = () => void loadRooms({ silent: true });
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHk);
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHk);
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    };
  }, [loadRooms]);

  useEffect(() => {
    function handler(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const countNeedClean = roomRows.filter(
    (r) => r.rawStatus === "needs_cleaning" || r.rawStatus === "cleaning_in_progress",
  ).length;
  /** Guest-ready or vacant inventory (both shown as “Available” in the table). */
  const countAvailable = roomRows.filter(
    (r) => r.rawStatus === "ready" || r.rawStatus === "available",
  ).length;
  const countTotal = roomRows.length;

  const filtered = roomRows.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.number.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.displayStatus.toLowerCase().includes(q)
    );
  });

  function getBadgeClass(displayStatus) {
    if (displayStatus === "Available") return "hk-badge badge-available";
    if (displayStatus === "Occupied") return "hk-badge badge-occupied";
    if (displayStatus === "In Progress") return "hk-badge badge-inprogress";
    if (displayStatus === "Completed") return "hk-badge badge-completed";
    return "hk-badge badge-needclean";
  }

  async function handleHousekeepingStatusUpdate(r) {
    const selected = statusDraft[r.key] ?? hkBackendFromRaw(r.rawStatus);
    const baseline = hkBackendFromRaw(r.rawStatus);
    if (selected === baseline) return;
    setSavingRoomKey(r.key);
    setRowActionError((prev) => ({ ...prev, [r.key]: "" }));
    try {
      await patchRoomHousekeepingStatusBackend(r.key, selected);
      dispatchHousekeepingTasksRefresh();
      setStatusDraft((d) => {
        const next = { ...d };
        delete next[r.key];
        return next;
      });
      await loadRooms({ silent: true });
    } catch (e) {
      const msg = e && typeof e.message === "string" ? e.message : "Could not update status.";
      setRowActionError((prev) => ({ ...prev, [r.key]: msg }));
    } finally {
      setSavingRoomKey(null);
    }
  }

  function selectValueForRow(r) {
    return statusDraft[r.key] ?? hkBackendFromRaw(r.rawStatus);
  }

  function isDirtyRow(r) {
    return selectValueForRow(r) !== hkBackendFromRaw(r.rawStatus);
  }

  return (
    <>
      <RailPortalShell
        rootClassName="frontdesk-app"
        rootStyle={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}
        mainStyle={mainStyle}
        sidebar={<FrontdeskSidebar navItems={sidebarNav.map(({ to, label, icon }) => ({ href: to, label, icon }))} />}
      >
        {/* ── TOP BAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <FrontdeskSidebarToggle />
            <span className="breadcrumb-title">Housekeeping</span>
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

        {/* ── PAGE CONTENT ── */}
        <main className="content">

          {/* PAGE HEADING */}
          <div className="page-heading">
            <h1 className="page-title">Housekeeping Management</h1>
            <p className="page-sub">View and update room housekeeping status (Needs clean, Available)</p>
          </div>

          {/* STAT CARDS — fd-hk-stat-grid: scoped to avoid .stat-cards repeat(3) from bills CSS in bundle */}
          <div className="fd-hk-stat-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/>
                  </svg>
                </div>
                <span className="stat-label">Needs Cleaning</span>
              </div>
              <p className="stat-value">{countNeedClean}</p>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <span className="stat-label">Available</span>
              </div>
              <p className="stat-value">{countAvailable}</p>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z"/>
                  </svg>
                </div>
                <span className="stat-label">Total Rooms</span>
              </div>
              <p className="stat-value">{countTotal}</p>
            </div>
          </div>

          {/* SEARCH + PRINT */}
          <div className="hk-toolbar">
            <div className="search-wrap">
              <span className="search-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                type="text"
                className="search-input"
                placeholder="Search room number, type, or status..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="btn-print" onClick={() => window.print()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Print Room Cleaning List
            </button>
          </div>

          {loadError ? <p className="hk-inline-error">{loadError}</p> : null}
          <p className="hk-inline-hint">
            Choose a status from the list (caret), then click Update to save. Housekeeping staff also update tasks from the housekeeping app.
          </p>

          {isMobile ? (
            <div className="fd-hk-mobile" aria-label="Room list">
              {loading ? (
                <p className="fd-hk-mobile__empty">Loading rooms…</p>
              ) : filtered.length === 0 ? (
                <p className="fd-hk-mobile__empty">No rooms match your search.</p>
              ) : (
                <ul className="fd-hk-mobile__list">
                  {filtered.map((r) => (
                    <li key={r.key}>
                      <article className="fd-hk-card">
                        <div className="fd-hk-card__top">
                          <span className="fd-hk-card__room">{r.number}</span>
                          <span className={getBadgeClass(r.displayStatus)}>{r.displayStatus}</span>
                        </div>
                        <dl className="fd-hk-card__dl">
                          <div className="fd-hk-card__row">
                            <dt>Type</dt>
                            <dd>{r.type}</dd>
                          </div>
                          <div className="fd-hk-card__row fd-hk-card__row--full">
                            <dt>Housekeeping</dt>
                            <dd className="fd-hk-card__hk-actions">
                              <select
                                className="hk-status-select"
                                aria-label={`Housekeeping status for room ${r.number}`}
                                value={selectValueForRow(r)}
                                disabled={savingRoomKey === r.key}
                                onChange={(e) =>
                                  setStatusDraft((d) => ({ ...d, [r.key]: e.target.value }))
                                }
                              >
                                {HK_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                className="hk-update-btn"
                                disabled={
                                  savingRoomKey === r.key || !isDirtyRow(r)
                                }
                                onClick={() => void handleHousekeepingStatusUpdate(r)}
                              >
                                {savingRoomKey === r.key ? "Saving…" : "Update"}
                              </button>
                              {rowActionError[r.key] ? (
                                <span className="hk-row-error" role="alert">
                                  {rowActionError[r.key]}
                                </span>
                              ) : null}
                            </dd>
                          </div>
                        </dl>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="hk-table-wrap">
              <table className="hk-table">
                <colgroup>
                  <col className="hk-col-num" />
                  <col className="hk-col-type" />
                  <col className="hk-col-status" />
                  <col className="hk-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Room Number</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className="hk-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "1.5rem" }}>
                        Loading rooms…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "1.5rem" }}>
                        No rooms match your search.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.key}>
                        <td>{r.number}</td>
                        <td>{r.type}</td>
                        <td>
                          <div className="hk-status-cell">
                            <select
                              className="hk-status-select"
                              aria-label={`Housekeeping status for room ${r.number}`}
                              value={selectValueForRow(r)}
                              disabled={savingRoomKey === r.key}
                              onChange={(e) =>
                                setStatusDraft((d) => ({ ...d, [r.key]: e.target.value }))
                              }
                            >
                              {HK_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            {rowActionError[r.key] ? (
                              <span className="hk-row-error hk-row-error--table" role="alert">
                                {rowActionError[r.key]}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="hk-td-actions">
                          <button
                            type="button"
                            className="hk-update-btn"
                            disabled={
                              savingRoomKey === r.key || !isDirtyRow(r)
                            }
                            onClick={() => void handleHousekeepingStatusUpdate(r)}
                          >
                            {savingRoomKey === r.key ? "Saving…" : "Update"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </main>
      </RailPortalShell>

      <StaffNotificationDetailModal notification={staffNotification} onClose={closeStaffNotification} />

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}