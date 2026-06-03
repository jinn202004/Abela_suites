import { useState, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import AdminRmPagination from "./AdminRmPagination";
import "./attendance-management.css";
import "./adminClickable.css";
import {
  AdminViewDetailModal,
  AdminDetailRow,
} from "../components/AdminViewDetailModal";
import { handleAdminRowActivate, handleAdminRowKeyDown } from "./adminClickUtils";

const RECORDS_PAGE_SIZE = 10;
const OT_PAGE_SIZE = 8;

const DEPARTMENTS = ["All", "Front Desk", "Housekeeping", "Restaurant", "Maintenance", "Security"];
const SHIFTS = ["All", "Morning", "Afternoon", "Night", "Split"];
const STATUSES = ["All", "Present", "Late", "Overtime", "Night Shift", "Day Off", "Absent"];

const SUMMARY = {
  presentToday: 24,
  lateEmployees: 3,
  overtimeToday: 5,
  nightShiftStaff: 8,
  onLeave: 2,
};

const LAST_IMPORTED = "May 19, 2026 — 6:42 AM";
const CUTOFF_PERIOD = "May 1 – May 15, 2026";

/** Demo rows — replace with API when attendance endpoints exist. */
const DEMO_RECORDS = [
  {
    id: 1,
    employee: "Maria Santos",
    department: "Front Desk",
    shift: "Morning",
    date: "2026-05-20",
    timeIn: "07:58",
    timeOut: "16:05",
    hoursWorked: "8.1",
    lateMinutes: 0,
    otHours: "0",
    nightDiff: "0",
    status: "Present",
    remarks: "—",
  },
  {
    id: 2,
    employee: "Juan Dela Cruz",
    department: "Housekeeping",
    shift: "Morning",
    date: "2026-05-20",
    timeIn: "08:22",
    timeOut: "16:00",
    hoursWorked: "7.6",
    lateMinutes: 22,
    otHours: "0",
    nightDiff: "0",
    status: "Late",
    remarks: "Traffic — EDSA",
  },
  {
    id: 3,
    employee: "Ana Reyes",
    department: "Restaurant",
    shift: "Afternoon",
    date: "2026-05-20",
    timeIn: "14:00",
    timeOut: "23:30",
    hoursWorked: "9.5",
    lateMinutes: 0,
    otHours: "1.5",
    nightDiff: "0",
    status: "Overtime",
    remarks: "Banquet service extension",
  },
  {
    id: 4,
    employee: "Carlos Mendoza",
    department: "Security",
    shift: "Night",
    date: "2026-05-20",
    timeIn: "22:00",
    timeOut: "06:10",
    hoursWorked: "8.2",
    lateMinutes: 0,
    otHours: "0.2",
    nightDiff: "8",
    status: "Night Shift",
    remarks: "Lobby patrol",
  },
  {
    id: 5,
    employee: "Elena Torres",
    department: "Front Desk",
    shift: "Morning",
    date: "2026-05-20",
    timeIn: "—",
    timeOut: "—",
    hoursWorked: "0",
    lateMinutes: 0,
    otHours: "0",
    nightDiff: "0",
    status: "Day Off",
    remarks: "Scheduled rest day",
  },
  {
    id: 6,
    employee: "Rico Villanueva",
    department: "Maintenance",
    shift: "Morning",
    date: "2026-05-19",
    timeIn: "—",
    timeOut: "—",
    hoursWorked: "0",
    lateMinutes: 0,
    otHours: "0",
    nightDiff: "0",
    status: "Absent",
    remarks: "No biometric punch",
  },
  {
    id: 7,
    employee: "Grace Lim",
    department: "Housekeeping",
    shift: "Afternoon",
    date: "2026-05-19",
    timeIn: "13:55",
    timeOut: "22:15",
    hoursWorked: "8.3",
    lateMinutes: 0,
    otHours: "0.5",
    nightDiff: "0",
    status: "Overtime",
    remarks: "VIP floor turnover",
  },
  {
    id: 8,
    employee: "Patrick Go",
    department: "Restaurant",
    shift: "Morning",
    date: "2026-05-19",
    timeIn: "06:58",
    timeOut: "15:02",
    hoursWorked: "8.1",
    lateMinutes: 0,
    otHours: "0",
    nightDiff: "0",
    status: "Present",
    remarks: "—",
  },
  {
    id: 9,
    employee: "Sofia Cruz",
    department: "Front Desk",
    shift: "Night",
    date: "2026-05-19",
    timeIn: "21:58",
    timeOut: "06:05",
    hoursWorked: "8.1",
    lateMinutes: 0,
    otHours: "0",
    nightDiff: "8",
    status: "Night Shift",
    remarks: "—",
  },
  {
    id: 10,
    employee: "Miguel Tan",
    department: "Maintenance",
    shift: "Morning",
    date: "2026-05-18",
    timeIn: "08:05",
    timeOut: "17:30",
    hoursWorked: "9.4",
    lateMinutes: 5,
    otHours: "1",
    nightDiff: "0",
    status: "Late",
    remarks: "Generator inspection overrun",
  },
  {
    id: 11,
    employee: "Bianca Flores",
    department: "Housekeeping",
    shift: "Morning",
    date: "2026-05-18",
    timeIn: "07:50",
    timeOut: "16:00",
    hoursWorked: "8.2",
    lateMinutes: 0,
    otHours: "0",
    nightDiff: "0",
    status: "Present",
    remarks: "—",
  },
  {
    id: 12,
    employee: "Dennis Ramos",
    department: "Security",
    shift: "Afternoon",
    date: "2026-05-18",
    timeIn: "14:10",
    timeOut: "22:00",
    hoursWorked: "7.8",
    lateMinutes: 10,
    otHours: "0",
    nightDiff: "0",
    status: "Late",
    remarks: "Handover delay",
  },
];

const DEMO_OT = [
  {
    id: 1,
    employee: "Ana Reyes",
    date: "2026-05-20",
    scheduledOut: "22:00",
    actualOut: "23:30",
    otHours: "1.5",
    reason: "Extended banquet service — Grand Ballroom",
    status: "Pending",
  },
  {
    id: 2,
    employee: "Grace Lim",
    date: "2026-05-19",
    scheduledOut: "22:00",
    actualOut: "22:15",
    otHours: "0.5",
    reason: "VIP floor deep clean before inspection",
    status: "Approved",
  },
  {
    id: 3,
    employee: "Miguel Tan",
    date: "2026-05-18",
    scheduledOut: "16:30",
    actualOut: "17:30",
    otHours: "1.0",
    reason: "Emergency generator load test",
    status: "Pending",
  },
  {
    id: 4,
    employee: "Carlos Mendoza",
    date: "2026-05-17",
    scheduledOut: "06:00",
    actualOut: "06:10",
    otHours: "0.2",
    reason: "Shift handover documentation",
    status: "Rejected",
  },
  {
    id: 5,
    employee: "Patrick Go",
    date: "2026-05-16",
    scheduledOut: "15:00",
    actualOut: "16:00",
    otHours: "1.0",
    reason: "Sunday brunch rush — understaffed",
    status: "Approved",
  },
];

// ── Icons ──
const IconPresent = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IconLate = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconOT = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
    <line x1="12" y1="2" x2="12" y2="4" />
  </svg>
);
const IconNight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);
const IconLeave = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const IconExport = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconPrint = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);
function recordStatusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "present") return "att-badge att-badge--present";
  if (s === "late") return "att-badge att-badge--late";
  if (s === "overtime") return "att-badge att-badge--ot";
  if (s === "night shift") return "att-badge att-badge--night";
  if (s === "day off") return "att-badge att-badge--dayoff";
  if (s === "absent") return "att-badge att-badge--absent";
  return "att-badge att-badge--present";
}

function otStatusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "att-badge att-badge--approved";
  if (s === "rejected") return "att-badge att-badge--rejected";
  return "att-badge att-badge--pending";
}

function paginateSlice(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    rows: items.slice(start, start + pageSize),
    totalPages,
    currentPage,
    rangeFrom: items.length === 0 ? 0 : start + 1,
    rangeTo: items.length === 0 ? 0 : start + Math.min(pageSize, items.length - start),
  };
}

export default function AttendanceManagement() {
  const { mainStyle } = useAdminShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();

  const [records] = useState(DEMO_RECORDS);
  const [overtimeRows, setOvertimeRows] = useState(DEMO_OT);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [shiftFilter, setShiftFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [deptFilter, setDeptFilter] = useState("All");
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize, setRecordsPageSize] = useState(RECORDS_PAGE_SIZE);

  const [otPage, setOtPage] = useState(1);

  const [uploadFileName, setUploadFileName] = useState("");
  const fileInputRef = useRef(null);

  const [toast, setToast] = useState({ visible: false, msg: "" });
  const [viewRecord, setViewRecord] = useState(null);
  const [viewOt, setViewOt] = useState(null);
  const [otConfirm, setOtConfirm] = useState(null);

  const suppressModalOpensUntilRef = useRef(0);
  useLayoutEffect(() => {
    suppressModalOpensUntilRef.current = performance.now() + 600;
  }, []);

  const showToast = useCallback((msg) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast({ visible: false, msg: "" }), 3200);
  }, []);

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase().trim();
    return records.filter((r) => {
      if (deptFilter !== "All" && r.department !== deptFilter) return false;
      if (shiftFilter !== "All" && r.shift !== shiftFilter) return false;
      if (statusFilter !== "All" && r.status !== statusFilter) return false;
      if (dateFrom && String(r.date) < dateFrom) return false;
      if (dateTo && String(r.date) > dateTo) return false;
      if (!q) return true;
      return (
        String(r.employee).toLowerCase().includes(q) ||
        String(r.department).toLowerCase().includes(q) ||
        String(r.status).toLowerCase().includes(q) ||
        String(r.remarks).toLowerCase().includes(q)
      );
    });
  }, [records, search, dateFrom, dateTo, shiftFilter, statusFilter, deptFilter]);

  const recordsPaginated = useMemo(
    () => paginateSlice(filteredRecords, recordsPage, recordsPageSize),
    [filteredRecords, recordsPage, recordsPageSize],
  );

  const otPaginated = useMemo(() => paginateSlice(overtimeRows, otPage, OT_PAGE_SIZE), [overtimeRows, otPage]);

  const resetRecordsPage = () => setRecordsPage(1);

  const openViewRecord = (row) => {
    if (performance.now() < suppressModalOpensUntilRef.current) return;
    setViewRecord(row);
  };

  const openViewOt = (row) => {
    if (performance.now() < suppressModalOpensUntilRef.current) return;
    setViewOt(row);
  };

  const requestOtAction = (row, action) => {
    if (performance.now() < suppressModalOpensUntilRef.current) return;
    setOtConfirm({ row, action });
  };

  const confirmOtAction = () => {
    if (!otConfirm) return;
    const { row, action } = otConfirm;
    const nextStatus = action === "approve" ? "Approved" : "Rejected";
    setOvertimeRows((prev) =>
      prev.map((o) => (o.id === row.id ? { ...o, status: nextStatus } : o)),
    );
    setOtConfirm(null);
    showToast(`Overtime ${nextStatus.toLowerCase()} for ${row.employee}.`);
  };

  const onFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) setUploadFileName(file.name);
    else setUploadFileName("");
  };

  const triggerUpload = () => fileInputRef.current?.click();

  const processAttendance = () => {
    if (!uploadFileName) {
      showToast("Select a biometric Excel file (.xlsx or .xls) first.");
      return;
    }
    showToast("Process Attendance will run when the attendance import API is connected.");
  };

  const handleReport = (kind) => {
    const labels = {
      attendance: "Attendance report export",
      print: "Attendance report print",
      overtime: "Overtime report export",
    };
    showToast(`${labels[kind]} — available when reporting API is connected.`);
  };

  const summaryCards = [
    { key: "present", label: "Present Today", value: SUMMARY.presentToday, hint: "Clocked in", tone: "present", Icon: IconPresent },
    { key: "late", label: "Late Employees", value: SUMMARY.lateEmployees, hint: "Requires review", tone: "late", Icon: IconLate },
    { key: "ot", label: "Overtime Today", value: SUMMARY.overtimeToday, hint: "Pending & approved", tone: "ot", Icon: IconOT },
    { key: "night", label: "Night Shift Staff", value: SUMMARY.nightShiftStaff, hint: "On duty tonight", tone: "night", Icon: IconNight },
    { key: "leave", label: "On Leave / Day Off", value: SUMMARY.onLeave, hint: "Not on floor", tone: "leave", Icon: IconLeave },
  ];

  return (
    <>
      <RailPortalShell
        rootClassName="app-layout admin-app-layout app-root"
        mainStyle={mainStyle}
        sidebar={<AdminSidebarNav />}
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <span className="breadcrumb-title">Attendance Management</span>
          </div>
          <AdminTopbarActions
            notifications={[
              {
                id: "att-import",
                msg: "Biometric import ready — connect backend to persist logs.",
                time: "Today",
                read: false,
              },
              {
                id: "att-ot",
                msg: "2 overtime requests pending approval.",
                time: "HR",
                read: false,
              },
            ]}
            onRequestLogout={requestLogout}
          />
        </header>

        <main className="content att-page">
          <div className="att-dashboard-header">
            <h1 className="att-dashboard-title">Attendance Management</h1>
            <p className="att-dashboard-sub">
              Manage biometric logs, monitor workforce attendance, review overtime, apply corrections, and
              generate reports for Abela Suites hotel operations.
            </p>
          </div>

          <p className="att-api-banner" role="status">
            Demo data is shown below. Staff and attendance API routes are not wired yet — saving, import, and
            exports will activate when the Express backend is connected.
          </p>

          {/* 1. Dashboard summary */}
          <div className="att-stats-row" aria-label="Attendance summary">
            {summaryCards.map(({ key, label, value, hint, tone, Icon }) => (
              <article key={key} className={`att-summary-card att-summary-card--${tone}`}>
                <div className="att-summary-card__top">
                  <span className="att-summary-card__label">{label}</span>
                  <span className="att-summary-card__icon" aria-hidden="true">
                    <Icon />
                  </span>
                </div>
                <div className="att-summary-card__value">{value}</div>
                <span className="att-summary-card__hint">{hint}</span>
              </article>
            ))}
          </div>

          {/* 2. Biometric import */}
          <section className="att-section" aria-labelledby="att-import-heading">
            <div className="att-section-head">
              <div>
                <h2 id="att-import-heading" className="att-section-title">
                  Biometric Attendance Import
                </h2>
                <p className="att-section-sub">Upload machine export and process cut-off period logs</p>
              </div>
            </div>
            <div className="att-import-card">
              <div className="att-import-main">
                <div className="att-import-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="att-file-input"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={onFileSelected}
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  <button type="button" className="att-btn-outline" onClick={triggerUpload}>
                    <IconUpload />
                    Upload Biometric Excel
                  </button>
                  <button type="button" className="sm-add-btn" onClick={processAttendance}>
                    Process Attendance
                  </button>
                </div>
                {uploadFileName ? (
                  <p className="att-import-filename">Selected: {uploadFileName}</p>
                ) : null}
                <div className="att-import-meta">
                  <div className="att-import-meta-item">
                    <span>Last imported</span>
                    <span>{LAST_IMPORTED}</span>
                  </div>
                  <div className="att-import-meta-item">
                    <span>Cut-off period</span>
                    <span>{CUTOFF_PERIOD}</span>
                  </div>
                </div>
                <p className="att-formats">Accepted formats: .xlsx, .xls</p>
              </div>
              <aside className="att-info-panel">
                <h4>Import guidelines</h4>
                <ul>
                  <li>Upload the exported biometric attendance file from your timekeeping device.</li>
                  <li>Duplicate logs for the same employee, date, and punch are automatically ignored.</li>
                  <li>Attendance records are calculated and finalized after you run Process Attendance.</li>
                </ul>
              </aside>
            </div>
          </section>

          {/* 3. Attendance records */}
          <section className="att-section" aria-labelledby="att-records-heading">
            <div className="att-section-head">
              <div>
                <h2 id="att-records-heading" className="att-section-title">
                  Attendance Records
                </h2>
                <p className="att-section-sub">Search and filter daily attendance from biometric logs</p>
              </div>
            </div>
            <div className="att-filters">
              <div className="att-filter-group att-filter-group--search">
                <label htmlFor="att-search">Search employee</label>
                <input
                  id="att-search"
                  type="text"
                  className="sm-search-input"
                  placeholder="Name, department, remarks…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    resetRecordsPage();
                  }}
                />
              </div>
              <div className="att-filter-group att-filter-group--range">
                <label htmlFor="att-from">Date range</label>
                <input
                  id="att-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    resetRecordsPage();
                  }}
                />
                <span className="att-filter-sep">to</span>
                <input
                  id="att-to"
                  type="date"
                  aria-label="Date to"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    resetRecordsPage();
                  }}
                />
              </div>
              <div className="att-filter-group">
                <label htmlFor="att-shift">Shift</label>
                <select
                  id="att-shift"
                  className="att-select"
                  value={shiftFilter}
                  onChange={(e) => {
                    setShiftFilter(e.target.value);
                    resetRecordsPage();
                  }}
                >
                  {SHIFTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="att-filter-group">
                <label htmlFor="att-status">Status</label>
                <select
                  id="att-status"
                  className="att-select"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    resetRecordsPage();
                  }}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="att-filter-group">
                <label htmlFor="att-dept">Department</label>
                <select
                  id="att-dept"
                  className="att-select"
                  value={deptFilter}
                  onChange={(e) => {
                    setDeptFilter(e.target.value);
                    resetRecordsPage();
                  }}
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="sm-table-wrap att-table-wrap att-table-wrap--wide">
              <table className="sm-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Shift</th>
                    <th>Date</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Hours Worked</th>
                    <th>Late Minutes</th>
                    <th>OT Hours</th>
                    <th>Night Diff.</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {recordsPaginated.rows.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="sm-empty">
                        No attendance records match your filters.
                      </td>
                    </tr>
                  ) : (
                    recordsPaginated.rows.map((r) => (
                      <tr
                        key={r.id}
                        className="admin-clickable-row"
                        tabIndex={0}
                        onClick={(e) => handleAdminRowActivate(e, () => openViewRecord(r))}
                        onKeyDown={(e) => handleAdminRowKeyDown(e, () => openViewRecord(r))}
                      >
                        <td>{r.employee}</td>
                        <td>{r.department}</td>
                        <td>{r.shift}</td>
                        <td>{r.date}</td>
                        <td>{r.timeIn}</td>
                        <td>{r.timeOut}</td>
                        <td>{r.hoursWorked}</td>
                        <td>{r.lateMinutes > 0 ? r.lateMinutes : "—"}</td>
                        <td>{r.otHours !== "0" ? r.otHours : "—"}</td>
                        <td>{r.nightDiff !== "0" ? r.nightDiff : "—"}</td>
                        <td>
                          <span className={recordStatusBadgeClass(r.status)}>{r.status}</span>
                        </td>
                        <td className="att-remarks-cell" title={r.remarks}>
                          {r.remarks}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <AdminRmPagination
                rangeFrom={recordsPaginated.rangeFrom}
                rangeTo={recordsPaginated.rangeTo}
                totalItems={filteredRecords.length}
                page={recordsPaginated.currentPage}
                totalPages={recordsPaginated.totalPages}
                pageSize={recordsPageSize}
                onPageChange={setRecordsPage}
                onPageSizeChange={(size) => {
                  setRecordsPageSize(size);
                  setRecordsPage(1);
                }}
                ariaLabel="Attendance records pages"
              />
            </div>
          </section>

          {/* 4. Overtime */}
          <section className="att-section" aria-labelledby="att-ot-heading">
            <div className="att-section-head">
              <div>
                <h2 id="att-ot-heading" className="att-section-title">
                  Overtime Management
                </h2>
                <p className="att-section-sub">Review, approve, or reject overtime requests</p>
              </div>
            </div>
            <div className="sm-table-wrap">
              <table className="sm-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Scheduled Out</th>
                    <th>Actual Out</th>
                    <th>OT Hours</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {otPaginated.rows.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="sm-empty">
                        No overtime records.
                      </td>
                    </tr>
                  ) : (
                    otPaginated.rows.map((o) => (
                      <tr key={o.id}>
                        <td>{o.employee}</td>
                        <td>{o.date}</td>
                        <td>{o.scheduledOut}</td>
                        <td>{o.actualOut}</td>
                        <td>{o.otHours}</td>
                        <td className="att-remarks-cell" title={o.reason}>
                          {o.reason}
                        </td>
                        <td>
                          <span className={otStatusBadgeClass(o.status)}>{o.status}</span>
                        </td>
                        <td>
                          <div className="att-ot-actions">
                            {o.status === "Pending" ? (
                              <>
                                <button
                                  type="button"
                                  className="att-btn-approve"
                                  onClick={() => requestOtAction(o, "approve")}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="att-btn-reject"
                                  onClick={() => requestOtAction(o, "reject")}
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}
                            <button type="button" className="att-btn-view" onClick={() => openViewOt(o)}>
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <AdminRmPagination
                rangeFrom={otPaginated.rangeFrom}
                rangeTo={otPaginated.rangeTo}
                totalItems={overtimeRows.length}
                page={otPaginated.currentPage}
                totalPages={otPaginated.totalPages}
                pageSize={OT_PAGE_SIZE}
                onPageChange={setOtPage}
                ariaLabel="Overtime pages"
              />
            </div>
          </section>

          {/* 5. Reports */}
          <section className="att-section" aria-labelledby="att-reports-heading">
            <h2 id="att-reports-heading" className="att-section-title">
              Attendance Reports
            </h2>
            <div className="att-reports-card">
              <div>
                <p className="att-section-sub" style={{ marginTop: 0 }}>
                  Generate payroll-ready attendance and overtime summaries for the selected cut-off period.
                </p>
              </div>
              <div className="att-reports-btns">
                <button type="button" className="att-btn-report" onClick={() => handleReport("attendance")}>
                  <IconExport />
                  Export Attendance Report
                </button>
                <button type="button" className="att-btn-report" onClick={() => handleReport("print")}>
                  <IconPrint />
                  Print Attendance Report
                </button>
                <button type="button" className="att-btn-report" onClick={() => handleReport("overtime")}>
                  <IconExport />
                  Export Overtime Report
                </button>
              </div>
            </div>
          </section>
        </main>
      </RailPortalShell>

      {/* OT confirm */}
      {otConfirm ? (
        <div
          className="rm-confirm-backdrop active"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOtConfirm(null);
          }}
        >
          <div className="rm-confirm-dialog">
            <div className="rm-confirm-icon">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#b8922a" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="rm-confirm-exclaim">?</span>
            </div>
            <h3 className="rm-confirm-title">
              {otConfirm.action === "approve" ? "Approve overtime?" : "Reject overtime?"}
            </h3>
            <p className="rm-confirm-sub">
              {otConfirm.row.employee} — {otConfirm.row.otHours} hr on {otConfirm.row.date}
            </p>
            <div className="rm-confirm-btns">
              <button type="button" className="rm-btn-cancel-confirm" onClick={() => setOtConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={
                  otConfirm.action === "approve" ? "rm-btn-save" : "rm-btn-delete-confirm"
                }
                style={otConfirm.action === "approve" ? { border: "none", borderRadius: 8 } : undefined}
                onClick={confirmOtAction}
              >
                {otConfirm.action === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast.visible ? (
        <div className="rm-toast active">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <span>{toast.msg}</span>
        </div>
      ) : null}

      <AdminViewDetailModal open={Boolean(viewRecord)} onClose={() => setViewRecord(null)} title="Attendance record">
        {viewRecord ? (
          <div className="view-item-info">
            <AdminDetailRow label="Employee" value={viewRecord.employee} />
            <AdminDetailRow label="Department" value={viewRecord.department} />
            <AdminDetailRow label="Shift" value={viewRecord.shift} />
            <AdminDetailRow label="Date" value={viewRecord.date} />
            <AdminDetailRow label="Time in" value={viewRecord.timeIn} />
            <AdminDetailRow label="Time out" value={viewRecord.timeOut} />
            <AdminDetailRow label="Hours worked" value={viewRecord.hoursWorked} />
            <AdminDetailRow label="Late minutes" value={viewRecord.lateMinutes > 0 ? viewRecord.lateMinutes : "—"} />
            <AdminDetailRow label="OT hours" value={viewRecord.otHours !== "0" ? viewRecord.otHours : "—"} />
            <AdminDetailRow label="Night differential" value={viewRecord.nightDiff !== "0" ? viewRecord.nightDiff : "—"} />
            <AdminDetailRow label="Status">
              <span className={recordStatusBadgeClass(viewRecord.status)}>{viewRecord.status}</span>
            </AdminDetailRow>
            <AdminDetailRow label="Remarks" value={viewRecord.remarks} />
          </div>
        ) : null}
      </AdminViewDetailModal>

      <AdminViewDetailModal open={Boolean(viewOt)} onClose={() => setViewOt(null)} title="Overtime details">
        {viewOt ? (
          <div className="view-item-info">
            <AdminDetailRow label="Employee" value={viewOt.employee} />
            <AdminDetailRow label="Date" value={viewOt.date} />
            <AdminDetailRow label="Scheduled out" value={viewOt.scheduledOut} />
            <AdminDetailRow label="Actual out" value={viewOt.actualOut} />
            <AdminDetailRow label="OT hours" value={viewOt.otHours} />
            <AdminDetailRow label="Reason" value={viewOt.reason} />
            <AdminDetailRow label="Status">
              <span className={otStatusBadgeClass(viewOt.status)}>{viewOt.status}</span>
            </AdminDetailRow>
          </div>
        ) : null}
      </AdminViewDetailModal>

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
