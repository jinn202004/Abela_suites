import { useState, useEffect, useRef } from "react";
import { TopbarUserIcon } from "../frontdesks/frontdeskTopbarIcons";
import { TOPBAR } from "../topbar/roleTopbarData";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import "../styles/settingsTheme.css";
import "./export.css";

/** Same as Booking Management: `public/logo.jpg`. */
const ADMIN_PRINT_LOGO_SRC = `${import.meta.env.BASE_URL}logo.jpg`;

// ── SVG Icons ─────────────────────────────────────────────
const IconPrint = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
    <polyline points="6 9 6 2 18 2 18 9"/>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>
);

// ── Report Definitions ─────────────────────────────────────
const REPORT_DEFS = {
  room: {
    label: "Rooms Data",
    cols: ["Invoice ID","Cashier","Customer","Cart Name","Items","Subtotal","Discount","Total","Payment Method","Date"],
  },
  event: {
    label: "Event Data",
    cols: ["Invoice ID","Cashier","Customer","Event","Package","Subtotal","Discount","Total","Payment Method","Date"],
  },
  receipt: {
    label: "Receipt Data",
    cols: ["Invoice ID","Cashier","Customer","Type","Items","Subtotal","Discount","Total","Payment Method","Date"],
  },
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function makeSampleRows(cols, count) {
  return Array.from({ length: count }, (_, i) =>
    cols.map((col) => {
      if (col === "Invoice ID")                   return `INV-${1000 + i}`;
      if (col === "Cashier")                      return "Unknown";
      if (col === "Customer")                     return "Guest";
      if (col === "Items" || col === "Package")   return "No Items";
      if (col === "Subtotal" || col === "Total")  return "₱0.00";
      if (col === "Discount")                     return "None";
      if (col === "Payment Method")               return "Cash";
      if (col === "Date")                         return "N/A";
      return "N/A";
    })
  );
}

// ── Print Preview Modal ────────────────────────────────────
function PrintModal({ open, report, onClose }) {
  if (!open || !report) return null;
  const { label, cols, monthLabel } = report;
  const rows = makeSampleRows(cols, 8);

  return (
    <div
      className="print-backdrop"
      onClick={(e) => e.target.classList.contains("print-backdrop") && onClose()}
    >
      <div className="print-modal">
        <div className="print-modal-close-row">
          <button className="print-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="print-content">
          <div className="print-hotel-header">
            <img
              src={ADMIN_PRINT_LOGO_SRC}
              alt=""
              className="print-logo-img"
              width={72}
              height={72}
              decoding="async"
            />
            <div className="print-hotel-name">ABELA SUITES</div>
            <div className="print-hotel-address">1231 Main Street, Springfield, USA</div>
          </div>
          <div className="print-report-title">Data for {monthLabel}</div>
          <div className="print-report-type">{label}</div>
          <div className="print-table-wrap">
            <table className="print-table">
              <thead>
                <tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => <td key={j}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────
function Toast({ message, visible }) {
  if (!visible) return null;
  return (
    <div className="exp-toast">
      <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2" width="22" height="22">
        <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
      </svg>
      <span>{message}</span>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────
export default function ExportSettings() {
  const { mainStyle } = useAdminShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [exportMonth, setExportMonth] = useState("");
  const [printReport, setPrintReport] = useState(null);
  const [printOpen,   setPrintOpen]   = useState(false);
  const [toast,       setToast]       = useState({ visible: false, msg: "" });
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [userOpen,    setUserOpen]    = useState(false);

  const notifRef = useRef(null);
  const userRef  = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showToast = (msg) => {
    setToast({ visible: true, msg });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  const handlePrint = (type) => {
    const def = REPORT_DEFS[type];
    let monthLabel = "All Time";
    if (exportMonth) {
      const [y, m] = exportMonth.split("-");
      monthLabel = `${MONTHS[parseInt(m) - 1]} ${y}`;
    }
    setPrintReport({ ...def, monthLabel });
    setPrintOpen(true);
    showToast(`Generating ${def.label}...`);
  };

  return (
    <>
      <RailPortalShell
        mainStyle={mainStyle}
        rootStyle={{ display: "flex", minHeight: "100vh", background: "var(--bg-page, #f5f0e8)" }}
        sidebar={<AdminSidebarNav logoSrc="/images/logo.png" />}
      >
        {/* ── TOP BAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <span className="breadcrumb-title">Settings</span>
          </div>
          <div className="topbar-actions">

            {/* Bell */}
            <RoleTopbarBell
              ref={notifRef}
              isOpen={notifOpen}
              onBellClick={() => {
                setNotifOpen((v) => !v);
                setUserOpen(false);
              }}
              notifications={TOPBAR.admin.notifications}
              bellIconClassName="topbar-icon"
              dot="muted"
            />

            {/* User */}
            <div
              className="icon-btn"
              ref={userRef}
              style={{ position: "relative" }}
              onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}
            >
              <TopbarUserIcon className="topbar-icon" />
              <span
                className="user-arrow"
                style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                ▾
              </span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={TOPBAR.admin.profile}
                profilePath={TOPBAR.admin.profilePath}
                onCloseMenus={() => { setNotifOpen(false); setUserOpen(false); }}
                onLogout={() => { setNotifOpen(false); setUserOpen(false); requestLogout(); }}
              />
            </div>

          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="content">

          {/* Page Header */}
          <div>
            <div className="exp-back-row">
              <a href="/admin-settings" className="exp-back-arrow">‹</a>
              <span className="exp-title">Export</span>
            </div>
            <div className="exp-sub">Download reports, billing history, and system logs</div>
          </div>

          {/* Print Data Card */}
          <div className="exp-card">
            <div className="exp-card-header">
              <span className="exp-card-icon"><IconPrint /></span>
              <span className="exp-card-title">Print Data</span>
            </div>

            <p className="exp-card-sub">
              Generate printable reports for events, rooms, and receipts.
            </p>

            <div className="exp-form-group">
              <label className="exp-form-label">Select Month</label>
              <input
                type="month"
                className="exp-month-input"
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
              />
            </div>

            <div className="exp-btns">
              <button className="exp-btn" onClick={() => handlePrint("room")}>
                Print Room Data
              </button>
              <button className="exp-btn" onClick={() => handlePrint("event")}>
                Print Event Data
              </button>
              <button className="exp-btn" onClick={() => handlePrint("receipt")}>
                Print Receipt Data
              </button>
            </div>
          </div>

        </main>
      </RailPortalShell>

      {/* ── PRINT PREVIEW MODAL ── */}
      <PrintModal
        open={printOpen}
        report={printReport}
        onClose={() => setPrintOpen(false)}
      />

      {/* ── TOAST ── */}
      <Toast message={toast.msg} visible={toast.visible} />

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}