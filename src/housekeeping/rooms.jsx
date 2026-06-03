import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import StaffTopbarActions from "../topbar/StaffTopbarActions";
import { StaffSuccessModal } from "../components/StaffSuccessModal";
import { StaffNoticeToast } from "../components/StaffNoticeToast";
import "../components/StaffSuccessModal.css";
import "../components/StaffNoticeToast.css";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useHousekeepingCleaningNotifications } from "./useHousekeepingCleaningNotifications";
import {
  fetchHousekeepingTasksBackend,
  postHousekeepingReconcileMissingBackend,
  putHousekeepingTaskStatusBackend,
  HOUSEKEEPING_TASKS_REFRESH_EVENT,
  HOUSEKEEPING_TASKS_STORAGE_PING_KEY,
  dispatchHousekeepingTasksRefresh,
  dispatchHousekeepingInboxRefresh,
} from "../api/guestApi";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { useAuthRole } from "../context/AuthRoleContext";
import HousekeepingSidebar from "./HousekeepingSidebar";
import HousekeepingSidebarToggle from "./HousekeepingSidebarToggle";
import { useHousekeepingSidebarLayout } from "./useHousekeepingSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import {
  assetStatusToDisplayLabel,
  assetStatusForInventoryDisplay,
  getAssetStatusBadgeClass,
  taskTabToLabel,
} from "./housekeepingStatusDisplay";
import "./housekeepingrooms.css";
import "./housekeeping-admin-shell.css";

// ── Icons ──────────────────────────────────────────────────────────────
const DashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
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
function formatDateLabel(s) {
  if (s == null || s === "") return "—";
  const str = String(s);
  const d = str.includes("T") ? new Date(str) : new Date(`${str}T12:00:00`);
  return Number.isNaN(d.getTime()) ? str : d.toLocaleDateString("en-PH");
}

function roomRowFromTask(t) {
  const asset = t.room;
  const b = t.booking;
  if (!asset || !String(asset.id || "").trim()) return null;
  const numFromBooking = String(b?.roomNumber ?? "").trim();
  const num =
    (asset?.roomNumber != null && String(asset.roomNumber).trim() !== ""
      ? String(asset.roomNumber).trim()
      : "") ||
    numFromBooking ||
    "—";
  /** Package label comes only from the Rooms catalog (API `room`), not booking free-text titles. */
  const pkg = String(asset?.package || asset?.title || "").trim() || "—";
  const guest = b?.customerName?.trim() || "—";
  const email = b?.email?.trim() || "";
  const phone = b?.contactNumber?.trim() || "";
  const checkIn = formatDateLabel(b?.checkIn);
  const checkOut = formatDateLabel(b?.checkOut);
  const assetLabel = assetStatusToDisplayLabel(asset.status);
  const displayStatus =
    t.status === "completed"
      ? assetStatusForInventoryDisplay(asset.status || "available")
      : assetLabel;
  return {
    taskId: t.id,
    number: num,
    package: pkg,
    guest,
    guestDetail: [email, phone].filter(Boolean).join(" · ") || "—",
    stayLabel: checkIn !== "—" || checkOut !== "—" ? `${checkIn} → ${checkOut}` : "—",
    statusLabel: assetLabel,
    displayStatus,
    taskStatus: t.status,
  };
}

