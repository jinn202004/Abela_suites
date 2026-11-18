import { useState, useEffect, useCallback, useMemo } from "react";
import FrontdeskTopbarActions from "./FrontdeskTopbarActions";
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
  fetchHousekeepingTasksBackend,
  fetchHousekeepingTeamBackend,
  fetchHousekeepingRecentCleaningBackend,
  HOUSEKEEPING_TASKS_REFRESH_EVENT,
  patchEventVenueHousekeepingStatusBackend,
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
import {
  sortKey,
  formatClock,
  formatScheduleLabel,
  deriveTaskName,
  isCompletedToday,
  readAssignOverlay,
  writeAssignOverlay,
  readLocalActivity,
  pushLocalActivity,
  pickBestTask,
  tasksForAsset,
  toApiHousekeepingStatus,
  activityBadgeClass,
  staffDotClass,
} from "./frontdeskHousekeepingHelpers";
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

function buildAssetRows(list, kind, tasks, assignOverlay) {
  return (Array.isArray(list) ? list : [])
    .map((item) => {
      const key = String(item.id);
      const number =
        kind === "venues"
          ? String(item.eventNum ?? "").trim() || "—"
          : String(item.roomNumber ?? "").trim() || "—";
      const type =
        kind === "venues"
          ? String(item.package || item.name || "—").trim() || "—"
          : String(item.package || item.title || "—").trim() || "—";
      const rawStatus = String(item.status || "available").toLowerCase();
      const targetType = kind === "venues" ? "event" : "room";
      const task = pickBestTask(tasksForAsset(tasks, { targetType, id: key, number }));
      const taskName = deriveTaskName(task, rawStatus);
      const overlay = assignOverlay[`${kind}:${key}`] || {};
      const assignedTo =
        String(overlay.assignee || task?.assignedTo?.name || "").trim() || "—";
      const scheduledTime = task
        ? formatScheduleLabel(task)
        : formatClock(item.updatedAt) !== "—"
          ? formatClock(item.updatedAt)
          : "—";
      return {
        key,
        kind,
        number,
        type,
        taskName,
        assignedTo,
        scheduledTime,
        rawStatus,
        displayStatus: frontDeskStatusLabel(item.status),
        sort: sortKey(number),
        taskId: task?.id || null,
        taskStatus: task ? String(task.status || "").toLowerCase() : "",
      };
    })
    .sort((a, b) => a.sort - b.sort);
}

