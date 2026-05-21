import { useState, useEffect, useCallback, useMemo } from "react";
import StaffTopbarActions from "../topbar/StaffTopbarActions";
import { useFrontdeskPendingNotifications } from "./useFrontdeskPendingNotifications";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import RailPortalShell from "../layouts/RailPortalShell";
import FrontdeskSidebarToggle from "./FrontdeskSidebarToggle";
import FrontdeskSidebar from "./FrontdeskSidebar";
import { useFrontdeskShell } from "./FrontdeskShellContext";
import { useNotificationRedirect } from "../navigation/useNotificationRedirect";
import {
  fetchRoomsCatalog,
  fetchEventVenuesBackend,
  HOUSEKEEPING_TASKS_REFRESH_EVENT,
  patchRoomHousekeepingStatusBackend,
  dispatchHousekeepingTasksRefresh,
  dispatchHousekeepingInboxRefresh,
} from "../api/guestApi";
import {
  FRONTDESK_HK_STATUS_OPTIONS,
  frontDeskHousekeepingStatusEditable,
  frontDeskSelectValueFromRaw,
  frontDeskStatusLabel,
} from "../housekeeping/housekeepingStatusDisplay";
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

export default function HousekeepingRooms() {
  const { isMobile, mainStyle } = useFrontdeskShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { pendingCount, displayNotifications, markStaffNotificationsSeen } = useFrontdeskPendingNotifications({
    bookingType: "all",
  });
  const [viewMode, setViewMode] = useState("rooms");
  const [roomRows, setRoomRows] = useState([]);
  const [venueRows, setVenueRows] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  /** Client-side table pagination only; same `fetchRoomsCatalog` load as before (no API/DB change). */
  const [hkListPage, setHkListPage] = useState(1);
  const [hkListPageSize, setHkListPageSize] = useState(10);
  const [statusDraft, setStatusDraft] = useState({});
  const [savingRoomKey, setSavingRoomKey] = useState(null);
  const [rowActionError, setRowActionError] = useState({});
  const onNotificationItemClick = useNotificationRedirect("frontdesk");

  const loadRooms = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) {
      setLoading(true);
      setLoadError("");
    }
    try {
      const [rooms, venues] = await Promise.all([
        fetchRoomsCatalog(),
        fetchEventVenuesBackend().catch(() => []),
      ]);
      const list = Array.isArray(rooms) ? rooms : [];
      const mapped = list
        .map((r) => ({
          key: String(r.id),
          number: String(r.roomNumber ?? "").trim() || "—",
          type: String(r.package || r.title || "—").trim() || "—",
          rawStatus: String(r.status || "available").toLowerCase(),
          displayStatus: frontDeskStatusLabel(r.status),
          sort: sortKey(r.roomNumber),
        }))
        .sort((a, b) => a.sort - b.sort);
      setRoomRows(mapped);
      const vlist = Array.isArray(venues) ? venues : [];
      setVenueRows(
        vlist
          .map((v) => ({
            key: String(v.id),
            number: String(v.eventNum ?? "").trim() || "—",
            type: String(v.package || v.name || "—").trim() || "—",
            rawStatus: String(v.status || "available").toLowerCase(),
            displayStatus: frontDeskStatusLabel(v.status),
            sort: sortKey(v.eventNum),
          }))
          .sort((a, b) => a.sort - b.sort),
      );
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
    const poll = window.setInterval(() => void loadRooms({ silent: true }), 5000);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHk);
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHk);
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    };
  }, [loadRooms]);

  const countNeedClean = roomRows.filter(
    (r) => r.rawStatus === "needs_cleaning" || r.rawStatus === "cleaning_in_progress",
  ).length;
  /** Guest-ready or vacant inventory (both shown as “Available” in the table). */
  const countAvailable = roomRows.filter(
    (r) => r.rawStatus === "ready" || r.rawStatus === "available",
  ).length;
  const countInProgress = roomRows.filter((r) => r.rawStatus === "cleaning_in_progress").length;
  const countTotal = roomRows.length;

  const activeRows = viewMode === "venues" ? venueRows : roomRows;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return activeRows.filter(
      (r) =>
        r.number.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.displayStatus.toLowerCase().includes(q),
    );
  }, [activeRows, search]);

  const hkPageSizeSafe = Math.min(100, Math.max(5, Number(hkListPageSize) || 10));
  const hkTotalPages = Math.max(1, Math.ceil(filtered.length / hkPageSizeSafe));
  const hkPageSafe = Math.min(Math.max(1, hkListPage), hkTotalPages);

  const pagedRows = useMemo(() => {
    const start = (hkPageSafe - 1) * hkPageSizeSafe;
    return filtered.slice(start, start + hkPageSizeSafe);
  }, [filtered, hkPageSafe, hkPageSizeSafe]);

  useEffect(() => {
    setHkListPage(1);
  }, [search]);

  useEffect(() => {
    setHkListPage((p) => Math.min(Math.max(1, p), hkTotalPages));
  }, [hkTotalPages]);

  async function handleHousekeepingStatusUpdate(r) {
    if (viewMode === "venues") return;
    const selected = statusDraft[r.key] ?? frontDeskSelectValueFromRaw(r.rawStatus);
    const baseline = frontDeskSelectValueFromRaw(r.rawStatus);
    if (selected === baseline) return;
    setSavingRoomKey(r.key);
    setRowActionError((prev) => ({ ...prev, [r.key]: "" }));
    try {
      await patchRoomHousekeepingStatusBackend(r.key, selected);
      dispatchHousekeepingTasksRefresh();
      dispatchHousekeepingInboxRefresh();
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
    return statusDraft[r.key] ?? frontDeskSelectValueFromRaw(r.rawStatus);
  }

  function isDirtyRow(r) {
    return selectValueForRow(r) !== frontDeskSelectValueFromRaw(r.rawStatus);
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
          <StaffTopbarActions
            roleKey="frontdesk"
            notifications={displayNotifications}
            dot={pendingCount > 0 ? "active" : null}
            dotTitle="Pending or unread alerts"
            onNotificationsPanelOpen={() => void markStaffNotificationsSeen()}
            onNotificationItemClick={onNotificationItemClick}
            onRequestLogout={requestLogout}
          />
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="content">

          {/* PAGE HEADING */}
          <div className="page-heading">
            <h1 className="page-title">Housekeeping Management</h1>
            <p className="page-sub">
              View cleaning status for rooms and event venues. Override room status when needed — changes sync with
              Housekeeping in real time.
            </p>
          </div>

          <div className="fd-hk-view-tabs" role="tablist" aria-label="Housekeeping areas">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "rooms"}
              className={`fd-hk-view-tab${viewMode === "rooms" ? " fd-hk-view-tab--active" : ""}`}
              onClick={() => {
                setViewMode("rooms");
                setHkListPage(1);
              }}
            >
              Rooms
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "venues"}
              className={`fd-hk-view-tab${viewMode === "venues" ? " fd-hk-view-tab--active" : ""}`}
              onClick={() => {
                setViewMode("venues");
                setHkListPage(1);
              }}
            >
              Event venues
            </button>
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

          {/* SEARCH */}
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
          </div>

          {loadError ? <p className="hk-inline-error">{loadError}</p> : null}
          <p className="hk-inline-hint">
            {viewMode === "rooms" ? (
              <>
                Set status to <strong>Needs Cleaning</strong> or <strong>Available</strong>, then click Update.
                <strong>Needs Cleaning</strong> notifies housekeeping. You cannot set <strong>Available</strong> while
                the room is still occupied — check out the guest first.
              </>
            ) : (
              <>
                Event venue status is updated by the Housekeeping team in Event Cleaning. This view refreshes
                automatically when housekeeping completes a task.
              </>
            )}
          </p>

          {isMobile ? (
            <div className="fd-hk-mobile" aria-label="Room list">
              {loading ? (
                <p className="fd-hk-mobile__empty">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="fd-hk-mobile__empty">
                  No {viewMode === "venues" ? "venues" : "rooms"} match your search.
                </p>
              ) : (
                <ul className="fd-hk-mobile__list">
                  {pagedRows.map((r) => (
                    <li key={r.key}>
                      <article className="fd-hk-card">
                        <div className="fd-hk-card__top">
                          <span className="fd-hk-card__room">{r.number}</span>
                        </div>
                        <dl className="fd-hk-card__dl">
                          <div className="fd-hk-card__row">
                            <dt>Type</dt>
                            <dd>{r.type}</dd>
                          </div>
                          <div className="fd-hk-card__row fd-hk-card__row--full">
                            <dt>Housekeeping</dt>
                            <dd className="fd-hk-card__hk-actions">
                              {viewMode === "rooms" && !frontDeskHousekeepingStatusEditable(r.rawStatus) ? (
                                <span className="fd-hk-readonly-status">{r.displayStatus}</span>
                              ) : (
                              <select
                                className="hk-status-select"
                                aria-label={`Housekeeping status for ${viewMode === "venues" ? "venue" : "room"} ${r.number}`}
                                value={selectValueForRow(r)}
                                disabled={
                                  viewMode !== "rooms" ||
                                  savingRoomKey === r.key ||
                                  !frontDeskHousekeepingStatusEditable(r.rawStatus)
                                }
                                onChange={(e) =>
                                  setStatusDraft((d) => ({ ...d, [r.key]: e.target.value }))
                                }
                              >
                                {FRONTDESK_HK_STATUS_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </select>
                              )}
                              {viewMode === "rooms" && frontDeskHousekeepingStatusEditable(r.rawStatus) ? (
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
                              ) : null}
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
                    <th>{viewMode === "venues" ? "Venue" : "Room"} #</th>
                    <th>Type</th>
                    <th>Cleaning status</th>
                    <th className="hk-th-actions">{viewMode === "rooms" ? "Override" : ""}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "1.5rem" }}>
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: "center", padding: "1.5rem" }}>
                        No {viewMode === "venues" ? "venues" : "rooms"} match your search.
                      </td>
                    </tr>
                  ) : (
                    pagedRows.map((r) => (
                      <tr key={r.key}>
                        <td>{r.number}</td>
                        <td>{r.type}</td>
                        <td>
                          <div className="hk-status-cell">
                            {viewMode === "rooms" && !frontDeskHousekeepingStatusEditable(r.rawStatus) ? (
                              <span className="fd-hk-readonly-status">{r.displayStatus}</span>
                            ) : (
                            <select
                              className="hk-status-select"
                              aria-label={`Housekeeping status for ${viewMode === "venues" ? "venue" : "room"} ${r.number}`}
                              value={selectValueForRow(r)}
                              disabled={
                                viewMode !== "rooms" ||
                                savingRoomKey === r.key ||
                                !frontDeskHousekeepingStatusEditable(r.rawStatus)
                              }
                              onChange={(e) =>
                                setStatusDraft((d) => ({ ...d, [r.key]: e.target.value }))
                              }
                            >
                              {FRONTDESK_HK_STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                            )}
                            {rowActionError[r.key] ? (
                              <span className="hk-row-error hk-row-error--table" role="alert">
                                {rowActionError[r.key]}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="hk-td-actions">
                          {viewMode === "rooms" && frontDeskHousekeepingStatusEditable(r.rawStatus) ? (
                            <button
                              type="button"
                              className="hk-update-btn"
                              disabled={savingRoomKey === r.key || !isDirtyRow(r)}
                              onClick={() => void handleHousekeepingStatusUpdate(r)}
                            >
                              {savingRoomKey === r.key ? "Saving…" : "Update"}
                            </button>
                          ) : viewMode === "venues" ? (
                            <span className="fd-hk-venues-readonly">—</span>
                          ) : (
                            <span className="fd-hk-venues-readonly">—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length > 0 ? (
            <div className="fd-hk-pagination" role="navigation" aria-label="Housekeeping room list pages">
              <div className="fd-hk-pagination-meta">
                <span>
                  Showing{" "}
                  <strong>
                    {filtered.length === 0 ? 0 : (hkPageSafe - 1) * hkPageSizeSafe + 1}
                  </strong>
                  –
                  <strong>{Math.min(hkPageSafe * hkPageSizeSafe, filtered.length)}</strong> of{" "}
                  <strong>{filtered.length}</strong>
                </span>
                <label className="fd-hk-pagination-per">
                  <span>Rows per page</span>
                  <select
                    className="fd-hk-pagination-select"
                    value={hkPageSizeSafe}
                    onChange={(e) => {
                      setHkListPageSize(Number(e.target.value));
                      setHkListPage(1);
                    }}
                  >
                    {[5, 10, 15, 25, 50].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="fd-hk-pagination-btns">
                <button
                  type="button"
                  className="fd-hk-page-btn"
                  disabled={hkPageSafe <= 1}
                  onClick={() =>
                    setHkListPage((p) => {
                      const cur = Math.min(Math.max(1, p), hkTotalPages);
                      return Math.max(1, cur - 1);
                    })
                  }
                >
                  Previous
                </button>
                <span className="fd-hk-page-indicator">
                  Page {hkPageSafe} of {hkTotalPages}
                </span>
                <button
                  type="button"
                  className="fd-hk-page-btn"
                  disabled={hkPageSafe >= hkTotalPages}
                  onClick={() =>
                    setHkListPage((p) => {
                      const cur = Math.min(Math.max(1, p), hkTotalPages);
                      return Math.min(hkTotalPages, cur + 1);
                    })
                  }
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}

        </main>
      </RailPortalShell>


      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}