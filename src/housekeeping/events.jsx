import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import StaffTopbarActions from "../topbar/StaffTopbarActions";
import { Modal } from "../components/Modal";
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
const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const DAMAGE_STORAGE_KEY = "abela_hk_event_damage_reports";

function readDamageMap() {
  try {
    const raw = sessionStorage.getItem(DAMAGE_STORAGE_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function formatDateLabel(s) {
  if (s == null || s === "") return "—";
  const str = String(s);
  const d = str.includes("T") ? new Date(str) : new Date(`${str}T12:00:00`);
  return Number.isNaN(d.getTime()) ? str : d.toLocaleDateString("en-PH");
}

/** Venue code from Event Venues catalog only — no synthetic numbers from booking ids. */
function venueRowFromTask(t) {
  const asset = t.eventVenue;
  const b = t.booking;
  if (!asset || !String(asset.id || "").trim()) return null;
  const num =
    asset?.eventNum != null && String(asset.eventNum).trim() !== ""
      ? String(asset.eventNum).trim()
      : "—";
  /** Same rule as room cleaning: catalog `package` first, then display name (never booking venueName/eventTitle). */
  const pkg = String(asset?.package || asset?.name || "").trim() || "—";
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
    typeLabel: "Event",
    guest,
    guestDetail: [email, phone].filter(Boolean).join(" · ") || "—",
    stayLabel: checkIn !== "—" || checkOut !== "—" ? `${checkIn} → ${checkOut}` : "—",
    statusLabel: assetLabel,
    displayStatus,
    taskStatus: t.status,
  };
}

export default function EventCleaning() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [currentTab, setCurrentTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [successModal, setSuccessModal] = useState(null);
  const [damageModalOpen, setDamageModalOpen] = useState(false);
  const [damageTaskId, setDamageTaskId] = useState("");
  const [damageDesc, setDamageDesc] = useState("");
  const [damageImg, setDamageImg] = useState(null);
  const [damageImgPreview, setDamageImgPreview] = useState("");
  const [viewReport, setViewReport] = useState(null);
  const [damageByTaskId, setDamageByTaskId] = useState(() => readDamageMap());

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
          ? "Not signed in to the API — log out and sign in with housekeeping@abela.demo / 12345678 so event venue tasks load."
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
      setTasks(arr.filter((t) => t.targetType === "event"));
      setLoadError("");
    } catch (e) {
      if (!silent) {
        setLoadError(e.message || "Could not load event venue tasks.");
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
    try {
      sessionStorage.setItem(DAMAGE_STORAGE_KEY, JSON.stringify(damageByTaskId));
    } catch {
      /* ignore */
    }
  }, [damageByTaskId]);

  useEffect(() => {
    let lastFocusLoad = 0;
    const id = window.setInterval(() => loadTasks(), 6000);
    const onVis = () => {
      if (document.visibilityState === "visible") loadTasks();
    };
    const onFocus = () => {
      if (!getStoredAuthToken()) return;
      const now = Date.now();
      if (now - lastFocusLoad < 500) return;
      lastFocusLoad = now;
      loadTasks();
    };
    const onHK = () => loadTasks({ silent: true });
    const onStorage = (e) => {
      if (e.key === HOUSEKEEPING_TASKS_STORAGE_PING_KEY) loadTasks({ silent: true });
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
  }, [loadTasks]);

  const rows = useMemo(() => tasks.map(venueRowFromTask).filter(Boolean), [tasks]);

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
        r.typeLabel,
        r.guest,
        r.guestDetail,
        r.stayLabel,
        r.displayStatus,
        r.statusLabel,
        "event",
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
          sub: "No housekeeping tasks available for event venues, or no tasks are assigned to your account.",
        };
      }
      if (currentTab === "pending") {
        return {
          title: "No pending cleaning tasks found.",
          sub: "Tasks may be in progress, completed, or there are no open venue cleaning tasks.",
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
    setToast({ title, sub });
    window.clearTimeout(toastDismissRef.current);
    toastDismissRef.current = window.setTimeout(() => setToast(null), 3500);
  }

  function showSuccessModal(title, message) {
    setSuccessModal({ title, message });
  }

  useEffect(() => {
    return () => {
      if (toastDismissRef.current) window.clearTimeout(toastDismissRef.current);
    };
  }, []);

  async function handleStart(taskId) {
    setBusyId(taskId);
    try {
      await putHousekeepingTaskStatusBackend(taskId, "in_progress");
      await loadTasks();
      dispatchHousekeepingTasksRefresh();
      showToast("Started", "Cleaning marked in progress for this venue.");
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
      showSuccessModal("Completed", "Venue marked ready.");
    } catch (e) {
      showToast("Update failed", e?.message || "Request failed.");
    } finally {
      setBusyId("");
    }
  }

  function getBadgeClass(displayStatus) {
    return getAssetStatusBadgeClass(displayStatus);
  }

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

  function openDamageModal(taskId) {
    setDamageTaskId(taskId);
    setDamageDesc("");
    setDamageImg(null);
    setDamageImgPreview("");
    setDamageModalOpen(true);
  }

  function onDamageFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) {
      setDamageImg(null);
      setDamageImgPreview("");
      return;
    }
    setDamageImg(f);
    const reader = new FileReader();
    reader.onload = () => setDamageImgPreview(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(f);
  }

  function submitDamageReport() {
    const desc = damageDesc.trim() || "—";
    setDamageByTaskId((prev) => ({
      ...prev,
      [damageTaskId]: { desc, imgDataUrl: damageImgPreview || "" },
    }));
    setDamageModalOpen(false);
    showToast("Report submitted", "Damage report saved for this venue.");
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
              { label: "Rooms", icon: <RoomIcon />, href: "/housekeeping-rooms" },
              { label: "Event Venues", icon: <EventIcon />, href: "/housekeeping-events", active: true },
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
                Event Venue
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
              <h2 className="rc-title">Event Cleaning</h2>
              <p className="rc-sub">Manage event venue cleaning and maintenance</p>
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
                placeholder="Search venues, type, status…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loadError ? <p style={{ color: "#c0392b", fontSize: "14px", margin: "0 0 12px" }}>{loadError}</p> : null}

            <div className="rc-table-wrap">
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Package</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="rc-empty">
                        Loading…
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="rc-empty" style={{ textAlign: "center", padding: "28px 20px", verticalAlign: "top" }}>
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
                        <td>{r.number}</td>
                        <td>{r.package}</td>
                        <td>{r.typeLabel}</td>
                        <td>{taskStatusCell(r.displayStatus)}</td>
                        <td>
                          <div className="rc-action-cell">
                          {r.taskStatus === "pending" ? (
                            <button
                              type="button"
                              className="rc-action-btn btn-start"
                              disabled={busyId === r.taskId}
                              onClick={() => handleStart(r.taskId)}
                            >
                              Start
                            </button>
                          ) : null}
                          {r.taskStatus === "in_progress" ? (
                            <button
                              type="button"
                              className="rc-action-btn btn-completed"
                              disabled={busyId === r.taskId}
                              onClick={() => handleComplete(r.taskId)}
                            >
                              Mark complete
                            </button>
                          ) : null}
                          {r.taskStatus === "completed" ? (
                            damageByTaskId[r.taskId] ? (
                              <button
                                type="button"
                                className="rc-action-btn btn-reportdmg"
                                onClick={() => setViewReport({ taskId: r.taskId, ...damageByTaskId[r.taskId] })}
                              >
                                View Report
                              </button>
                            ) : (
                              <button type="button" className="rc-action-btn btn-reportdmg" onClick={() => openDamageModal(r.taskId)}>
                                Report Damage
                              </button>
                            )
                          ) : null}
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

      <Modal
        open={damageModalOpen}
        onClose={() => setDamageModalOpen(false)}
        title="Report Damage"
        size="md"
        placement="center"
        panelClassName="rc-modal"
        bodyClassName="rc-modal-body"
        footer={
          <div className="rc-modal-actions">
            <button type="button" className="rc-action-btn btn-start" onClick={() => setDamageModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="rc-action-btn btn-reportdmg" onClick={submitDamageReport}>
              Submit
            </button>
          </div>
        }
      >
        <label style={{ fontSize: 13, color: "#5c4d3a" }}>
          Description
          <textarea
            className="rc-search-input"
            style={{ width: "100%", minHeight: 88, marginTop: 6, resize: "vertical" }}
            value={damageDesc}
            onChange={(e) => setDamageDesc(e.target.value)}
            placeholder="Describe the issue…"
          />
        </label>
        <div>
          <span style={{ fontSize: 13, color: "#5c4d3a", display: "block", marginBottom: 6 }}>Photo (optional)</span>
          <label
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              fontSize: 13,
              color: "var(--gold-dark)",
            }}
          >
            <UploadIcon />
            <span>Choose image</span>
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={onDamageFileChange} />
          </label>
          {damageImgPreview ? (
            <img src={damageImgPreview} alt="" style={{ maxWidth: "100%", maxHeight: 160, marginTop: 10, borderRadius: 8 }} />
          ) : null}
        </div>
      </Modal>

      <Modal
        open={!!viewReport}
        onClose={() => setViewReport(null)}
        title="Damage report"
        size="md"
        placement="center"
        panelClassName="rc-modal"
        bodyClassName="rc-modal-body"
        footer={
          <div className="rc-modal-actions">
            <button type="button" className="rc-action-btn btn-reportdmg" onClick={() => setViewReport(null)}>
              Close
            </button>
          </div>
        }
      >
        {viewReport ? (
          <>
            <p style={{ margin: 0, fontSize: 14, color: "#4a3f2e", whiteSpace: "pre-wrap" }}>{viewReport.desc}</p>
            {viewReport.imgDataUrl ? (
              <img src={viewReport.imgDataUrl} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginTop: 12 }} />
            ) : null}
          </>
        ) : null}
      </Modal>
    </>
  );
}
