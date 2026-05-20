import { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from "react";
import StaffTopbarActions from "../topbar/StaffTopbarActions";
import { useNotificationRedirect } from "../navigation/useNotificationRedirect";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import {
  fetchRoomsCatalog,
  fetchEventVenuesBackend,
  fetchHousekeepingTasksBackend,
  fetchHousekeepingTeamBackend,
  postHousekeepingReconcileMissingBackend,
  putHousekeepingTaskStatusBackend,
  HOUSEKEEPING_TASKS_REFRESH_EVENT,
  HOUSEKEEPING_TASKS_STORAGE_PING_KEY,
} from "../api/guestApi";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { useAuthRole } from "../context/AuthRoleContext";
import { useHousekeepingCleaningNotifications } from "./useHousekeepingCleaningNotifications";
import HousekeepingSidebar from "./HousekeepingSidebar";
import HousekeepingSidebarToggle from "./HousekeepingSidebarToggle";
import { useHousekeepingSidebarLayout } from "./useHousekeepingSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import {
  assetStatusForInventoryDisplay,
  getAssetStatusBadgeClass,
} from "./housekeepingStatusDisplay";
import {
  pickBestTask,
  resolveAssetHousekeepingLabel,
  tasksForRoom,
  tasksForVenue,
  teamNamesFromMembers,
} from "./housekeepingAssignDisplay";
import "./rooms.css";
import "./housekeeping-admin-shell.css";