export default function RoomCleaning() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [currentTab, setCurrentTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [successModal, setSuccessModal] = useState(null);

  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { role } = useAuthRole();
  const { needsCleaningCount, displayNotifications, markHousekeepingInboxSeen } =
    useHousekeepingCleaningNotifications();
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
  const toastDismissRef = useRef(null);

  const loadTasks = useCallback(async (opts = {}) => {
    const silent = opts.silent !== false;
    const reconcile = opts.reconcile === true;
    if (!getStoredAuthToken()) {
      setTasks([]);
      setLoading(false);
      setLoadError(
        role === "housekeeping"
          ? "Not signed in to the API — log out and sign in with housekeeping@abela.demo / 12345678 so room tasks load."
          : "Not signed in to the API."
      );
      return;
    }
    if (!silent) {
      setLoadError("");
      setLoading(true);
    }
    try {
      if (reconcile) {
        await postHousekeepingReconcileMissingBackend().catch(() => {});
      }
      const list = await fetchHousekeepingTasksBackend(true);
      const arr = Array.isArray(list) ? list : [];
      setTasks(arr.filter((t) => t.targetType === "room"));
      setLoadError("");
    } catch (e) {
      if (!silent) {
        setLoadError(e.message || "Could not load room tasks.");
        setTasks([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    loadTasks({ silent: false, reconcile: false });
  }, [loadTasks]);

  useEffect(() => {
    const onToken = () => loadTasks({ reconcile: false });
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
  }, [loadTasks]);

  useEffect(() => {
    const onHK = () => loadTasks({ silent: true });
    const onStorage = (e) => {
      if (e.key === HOUSEKEEPING_TASKS_STORAGE_PING_KEY) loadTasks({ silent: true });
    };
    window.addEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHK);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHK);
      window.removeEventListener("storage", onStorage);
    };
  }, [loadTasks]);

  const rows = useMemo(() => tasks.map(roomRowFromTask).filter(Boolean), [tasks]);

  const tabMatch = (r, tab) => {
    if (tab === "pending") return r.taskStatus === "pending";
    if (tab === "inprogress") return r.taskStatus === "in_progress";
    return r.taskStatus === "completed";
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return rows.filter((r) => {
      if (!tabMatch(r, currentTab)) return false;
      if (!q) return true;
      const hay = [
        String(r.number),
        r.package,
        r.guest,
        r.guestDetail,
        r.stayLabel,
        r.displayStatus,
        r.statusLabel,
        "room",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, currentTab, search]);

  const emptyHint = useMemo(() => {
    if (loadError) {
      return { title: "", sub: "" };
    }
    if (loading) {
      return { title: "", sub: "" };
    }
    if (filtered.length === 0) {
      if (search.trim()) {
        return { title: "No matches", sub: "Try a different search or clear the search box." };
      }
      if (rows.length === 0) {
        return {
          title: "No cleaning tasks found",
          sub: "There are no housekeeping tasks in the database for rooms, or none match your account. Tasks are created from the housekeepingtask collection when linked to a valid room.",
        };
      }
      if (currentTab === "pending") {
        return {
          title: "No pending cleaning tasks found.",
          sub: "Tasks may be in progress, completed, or there are no open room cleaning tasks.",
        };
      }
      if (currentTab === "inprogress") {
        return {
          title: "No tasks in progress",
          sub: "Start a pending task, or check Completed if cleaning was already finished.",
        };
      }
      return {
        title: "No completed tasks in this view",
        sub: "Completed tasks roll off the active queue; adjust filters or search if needed.",
      };
    }
    return { title: "", sub: "" };
  }, [loadError, loading, filtered.length, rows.length, search, currentTab]);

  function showToast(title, sub) {
    if (toastDismissRef.current) {
      clearTimeout(toastDismissRef.current);
      toastDismissRef.current = null;
    }
    setToast({ title, sub });
    toastDismissRef.current = window.setTimeout(() => {
      setToast(null);
      toastDismissRef.current = null;
    }, 3500);
  }

  function showSuccessModal(title, message) {
    setSuccessModal({ title, message });
  }

  useEffect(() => {
    return () => {
      if (toastDismissRef.current) clearTimeout(toastDismissRef.current);
    };
  }, []);

  async function handleStart(taskId) {
    setBusyId(taskId);
    try {
      await putHousekeepingTaskStatusBackend(taskId, "in_progress");
      await loadTasks();
      dispatchHousekeepingTasksRefresh();
      showToast("Started", "Cleaning marked in progress for this room.");
    } catch (e) {
      showToast("Update failed", e?.message || "Request failed.");
    } finally {
      setBusyId("");
    }
  }

  async function handleComplete(taskId) {
    setBusyId(taskId);
    try {
      await putHousekeepingTaskStatusBackend(taskId, "completed");
      await loadTasks();
      dispatchHousekeepingTasksRefresh();
      showSuccessModal("Completed", "Room marked ready.");
    } catch (e) {
      showToast("Update failed", e?.message || "Request failed.");
    } finally {
      setBusyId("");
    }
  }

  function getBadgeClass(displayStatus) {
    return getAssetStatusBadgeClass(displayStatus);
  }

  /** No room/venue status yet — hide cell so a neutral pill is not mistaken for a control beside Start. */
  function isUnspecifiedStatus(displayStatus) {
    const s = String(displayStatus ?? "").trim();
    if (!s) return true;
    return /^[\u002D\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]+$/u.test(s);
  }

  function taskStatusCell(displayStatus) {
    if (isUnspecifiedStatus(displayStatus)) return null;
    const s = String(displayStatus ?? "").trim();
    return <span className={`rc-badge ${getBadgeClass(s)}`}>{s}</span>;
  }

  function taskActionButton(r) {
    if (r.taskStatus === "pending") {
      return (
        <button
          type="button"
          className="rc-action-btn btn-start"
          disabled={busyId === r.taskId}
          onClick={() => handleStart(r.taskId)}
        >
          Start
        </button>
      );
    }
    if (r.taskStatus === "in_progress") {
      return (
        <button
          type="button"
          className="rc-action-btn btn-completed"
          disabled={busyId === r.taskId}
          onClick={() => handleComplete(r.taskId)}
        >
          Mark complete
        </button>
      );
    }
    return null;
  }

  return (
    <>
      <RailPortalShell
        rootClassName="housekeeping-portal-layout"
        shellClassName={shellClassName}
        mainStyle={mainStyle}
        sidebar={
          <HousekeepingSidebar
            navItems={[
              { label: "Dashboard", icon: <DashIcon />, href: "/housekeeping" },
              { label: "Rooms", icon: <RoomIcon />, href: "/housekeeping-rooms", active: true },
              { label: "Event Venues", icon: <EventIcon />, href: "/housekeeping-events" },
              { label: "Settings", icon: <SettingsIcon />, href: "/housekeeping-settings" },
            ]}
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
                Room
              </span>,
            ]}
          </div>
          <StaffTopbarActions
            roleKey="housekeeping"
            notifications={displayNotifications}
            bellTitle="Cleaning queue"
            dot={needsCleaningCount > 0 ? "active" : null}
            dotTitle="Cleaning tasks or alerts"
            onNotificationsPanelOpen={() => void markHousekeepingInboxSeen()}
            onRequestLogout={requestLogout}
          />
        </header>

        <main className="content">
          <div className="rc-wrap">
            <div className="rc-heading">
              <h2 className="rc-title">Room Cleaning</h2>
              <p className="rc-sub">Manage room cleaning and maintenance</p>
            </div>

            <hr className="rc-divider" />

            <div className="rc-tabs">
              {["pending", "inprogress", "completed"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={`rc-tab${currentTab === tab ? " active" : ""}`}
                  onClick={() => setCurrentTab(tab)}
                >
                  {taskTabToLabel(tab)}
                </button>
              ))}
            </div>

            <div className="rc-search-wrap">
              <svg className="rc-search-icon" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="16" height="16">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="rc-search-input"
                placeholder="Search rooms, package, status…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loadError ? <p style={{ color: "#c0392b", fontSize: "14px", margin: "0 0 12px" }}>{loadError}</p> : null}

            <div className="rc-table-wrap">
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Package</th>
                    <th>Guest</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="rc-empty">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="rc-empty" style={{ textAlign: "center", padding: "28px 20px", verticalAlign: "top" }}>
                        {loadError ? (
                          <span style={{ fontSize: 13, color: "#9a8060" }}>See the message above.</span>
                        ) : (
                          <>
                            <div style={{ fontWeight: 600, color: "#4a3f2e", marginBottom: 10 }}>{emptyHint.title}</div>
                            <div style={{ fontSize: 13, color: "#6b5b45", maxWidth: 520, margin: "0 auto", lineHeight: 1.55 }}>{emptyHint.sub}</div>
                          </>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((r) => (
                      <tr key={r.taskId}>
                        <td className="rc-td-room">
                          <span className="rc-room-num">{r.number}</span>
                          {r.stayLabel !== "—" ? (
                            <span className="rc-room-meta">{r.stayLabel}</span>
                          ) : null}
                        </td>
                        <td>{r.package}</td>
                        <td className="rc-td-guest">
                          <span className="rc-guest-name">{r.guest}</span>
                          {r.guestDetail !== "—" ? (
                            <span className="rc-guest-meta">{r.guestDetail}</span>
                          ) : null}
                        </td>
                        <td className="rc-td-status">
                          <div className="rc-status-cell">
                            {taskStatusCell(r.displayStatus)}
                            {taskActionButton(r)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </RailPortalShell>

      <StaffSuccessModal
        open={Boolean(successModal)}
        title={successModal?.title ?? "Completed"}
        message={successModal?.message ?? ""}
        onClose={() => setSuccessModal(null)}
      />

      <StaffNoticeToast open={Boolean(toast)} title={toast?.title} message={toast?.sub} />

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