function statusSelectClass(value) {
  const v = String(value || "").toLowerCase();
  if (v === "needs_cleaning") return "hk-status-select hk-status-select--needs";
  if (v === "cleaning_in_progress" || v === "in_progress") {
    return "hk-status-select hk-status-select--progress";
  }
  if (v === "available" || v === "ready") return "hk-status-select hk-status-select--ready";
  return "hk-status-select";
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
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [recentCleaning, setRecentCleaning] = useState([]);
  const [assignOverlay, setAssignOverlay] = useState(() => readAssignOverlay());
  const [localActivity, setLocalActivity] = useState(() => readLocalActivity());
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterHousekeeper, setFilterHousekeeper] = useState("all");
  const [hkListPage, setHkListPage] = useState(1);
  const [hkListPageSize, setHkListPageSize] = useState(10);
  const [statusDraft, setStatusDraft] = useState({});
  const [assigneeDraft, setAssigneeDraft] = useState({});
  const [savingRoomKey, setSavingRoomKey] = useState(null);
  const [rowActionError, setRowActionError] = useState({});
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    assetKey: "",
    assignee: "",
    status: "needs_cleaning",
  });
  const [assignError, setAssignError] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);
  const onNotificationItemClick = useNotificationRedirect("frontdesk");

  const loadAll = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) {
      setLoading(true);
      setLoadError("");
    }
    try {
      const [rooms, venues, taskList, teamList, recent] = await Promise.all([
        fetchRoomsCatalog(),
        fetchEventVenuesBackend().catch(() => []),
        fetchHousekeepingTasksBackend(true).catch(() => []),
        fetchHousekeepingTeamBackend().catch(() => []),
        fetchHousekeepingRecentCleaningBackend(12).catch(() => []),
      ]);
      const overlay = readAssignOverlay();
      setAssignOverlay(overlay);
      setTasks(Array.isArray(taskList) ? taskList : []);
      setTeam(Array.isArray(teamList) ? teamList : []);
      setRecentCleaning(Array.isArray(recent) ? recent : []);
      setRoomRows(
        buildAssetRows(Array.isArray(rooms) ? rooms : [], "rooms", taskList, overlay),
      );
      setVenueRows(
        buildAssetRows(Array.isArray(venues) ? venues : [], "venues", taskList, overlay),
      );
      if (!silent) setLoadError("");
    } catch (e) {
      setRoomRows([]);
      setVenueRows([]);
      if (!silent) setLoadError(e.message || "Could not load housekeeping.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll({ silent: false });
  }, [loadAll]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void loadAll({ silent: true });
    };
    const onHk = () => void loadAll({ silent: true });
    const onAuth = () => void loadAll({ silent: true });
    const poll = window.setInterval(() => void loadAll({ silent: true }), 5000);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHk);
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, onHk);
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    };
  }, [loadAll]);

  const activeRows = viewMode === "venues" ? venueRows : roomRows;
  const inventoryForStats = useMemo(() => [...roomRows, ...venueRows], [roomRows, venueRows]);

  const countNeedClean = inventoryForStats.filter((r) => r.rawStatus === "needs_cleaning").length;
  const countInProgress = inventoryForStats.filter(
    (r) => r.rawStatus === "cleaning_in_progress",
  ).length;
  const countCompletedToday = useMemo(
    () => tasks.filter((t) => isCompletedToday(t)).length,
    [tasks],
  );
  const countTotal = inventoryForStats.length;

  const typeOptions = useMemo(() => {
    const set = new Set(activeRows.map((r) => r.type).filter((t) => t && t !== "—"));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [activeRows]);

  const housekeeperOptions = useMemo(() => {
    const names = new Set();
    team.forEach((m) => {
      const n = String(m?.name || "").trim();
      if (n) names.add(n);
    });
    activeRows.forEach((r) => {
      if (r.assignedTo && r.assignedTo !== "—") names.add(r.assignedTo);
    });
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [team, activeRows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return activeRows.filter((r) => {
      if (filterStatus !== "all") {
        const label = r.displayStatus.toLowerCase();
        if (filterStatus === "needs" && !label.includes("need")) return false;
        if (filterStatus === "progress" && !label.includes("progress")) return false;
        if (filterStatus === "available" && label !== "available") return false;
        if (filterStatus === "occupied" && label !== "occupied") return false;
      }
      if (filterType !== "all" && r.type !== filterType) return false;
      if (filterHousekeeper !== "all" && r.assignedTo !== filterHousekeeper) return false;
      if (!q) return true;
      const hay = [
        r.number,
        r.type,
        r.taskName,
        r.assignedTo,
        r.scheduledTime,
        r.displayStatus,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [activeRows, search, filterStatus, filterType, filterHousekeeper]);

  const hkPageSizeSafe = Math.min(100, Math.max(5, Number(hkListPageSize) || 10));
  const hkTotalPages = Math.max(1, Math.ceil(filtered.length / hkPageSizeSafe));
  const hkPageSafe = Math.min(Math.max(1, hkListPage), hkTotalPages);

  const pagedRows = useMemo(() => {
    const start = (hkPageSafe - 1) * hkPageSizeSafe;
    return filtered.slice(start, start + hkPageSizeSafe);
  }, [filtered, hkPageSafe, hkPageSizeSafe]);

  useEffect(() => {
    setHkListPage(1);
  }, [search, filterStatus, filterType, filterHousekeeper, viewMode]);

  useEffect(() => {
    setStatusDraft({});
    setAssigneeDraft({});
    setRowActionError({});
  }, [viewMode]);

  useEffect(() => {
    setHkListPage((p) => Math.min(Math.max(1, p), hkTotalPages));
  }, [hkTotalPages]);

  const staffRows = useMemo(() => {
    const names =
      housekeeperOptions.length > 0
        ? housekeeperOptions
        : team.map((m) => String(m?.name || "").trim()).filter(Boolean);

    if (!names.length) return [];

    return names.map((name) => {
      const active = inventoryForStats.find(
        (r) =>
          r.assignedTo === name &&
          (r.rawStatus === "needs_cleaning" || r.rawStatus === "cleaning_in_progress"),
      );
      let status = "Available";
      if (active?.rawStatus === "cleaning_in_progress") status = "Busy";
      else if (active?.rawStatus === "needs_cleaning") status = "Busy";
      const currentTask = active ? `${active.kind === "venues" ? "Venue" : "Room"} ${active.number} — ${active.taskName}` : "—";
      const lastUpdated = active?.scheduledTime && active.scheduledTime !== "—"
        ? active.scheduledTime
        : "—";
      return { name, status, currentTask, lastUpdated };
    });
  }, [housekeeperOptions, team, inventoryForStats]);

  const activityFeed = useMemo(() => {
    const fromLocal = localActivity.map((a) => ({
      id: a.id,
      at: a.at,
      text: a.text,
      badge: a.badge || "Assigned",
      sort: new Date(a.at).getTime() || 0,
    }));

    const fromTasks = (Array.isArray(tasks) ? tasks : []).slice(0, 20).map((t) => {
      const isEvent = String(t?.targetType || "").toLowerCase() === "event";
      const num = isEvent
        ? String(t?.eventVenue?.eventNum ?? "—").trim()
        : String(t?.room?.roomNumber ?? "—").trim();
      const place = isEvent ? `Venue ${num}` : `Room ${num}`;
      const st = String(t?.status || "").toLowerCase();
      let badge = "Needs Cleaning";
      let text = `${place} has an open cleaning task`;
      if (st === "in_progress") {
        badge = "In Progress";
        text = `Cleaning started for ${place}`;
      } else if (st === "completed") {
        badge = "Completed";
        text = `Cleaning completed for ${place}`;
      } else if (st === "pending") {
        badge = "Needs Cleaning";
        text = `${place} is now Needs Cleaning`;
      }
      const assignee = String(t?.assignedTo?.name || "").trim();
      if (assignee && st === "in_progress") {
        text = `${assignee} started cleaning ${place}`;
      }
      return {
        id: `task-${t.id}`,
        at: t.updatedAt || t.createdAt,
        text,
        badge,
        sort: new Date(t.updatedAt || t.createdAt || 0).getTime() || 0,
      };
    });

    const fromRecent = (Array.isArray(recentCleaning) ? recentCleaning : []).map((r, i) => ({
      id: `recent-${r.id || i}`,
      at: r.updatedAt,
      text: `${r.roomName || "Unit"} is now Needs Cleaning`,
      badge: "Needs Cleaning",
      sort: new Date(r.updatedAt || 0).getTime() || 0,
    }));

    return [...fromLocal, ...fromTasks, ...fromRecent]
      .sort((a, b) => b.sort - a.sort)
      .slice(0, 8);
  }, [localActivity, tasks, recentCleaning]);

  function selectValueForRow(r) {
    return statusDraft[r.key] ?? frontDeskSelectValueFromRaw(r.rawStatus);
  }

  function isDirtyRow(r) {
    const statusDirty = selectValueForRow(r) !== frontDeskSelectValueFromRaw(r.rawStatus);
    const assigneeDirty =
      (assigneeDraft[r.key] ?? r.assignedTo) !== r.assignedTo &&
      String(assigneeDraft[r.key] ?? "").trim() !== "";
    return statusDirty || (assigneeDraft[r.key] != null && assigneeDirty);
  }

  async function handleHousekeepingStatusUpdate(r) {
    const selected = statusDraft[r.key] ?? frontDeskSelectValueFromRaw(r.rawStatus);
    const baseline = frontDeskSelectValueFromRaw(r.rawStatus);
    const nextAssignee = String(assigneeDraft[r.key] ?? r.assignedTo ?? "").trim();
    const statusChanged = selected !== baseline;
    const assigneeChanged =
      nextAssignee && nextAssignee !== "—" && nextAssignee !== r.assignedTo;

    if (!statusChanged && !assigneeChanged) return;

    setSavingRoomKey(r.key);
    setRowActionError((prev) => ({ ...prev, [r.key]: "" }));
    try {
      if (statusChanged) {
        const apiStatus = toApiHousekeepingStatus(selected);
        if (viewMode === "venues") {
          await patchEventVenueHousekeepingStatusBackend(r.key, apiStatus);
        } else {
          await patchRoomHousekeepingStatusBackend(r.key, apiStatus);
        }
      }

      if (assigneeChanged || statusChanged) {
        const overlayKey = `${viewMode}:${r.key}`;
        const nextOverlay = {
          ...readAssignOverlay(),
          [overlayKey]: {
            assignee: assigneeChanged ? nextAssignee : r.assignedTo !== "—" ? r.assignedTo : "",
            updatedAt: new Date().toISOString(),
          },
        };
        writeAssignOverlay(nextOverlay);
        setAssignOverlay(nextOverlay);

        const who = assigneeChanged ? nextAssignee : r.assignedTo;
        const statusLabel =
          selected === "needs_cleaning"
            ? "Needs Cleaning"
            : selected === "available" || selected === "ready"
              ? "Available"
              : frontDeskStatusLabel(selected);
        const act = pushLocalActivity({
          text: who && who !== "—"
            ? `${who} updated ${viewMode === "venues" ? "Venue" : "Room"} ${r.number}`
            : `${viewMode === "venues" ? "Venue" : "Room"} ${r.number} set to ${statusLabel}`,
          badge: statusChanged ? statusLabel : "Assigned",
        });
        setLocalActivity(act);
      }

      dispatchHousekeepingTasksRefresh();
      dispatchHousekeepingInboxRefresh();
      setStatusDraft((d) => {
        const next = { ...d };
        delete next[r.key];
        return next;
      });
      setAssigneeDraft((d) => {
        const next = { ...d };
        delete next[r.key];
        return next;
      });
      await loadAll({ silent: true });
    } catch (e) {
      const msg = e && typeof e.message === "string" ? e.message : "Could not update status.";
      setRowActionError((prev) => ({ ...prev, [r.key]: msg }));
    } finally {
      setSavingRoomKey(null);
    }
  }

  async function handleAssignSubmit(e) {
    e.preventDefault();
    setAssignError("");
    const assetKey = String(assignForm.assetKey || "").trim();
    const assignee = String(assignForm.assignee || "").trim();
    if (!assetKey) {
      setAssignError("Select a room or venue.");
      return;
    }
    if (!assignee) {
      setAssignError("Select or enter a housekeeper.");
      return;
    }
    const row = activeRows.find((r) => r.key === assetKey);
    if (!row) {
      setAssignError("Selected unit not found.");
      return;
    }
    if (!frontDeskHousekeepingStatusEditable(row.rawStatus)) {
      setAssignError("This unit cannot be updated while occupied or cleaning is in progress.");
      return;
    }

    setAssignSaving(true);
    try {
      const apiStatus = toApiHousekeepingStatus(assignForm.status || "needs_cleaning");
      if (viewMode === "venues") {
        await patchEventVenueHousekeepingStatusBackend(row.key, apiStatus);
      } else {
        await patchRoomHousekeepingStatusBackend(row.key, apiStatus);
      }

      const overlayKey = `${viewMode}:${row.key}`;
      const nextOverlay = {
        ...readAssignOverlay(),
        [overlayKey]: { assignee, updatedAt: new Date().toISOString() },
      };
      writeAssignOverlay(nextOverlay);
      setAssignOverlay(nextOverlay);

      const act = pushLocalActivity({
        text: `${assignee} was assigned to ${viewMode === "venues" ? "Venue" : "Room"} ${row.number}`,
        badge: "Assigned",
      });
      setLocalActivity(act);

      dispatchHousekeepingTasksRefresh();
      dispatchHousekeepingInboxRefresh();
      setAssignOpen(false);
      setAssignForm({ assetKey: "", assignee: "", status: "needs_cleaning" });
      await loadAll({ silent: true });
    } catch (err) {
      setAssignError(err?.message || "Could not assign task.");
    } finally {
      setAssignSaving(false);
    }
  }

  const hkPaginationBar = !loading && filtered.length > 0 && (
    <>
      <div className="rm-pagination-info">
        <span>
          Showing{" "}
          <strong>{filtered.length === 0 ? 0 : (hkPageSafe - 1) * hkPageSizeSafe + 1}</strong>–
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
      <div className="rm-pagination-btns">
        <button
          type="button"
          className="rm-page-btn"
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
        <span className="rm-pagination-pages">
          Page {hkPageSafe} of {hkTotalPages}
        </span>
        <button
          type="button"
          className="rm-page-btn"
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
    </>
  );

  function renderRowActions(r) {
    const editable = frontDeskHousekeepingStatusEditable(r.rawStatus);
    return (
      <>
        {!editable ? (
          <span className="fd-hk-readonly-status">{r.displayStatus}</span>
        ) : (
          <select
            className={statusSelectClass(selectValueForRow(r))}
            aria-label={`Housekeeping status for ${viewMode === "venues" ? "venue" : "room"} ${r.number}`}
            value={selectValueForRow(r)}
            disabled={savingRoomKey === r.key}
            onChange={(e) => setStatusDraft((d) => ({ ...d, [r.key]: e.target.value }))}
          >
            {FRONTDESK_HK_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        {rowActionError[r.key] ? (
          <span className="hk-row-error" role="alert">
            {rowActionError[r.key]}
          </span>
        ) : null}
      </>
    );
  }

  return (
    <>
      <RailPortalShell
        rootClassName="frontdesk-app fd-hk-app"
        rootStyle={{ display: "flex", width: "100%", height: "100vh", overflow: "hidden" }}
        mainStyle={mainStyle}
        sidebar={<FrontdeskSidebar navItems={sidebarNav.map(({ to, label, icon }) => ({ href: to, label, icon }))} />}
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <FrontdeskSidebarToggle />
            <span className="breadcrumb-title">Housekeeping</span>
          </div>
          <FrontdeskTopbarActions
            roleKey="frontdesk"
            notifications={displayNotifications}
            dot={pendingCount > 0 ? "active" : null}
            dotTitle="Pending or unread alerts"
            onNotificationsPanelOpen={() => void markStaffNotificationsSeen()}
            onNotificationItemClick={onNotificationItemClick}
            onRequestLogout={requestLogout}
          />
        </header>

        <main className="content">
          <div className="rm-dashboard-header">
            <div className="rm-dashboard-title">Housekeeping Management Dashboard</div>
            <div className="rm-dashboard-sub">
              Assign cleaning tasks, track progress, and update room or venue status. Changes use existing
              housekeeping status only — no other data is modified.
            </div>
            {loadError ? <p className="hk-inline-error">{loadError}</p> : null}
          </div>

          <div className="rm-stats-row rm-stats-row--4">
            <div className="rm-stat-card">
              <div className="rm-stat-label rm-stat-label--warn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden>
                  <path d="M3 12h18" /><path d="M3 6h18" /><path d="M3 18h18" />
                </svg>
                Needs Cleaning
              </div>
              <div className="rm-stat-value">{countNeedClean}</div>
              <div className="rm-stat-foot">Rooms / Venues</div>
            </div>
            <div className="rm-stat-card">
              <div className="rm-stat-label rm-stat-label--info">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                In Progress
              </div>
              <div className="rm-stat-value">{countInProgress}</div>
              <div className="rm-stat-foot">Rooms / Venues</div>
            </div>
            <div className="rm-stat-card">
              <div className="rm-stat-label rm-stat-label--ok">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Completed Today
              </div>
              <div className="rm-stat-value">{countCompletedToday}</div>
              <div className="rm-stat-foot">Rooms / Venues</div>
            </div>
            <div className="rm-stat-card">
              <div className="rm-stat-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden>
                  <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z" />
                </svg>
                Total Rooms / Venues
              </div>
              <div className="rm-stat-value">{countTotal}</div>
            </div>
          </div>

          <div className="rm-room-switch" role="tablist" aria-label="Housekeeping areas">
            <button
              type="button"
              role="tab"
              aria-selected={viewMode === "rooms"}
              className={`rm-room-switch__btn${viewMode === "rooms" ? " rm-room-switch__btn--active" : ""}`}
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
              className={`rm-room-switch__btn${viewMode === "venues" ? " rm-room-switch__btn--active" : ""}`}
              onClick={() => {
                setViewMode("venues");
                setHkListPage(1);
              }}
            >
              Event Venues
            </button>
          </div>

          <div className="rm-panel">
            <div className="rm-top-row fd-hk-toolbar">
              <div className="rm-search-wrap">
                <svg
                  className="rm-search-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9a8060"
                  strokeWidth="2"
                  width="16"
                  height="16"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="rm-search-input"
                  placeholder={
                    viewMode === "venues"
                      ? "Search venue number, type, or status…"
                      : "Search room number, type, or status…"
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="fd-hk-filters">
                <select
                  className="fd-hk-filter-select"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="all">All Status</option>
                  <option value="needs">Needs Cleaning</option>
                  <option value="progress">In Progress</option>
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                </select>
                <select
                  className="fd-hk-filter-select"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  aria-label="Filter by type"
                >
                  <option value="all">All Types</option>
                  {typeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  className="fd-hk-filter-select"
                  value={filterHousekeeper}
                  onChange={(e) => setFilterHousekeeper(e.target.value)}
                  aria-label="Filter by housekeeper"
                >
                  <option value="all">All Housekeepers</option>
                  {housekeeperOptions.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="fd-hk-assign-btn"
                  onClick={() => {
                    setAssignError("");
                    setAssignForm({
                      assetKey: "",
                      assignee: housekeeperOptions[0] || "",
                      status: "needs_cleaning",
                    });
                    setAssignOpen(true);
                  }}
                >
                  + Assign Task
                </button>
              </div>
            </div>

            <p className="hk-inline-hint fd-hk-hint-banner">
              Assign a task to a housekeeper and set the status. <strong>Needs Cleaning</strong> notifies
              housekeeping. You cannot set <strong>Available</strong> while the room is still occupied —
              check out the guest first.
            </p>

            <div className="rm-section-label">Housekeeping Tasks</div>

            {isMobile ? (
              <div className="fd-hk-mobile" aria-label="Task list">
                {loading ? (
                  <p className="fd-hk-mobile__empty">Loading…</p>
                ) : filtered.length === 0 ? (
                  <p className="fd-hk-mobile__empty">
                    No {viewMode === "venues" ? "venues" : "rooms"} match your filters.
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
                            <div className="fd-hk-card__row">
                              <dt>Task</dt>
                              <dd>{r.taskName}</dd>
                            </div>
                            <div className="fd-hk-card__row">
                              <dt>Assigned To</dt>
                              <dd>
                                {frontDeskHousekeepingStatusEditable(r.rawStatus) ? (
                                  <input
                                    className="fd-hk-assignee-input"
                                    list={`fd-hk-team-${r.key}`}
                                    value={assigneeDraft[r.key] ?? (r.assignedTo === "—" ? "" : r.assignedTo)}
                                    placeholder="Housekeeper"
                                    onChange={(e) =>
                                      setAssigneeDraft((d) => ({ ...d, [r.key]: e.target.value }))
                                    }
                                  />
                                ) : (
                                  r.assignedTo
                                )}
                                <datalist id={`fd-hk-team-${r.key}`}>
                                  {housekeeperOptions.map((n) => (
                                    <option key={n} value={n} />
                                  ))}
                                </datalist>
                              </dd>
                            </div>
                            <div className="fd-hk-card__row">
                              <dt>Scheduled</dt>
                              <dd>{r.scheduledTime}</dd>
                            </div>
                            <div className="fd-hk-card__row fd-hk-card__row--full">
                              <dt>Status</dt>
                              <dd className="fd-hk-card__hk-actions">{renderRowActions(r)}</dd>
                            </div>
                            <div className="fd-hk-card__row fd-hk-card__row--full">
                              <dt>Action</dt>
                              <dd>
                                {frontDeskHousekeepingStatusEditable(r.rawStatus) ? (
                                  <button
                                    type="button"
                                    className="hk-update-btn"
                                    disabled={savingRoomKey === r.key || !isDirtyRow(r)}
                                    onClick={() => void handleHousekeepingStatusUpdate(r)}
                                  >
                                    {savingRoomKey === r.key ? "Saving…" : "Update"}
                                  </button>
                                ) : (
                                  <span className="fd-hk-venues-readonly">—</span>
                                )}
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
              <div className="rm-table-wrap fd-hk-table-wrap">
                <table className="rm-table hk-table hk-table--tasks">
                  <thead>
                    <tr>
                      <th>{viewMode === "venues" ? "Venue" : "Room"} #</th>
                      <th>Type</th>
                      <th>Task</th>
                      <th>Assigned To</th>
                      <th>Scheduled Time</th>
                      <th>Status</th>
                      <th className="hk-th-actions">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem" }}>
                          Loading…
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: "1.5rem" }}>
                          No {viewMode === "venues" ? "venues" : "rooms"} match your filters.
                        </td>
                      </tr>
                    ) : (
                      pagedRows.map((r) => (
                        <tr key={r.key}>
                          <td>{r.number}</td>
                          <td>{r.type}</td>
                          <td>{r.taskName}</td>
                          <td>
                            {frontDeskHousekeepingStatusEditable(r.rawStatus) ? (
                              <>
                                <input
                                  className="fd-hk-assignee-input"
                                  list={`fd-hk-team-desk-${r.key}`}
                                  value={
                                    assigneeDraft[r.key] ?? (r.assignedTo === "—" ? "" : r.assignedTo)
                                  }
                                  placeholder="—"
                                  onChange={(e) =>
                                    setAssigneeDraft((d) => ({ ...d, [r.key]: e.target.value }))
                                  }
                                />
                                <datalist id={`fd-hk-team-desk-${r.key}`}>
                                  {housekeeperOptions.map((n) => (
                                    <option key={n} value={n} />
                                  ))}
                                </datalist>
                              </>
                            ) : (
                              r.assignedTo
                            )}
                          </td>
                          <td>{r.scheduledTime}</td>
                          <td>
                            <div className="hk-status-cell">{renderRowActions(r)}</div>
                          </td>
                          <td className="hk-td-actions">
                            {frontDeskHousekeepingStatusEditable(r.rawStatus) ? (
                              <button
                                type="button"
                                className="hk-update-btn"
                                disabled={savingRoomKey === r.key || !isDirtyRow(r)}
                                onClick={() => void handleHousekeepingStatusUpdate(r)}
                              >
                                {savingRoomKey === r.key ? "Saving…" : "Update"}
                              </button>
                            ) : (
                              <span className="fd-hk-venues-readonly">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                {hkPaginationBar ? (
                  <div className="rm-pagination-bar" role="navigation" aria-label="Housekeeping list pages">
                    {hkPaginationBar}
                  </div>
                ) : null}
              </div>
            )}

            {isMobile && hkPaginationBar ? (
              <div className="rm-table-wrap fd-hk-pagination-wrap">
                <div className="rm-pagination-bar" role="navigation" aria-label="Housekeeping list pages">
                  {hkPaginationBar}
                </div>
              </div>
            ) : null}
          </div>

          <div className="fd-hk-bottom-grid">
            <section className="fd-hk-side-panel" aria-labelledby="fd-hk-staff-title">
              <h3 id="fd-hk-staff-title" className="fd-hk-side-panel__title">
                Housekeeping Staff
              </h3>
              {staffRows.length === 0 ? (
                <p className="fd-hk-side-panel__empty">
                  No housekeepers listed yet. Assign a name on a task to see staff status here (browser
                  only — not saved to the database).
                </p>
              ) : (
                <div className="fd-hk-side-panel__scroll">
                  <table className="fd-hk-mini-table">
                    <thead>
                      <tr>
                        <th>Staff Name</th>
                        <th>Status</th>
                        <th>Current Task</th>
                        <th>Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffRows.map((s) => (
                        <tr key={s.name}>
                          <td>{s.name}</td>
                          <td>
                            <span className="fd-hk-staff-status">
                              <span className={staffDotClass(s.status)} aria-hidden />
                              {s.status}
                            </span>
                          </td>
                          <td>{s.currentTask}</td>
                          <td>{s.lastUpdated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="fd-hk-side-panel" aria-labelledby="fd-hk-activity-title">
              <h3 id="fd-hk-activity-title" className="fd-hk-side-panel__title">
                Recent Activity
              </h3>
              {activityFeed.length === 0 ? (
                <p className="fd-hk-side-panel__empty">No recent housekeeping activity.</p>
              ) : (
                <ul className="fd-hk-activity-list">
                  {activityFeed.map((a) => (
                    <li key={a.id} className="fd-hk-activity-item">
                      <div className="fd-hk-activity-item__top">
                        <span className="fd-hk-activity-time">{formatClock(a.at)}</span>
                        <span className={activityBadgeClass(a.badge)}>{a.badge}</span>
                      </div>
                      <p className="fd-hk-activity-text">{a.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </main>
      </RailPortalShell>

      {assignOpen ? (
        <div
          className="fd-hk-modal-backdrop"
          role="presentation"
          onClick={() => !assignSaving && setAssignOpen(false)}
        >
          <div
            className="fd-hk-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fd-hk-assign-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="fd-hk-assign-title">Assign Task</h3>
            <p className="fd-hk-modal__sub">
              Sets cleaning status on the selected unit. Assignee is kept in this browser only and is not
              written to other collections.
            </p>
            <form onSubmit={(e) => void handleAssignSubmit(e)}>
              <label className="fd-hk-modal__field">
                <span>{viewMode === "venues" ? "Venue" : "Room"}</span>
                <select
                  value={assignForm.assetKey}
                  onChange={(e) => setAssignForm((f) => ({ ...f, assetKey: e.target.value }))}
                  required
                >
                  <option value="">Select…</option>
                  {activeRows
                    .filter((r) => frontDeskHousekeepingStatusEditable(r.rawStatus))
                    .map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.number} — {r.type}
                      </option>
                    ))}
                </select>
              </label>
              <label className="fd-hk-modal__field">
                <span>Housekeeper</span>
                <input
                  list="fd-hk-assign-team"
                  value={assignForm.assignee}
                  onChange={(e) => setAssignForm((f) => ({ ...f, assignee: e.target.value }))}
                  placeholder="Name"
                  required
                />
                <datalist id="fd-hk-assign-team">
                  {housekeeperOptions.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </label>
              <label className="fd-hk-modal__field">
                <span>Status</span>
                <select
                  value={assignForm.status}
                  onChange={(e) => setAssignForm((f) => ({ ...f, status: e.target.value }))}
                >
                  {FRONTDESK_HK_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              {assignError ? (
                <p className="hk-inline-error" role="alert">
                  {assignError}
                </p>
              ) : null}
              <div className="fd-hk-modal__actions">
                <button
                  type="button"
                  className="fd-hk-modal__cancel"
                  disabled={assignSaving}
                  onClick={() => setAssignOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="fd-hk-assign-btn" disabled={assignSaving}>
                  {assignSaving ? "Saving…" : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}