const DAMAGE_STORAGE_KEY = "abela_hk_room_damage_reports";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/housekeeping",
    active: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    label: "Rooms",
    href: "/housekeeping-rooms",
    icon: (
      <svg viewBox="0 0 24 24" fill="white" width="30" height="30">
        <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z" />
      </svg>
    ),
  },
  {
    label: "Event Venues",
    href: "/housekeeping-events",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="30" height="30">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/housekeeping-settings",
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

function readDamageReportCount() {
  try {
    const raw = sessionStorage.getItem(DAMAGE_STORAGE_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return o && typeof o === "object" ? Object.keys(o).length : 0;
  } catch {
    return 0;
  }
}

function displayStatusLabel(statusRaw) {
  return assetStatusForInventoryDisplay(statusRaw);
}

function getBadgeClass(displayStatus) {
  return `rm-badge ${getAssetStatusBadgeClass(displayStatus)}`;
}

function buildInventoryRows(rooms, venues, tasks, teamNames = []) {
  const roomRows = (rooms || []).map((r) => {
    const task = pickBestTask(tasksForRoom(tasks, r.id, r.roomNumber));
    return {
      key: `room-${r.id}`,
      number: r.roomNumber,
      housekeeping: resolveAssetHousekeepingLabel(task, teamNames, r.status),
      package: String(r.package || r.title || "—").trim() || "—",
      type: "Room",
      displayStatus: displayStatusLabel(r.status),
      sort: sortKey(r.roomNumber),
    };
  });
  const venueRows = (venues || []).map((v) => {
    const task = pickBestTask(tasksForVenue(tasks, v.id, v.eventNum));
    return {
      key: `venue-${v.id}`,
      number: v.eventNum ?? "—",
      housekeeping: resolveAssetHousekeepingLabel(task, teamNames, v.status),
      package: String(v.name || v.package || "—").trim() || "—",
      type: "Event",
      displayStatus: displayStatusLabel(v.status),
      sort: sortKey(v.eventNum),
    };
  });
  return [...roomRows, ...venueRows].sort((a, b) => a.sort - b.sort);
}

export default function Dashboard() {
  const [rooms, setRooms] = useState([]);
  const [venues, setVenues] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [hkTeam, setHkTeam] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [damageCount, setDamageCount] = useState(() => readDamageReportCount());
  const [search, setSearch] = useState("");
  const [activeNav, setActiveNav] = useState("");
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { role } = useAuthRole();

  const { needsCleaningCount, displayNotifications, markHousekeepingInboxSeen } =
    useHousekeepingCleaningNotifications();
  const onNotificationItemClick = useNotificationRedirect("housekeeping");
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
  } = useHousekeepingSidebarLayout();
  const tableScrollRef = useRef(null);

  const syncDamageCount = useCallback(() => {
    setDamageCount(readDamageReportCount());
  }, []);

  const loadAll = useCallback(
    async (opts = {}) => {
      const silent = opts.silent !== false;
      const reconcile = opts.reconcile === true;
      if (!silent) {
        setLoading(true);
        setLoadError("");
      }
      try {
        const roomsList = await fetchRoomsCatalog();
        setRooms(Array.isArray(roomsList) ? roomsList : []);

        if (!getStoredAuthToken()) {
          setVenues([]);
          setTasks([]);
          if (!silent && role === "housekeeping") {
            setLoadError(
              "Not signed in to the API — log out and sign in with housekeeping@abela.demo / 12345678 to load event venues and task counts. The room list still loads from the public catalog."
            );
          } else {
            setLoadError("");
          }
          return;
        }

        if (reconcile) {
          await postHousekeepingReconcileMissingBackend().catch(() => {});
        }

        const [venList, taskList, teamList] = await Promise.all([
          fetchEventVenuesBackend().catch(() => []),
          fetchHousekeepingTasksBackend(true).catch(() => []),
          fetchHousekeepingTeamBackend().catch(() => []),
        ]);
        setVenues(Array.isArray(venList) ? venList : []);
        setHkTeam(Array.isArray(teamList) ? teamList : []);

        let tasksOut = Array.isArray(taskList) ? taskList : [];
        if (role === "housekeeping") {
          const needsAssignee = tasksOut.filter(
            (t) =>
              String(t?.status || "").toLowerCase() === "in_progress" &&
              !String(t?.assignedTo?.name || "").trim(),
          );
          if (needsAssignee.length) {
            await Promise.all(
              needsAssignee.map((t) =>
                putHousekeepingTaskStatusBackend(t.id, "in_progress").catch(() => null),
              ),
            );
            const refreshed = await fetchHousekeepingTasksBackend(true).catch(() => null);
            if (Array.isArray(refreshed)) tasksOut = refreshed;
          }
        }
        setTasks(tasksOut);
        setLoadError("");
      } catch (e) {
        if (!silent) {
          setLoadError(e.message || "Could not load dashboard.");
          setRooms([]);
          setVenues([]);
          setTasks([]);
        }
      } finally {
        if (!silent) setLoading(false);
        syncDamageCount();
      }
    },
    [role, syncDamageCount]
  );

  useEffect(() => {
    loadAll({ silent: false, reconcile: false });
  }, [loadAll]);

  useEffect(() => {
    const onToken = () => loadAll({ reconcile: false });
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
  }, [loadAll]);

  useEffect(() => {
    let lastFocusLoad = 0;
    const id = window.setInterval(() => loadAll(), 6000);
    const onVis = () => {
      if (document.visibilityState === "visible") loadAll();
    };
    const onFocus = () => {
      if (!getStoredAuthToken()) return;
      const now = Date.now();
      if (now - lastFocusLoad < 500) return;
      lastFocusLoad = now;
      loadAll();
    };
    const onHK = () => loadAll({ silent: true, reconcile: false });
    const onStorage = (e) => {
      if (e.key === HOUSEKEEPING_TASKS_STORAGE_PING_KEY) loadAll({ silent: true, reconcile: false });
      if (e.key === DAMAGE_STORAGE_KEY || e.key === null) syncDamageCount();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHK);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHK);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadAll, syncDamageCount]);

  useEffect(() => {
    syncDamageCount();
  }, [rooms, venues, tasks, syncDamageCount]);

  const hkTeamNames = useMemo(() => teamNamesFromMembers(hkTeam), [hkTeam]);
  const inventoryRows = useMemo(
    () => buildInventoryRows(rooms, venues, tasks, hkTeamNames),
    [rooms, venues, tasks, hkTeamNames],
  );

  const stats = useMemo(() => {
    const needClean = inventoryRows.filter((r) => r.displayStatus === "Needs Cleaning").length;
    const inProgress = inventoryRows.filter((r) => r.displayStatus === "Cleaning in Progress").length;
    const completed = tasks.filter((t) => t.status === "completed").length;
    return {
      needClean,
      inProgress,
      completed,
      maintenance: damageCount,
    };
  }, [inventoryRows, tasks, damageCount]);

  const q = search.toLowerCase().trim();
  const filtered = inventoryRows.filter((r) => {
    if (!q) return true;
    const hay = [String(r.number), r.housekeeping, r.package, r.type, r.displayStatus].join(" ").toLowerCase();
    return hay.includes(q);
  });

  /* After load/search, reset horizontal scroll on the desktop table (not used on mobile cards). */
  useLayoutEffect(() => {
    if (isMobile) return;
    const el = tableScrollRef.current;
    if (el) el.scrollLeft = 0;
  }, [isMobile, loading, search, inventoryRows.length, filtered.length]);

  return (
    <>
      <RailPortalShell
        rootClassName="housekeeping-portal-layout"
        shellClassName={shellClassName}
        mainStyle={mainStyle}
        sidebar={
          <HousekeepingSidebar
            navItems={NAV_ITEMS.map((item) => ({
              ...item,
              active: activeNav === item.label || item.active,
            }))}
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
            {[
              <HousekeepingSidebarToggle
                key="toggle"
                sidebarCollapsed={sidebarCollapsed}
                toggleSidebar={toggleSidebar}
                isMobile={isMobile}
                mobileSidebarOpen={mobileSidebarOpen}
              />,
              <span key="title" className="breadcrumb-title">
                Dashboard
              </span>,
            ]}
          </div>

          <StaffTopbarActions
            roleKey="housekeeping"
            notifications={displayNotifications}
            bellTitle="Rooms & venues waiting to be cleaned"
            dot={needsCleaningCount > 0 ? "active" : null}
            dotTitle="Cleaning tasks or alerts"
            onNotificationsPanelOpen={() => void markHousekeepingInboxSeen()}
            onNotificationItemClick={onNotificationItemClick}
            onRequestLogout={requestLogout}
          />
        </header>

        <main className="content">
          <div className="rm-wrap">
            <div className="rm-heading">
              <h2 className="rm-title">Housekeeping Management</h2>
              <p className="rm-sub">Manage room/venue cleaning and maintenance</p>
            </div>

            <div className="rm-stats">
              <div className="stat-card">
                <div className="stat-icon-label stat-warning">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Needs Cleaning
                </div>
                <span className="stat-value">{stats.needClean}</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon-label stat-info">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  In Progress
                </div>
                <span className="stat-value">{stats.inProgress}</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon-label stat-success">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Completed
                </div>
                <span className="stat-value">{stats.completed}</span>
              </div>

              <div className="stat-card">
                <div className="stat-icon-label stat-danger">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  Needs Maintenance
                </div>
                <span className="stat-value">{stats.maintenance}</span>
              </div>
            </div>

            <div className="rm-search-wrap">
              <svg className="rm-search-icon" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                id="rmSearch"
                className="rm-search-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search rooms, package, type, status..."
              />
            </div>

            {loadError ? (
              <p style={{ color: "#c0392b", fontSize: "14px", margin: "0 0 12px" }}>{loadError}</p>
            ) : null}

            {isMobile ? (
              <div className="hk-dash-mobile" aria-label="Room and venue list">
                {loading ? (
                  <p className="hk-dash-mobile__loading">Loading…</p>
                ) : filtered.length === 0 ? (
                  <p className="hk-dash-mobile__empty">
                    {search.trim()
                      ? "No matches — try a different search."
                      : "No rooms or venues in the catalog. Seed MongoDB or check the API."}
                  </p>
                ) : (
                  <ul className="hk-dash-mobile__list">
                    {filtered.map((r) => (
                      <li key={r.key}>
                        <article className="hk-dash-card">
                          <div className="hk-dash-card__top">
                            <span className="hk-dash-card__number">{r.number}</span>
                            <span className={getBadgeClass(r.displayStatus)}>{r.displayStatus}</span>
                          </div>
                          <dl className="hk-dash-card__fields">
                            <div className="hk-dash-card__row">
                              <dt>Housekeeping</dt>
                              <dd>{r.housekeeping}</dd>
                            </div>
                            <div className="hk-dash-card__row">
                              <dt>Package</dt>
                              <dd>{r.package}</dd>
                            </div>
                            <div className="hk-dash-card__row">
                              <dt>Type</dt>
                              <dd>{r.type}</dd>
                            </div>
                          </dl>
                        </article>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="rm-table-wrap hk-dash-table-outer" ref={tableScrollRef}>
                <table className="rm-table hk-dash-table">
                  <thead>
                    <tr>
                      <th>Number</th>
                      <th>Housekeeping</th>
                      <th>Package</th>
                      <th>Type</th>
                      <th className="hk-dash-status-th">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="rm-empty">
                          Loading…
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="rm-empty">
                          {search.trim()
                            ? "No matches — try a different search."
                            : "No rooms or venues in the catalog. Seed MongoDB or check the API."}
                        </td>
                      </tr>
                    ) : (
                      filtered.map((r) => (
                        <tr key={r.key}>
                          <td>{r.number}</td>
                          <td>{r.housekeeping}</td>
                          <td>{r.package}</td>
                          <td>{r.type}</td>
                          <td className="hk-dash-status-td">
                            <span className={getBadgeClass(r.displayStatus)}>{r.displayStatus}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </RailPortalShell>

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
