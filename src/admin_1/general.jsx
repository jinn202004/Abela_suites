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
import "./general.css";
const initialDiscounts = [
  { name: "Employee", pct: 20 },
  { name: "PWD", pct: 20 },
  { name: "Senior Citizen", pct: 20 },
];

const initialHolidays = [
  "11/01/2025", "11/25/2025", "11/01/2025", "11/25/2025", "11/25/2025",
];

const initialAuditLogs = [
  { time: "3/27/2026, 10:23 AM", user: "Joanah Cultura", action: "Price Update",      status: "Success" },
  { time: "3/27/2026, 10:23 AM", user: "Jujenn Nabo",    action: "Cancelled Booking", status: "Success" },
  { time: "3/27/2026, 10:23 AM", user: "Joanah Cultura", action: "Price Update",      status: "Success" },
  { time: "3/27/2026, 10:23 AM", user: "Jujenn Nabo",    action: "Cancelled Booking", status: "Success" },
];

// ── SVG Icons ───────────────────────────────────────────
const IconTag = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);
const IconCalendar = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconFile = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconTrash = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);
const IconPlus = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="13" height="13">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconSearch = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

// ── Toast ───────────────────────────────────────────────
function Toast({ message, visible }) {
  if (!visible) return null;
  return (
    <div className="rm-toast active">
      <svg viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2" width="22" height="22">
        <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
      </svg>
      <span>{message}</span>
    </div>
  );
}

// ── Confirm Dialog ──────────────────────────────────────
function ConfirmDialog({ open, title, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div
      className="rm-confirm-backdrop active"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="rm-confirm-dialog">
        <div className="rm-confirm-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8">
            <circle cx="12" cy="12" r="10" />
          </svg>
          <span className="rm-confirm-exclaim">!</span>
        </div>
        <h3 className="rm-confirm-title">{title}</h3>
        <p className="rm-confirm-sub">This action cannot be undone.</p>
        <div className="rm-confirm-btns">
          <button type="button" className="rm-btn-cancel-confirm" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="rm-btn-delete-confirm" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Discount Modal ──────────────────────────────────────
function DiscountModal({ open, editData, onClose, onSave }) {
  const [name, setName] = useState("");
  const [pct, setPct] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (open) {
      setName(editData?.name || "");
      setPct(editData?.pct ?? "");
      setErr("");
    }
  }, [open, editData]);

  const handleSave = () => {
    if (!name.trim()) return;
    const p = parseFloat(pct);
    if (pct === "" || isNaN(p) || p < 0 || p > 100) {
      setErr("Please enter a percentage between 0 and 100.");
      return;
    }
    setErr("");
    onSave({ name: name.trim(), pct: Math.round(p * 100) / 100 });
  };

  if (!open) return null;

  return (
    <div
      className="rm-modal-backdrop active"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="rm-modal admin-general-page__disc-modal">
        <div className="rm-modal-header">
          <h2 className="rm-modal-title">{editData ? "Edit Discount" : "Add Discount"}</h2>
          <button type="button" className="rm-modal-close" onClick={onClose}>
            &#x2715;
          </button>
        </div>
        <div className="rm-modal-body">
          <div className="rm-form-group rm-form-group--full">
            <label className="admin-general-page__disc-label" htmlFor="disc-name-input">
              Discount Name
            </label>
            <input
              id="disc-name-input"
              className="rm-input"
              placeholder="e.g. Senior Citizen"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
            />
          </div>
          <div className="rm-form-group rm-form-group--full">
            <label className="admin-general-page__disc-label">Discount Percentage</label>
            <div className="admin-general-page__disc-pct-wrap">
              <input
                className="rm-input"
                type="number"
                placeholder="e.g. 20"
                min="0"
                max="100"
                step="0.01"
                value={pct}
                onChange={(e) => {
                  setPct(e.target.value);
                  setErr("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <span className="admin-general-page__disc-pct-symbol">%</span>
            </div>
            {err && <span className="rm-err">{err}</span>}
          </div>
          <div className="rm-modal-actions">
            <button type="button" className="rm-btn-clear" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="rm-btn-save" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────
export default function GeneralSettings() {
  const { mainStyle } = useAdminShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [discounts, setDiscounts]       = useState(initialDiscounts);
  const [defaultDiscount, setDefaultDiscount] = useState("");
  const [holidays, setHolidays]         = useState(initialHolidays);
  const [newHolidayDate, setNewHolidayDate]   = useState("");
  const [auditQuery, setAuditQuery]     = useState("");

  const [discModal, setDiscModal] = useState({ open: false, editIdx: -1 });
  const [confirm, setConfirm]     = useState({ open: false, title: "", cb: null });
  const [toast, setToast]         = useState({ visible: false, msg: "" });

  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen,  setUserOpen]  = useState(false);
  const notifRef = useRef(null);
  const userRef  = useRef(null);

  // Close dropdowns on outside click
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

  const openConfirm  = (title, cb) => setConfirm({ open: true, title, cb });
  const closeConfirm = () => setConfirm({ open: false, title: "", cb: null });
  const runConfirm   = () => { confirm.cb?.(); closeConfirm(); };

  // Discounts
  const openAddDiscount  = ()  => setDiscModal({ open: true, editIdx: -1 });
  const openEditDiscount = (i) => setDiscModal({ open: true, editIdx: i });
  const closeDiscModal   = ()  => setDiscModal({ open: false, editIdx: -1 });

  const saveDiscount = (data) => {
    if (discModal.editIdx >= 0) {
      setDiscounts((d) => d.map((item, i) => i === discModal.editIdx ? data : item));
      showToast("Discount updated!");
    } else {
      setDiscounts((d) => [...d, data]);
      showToast("Discount added!");
    }
    closeDiscModal();
  };

  const deleteDiscount = (i) => {
    openConfirm("Delete Discount?", () => {
      setDiscounts((d) => d.filter((_, idx) => idx !== i));
      showToast("Discount deleted.");
    });
  };

  // Holidays
  const addHoliday = () => {
    if (!newHolidayDate) { showToast("Please select a date first."); return; }
    const [y, m, d] = newHolidayDate.split("-");
    setHolidays((h) => [...h, `${m}/${d}/${y}`]);
    setNewHolidayDate("");
    showToast("Holiday added!");
  };

  const deleteHoliday = (i) => {
    openConfirm("Delete Holiday?", () => {
      setHolidays((h) => h.filter((_, idx) => idx !== i));
      showToast("Holiday deleted.");
    });
  };

  // Audit filter
  const filteredLogs = initialAuditLogs.filter((a) => {
    const q = auditQuery.toLowerCase();
    return !q || a.user.toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || a.time.toLowerCase().includes(q);
  });

  const editData = discModal.editIdx >= 0 ? discounts[discModal.editIdx] : null;

  return (
    <>
      <RailPortalShell
        rootClassName="admin-general-page"
        mainStyle={mainStyle}
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
            <div className="icon-btn" ref={userRef} onClick={() => { setUserOpen((v) => !v); setNotifOpen(false); }}>
              <TopbarUserIcon className="topbar-icon" />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)" }}>&#9662;</span>
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
          <div className="gen-page-header">
            <div>
              <div className="gen-back-row">
                <a href="/admin-settings" className="gen-back-arrow">&#8249;</a>
                <span className="gen-title">General</span>
              </div>
              <div className="gen-sub">Manage billing, notifications, security and logs for your system.</div>
            </div>
            <button className="gen-save-btn" onClick={() => showToast("Settings saved successfully!")}>
              Save Changes
            </button>
          </div>

          {/* Top Row */}
          <div className="gen-top-row">

            {/* DISCOUNTS PANEL */}
            <div className="gen-panel">
              <div className="gen-panel-header">
                <span className="gen-panel-icon"><IconTag /></span>
                <span className="gen-panel-title">Discounts</span>
              </div>
              <p className="gen-panel-sub">
                Discount types shown in the POS. Add, edit or remove discounts and choose the default.
              </p>
              <div>
                <div className="gen-label">Default Discount</div>
                <div className="gen-select-wrap" style={{ marginTop: "8px" }}>
                  <select
                    className="gen-select"
                    value={defaultDiscount}
                    onChange={(e) => setDefaultDiscount(e.target.value)}
                  >
                    <option value="">No Discount</option>
                    {discounts.map((d) => (
                      <option key={d.name} value={d.name}>{d.name} ({d.pct}%)</option>
                    ))}
                  </select>
                </div>
              </div>
              <button className="gen-add-discount-btn" onClick={openAddDiscount}>
                <IconPlus /> Add Discount
              </button>
              <div className="gen-discount-list">
                {discounts.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "var(--text-light)", textAlign: "center", padding: "12px 0" }}>
                    No discounts added yet.
                  </div>
                ) : discounts.map((d, i) => (
                  <div className="gen-discount-item" key={i}>
                    <div className="disc-name-wrap">
                      <span>{d.name}</span>
                      <span className="disc-pct-badge">{d.pct}%</span>
                    </div>
                    <div className="gen-discount-actions">
                      <button className="icon-action edit-btn" title="Edit" onClick={() => openEditDiscount(i)}>
                        <IconEdit />
                      </button>
                      <button className="icon-action del-btn" title="Delete" onClick={() => deleteDiscount(i)}>
                        <IconTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* HOLIDAYS PANEL */}
            <div className="gen-panel">
              <div className="gen-panel-header">
                <span className="gen-panel-icon"><IconCalendar /></span>
                <span className="gen-panel-title">Holidays</span>
              </div>
              <p className="gen-panel-sub">Set dates that should be treated as holidays.</p>
              <div className="gen-holiday-input-row">
                <input
                  type="date"
                  className="gen-date-input"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                />
                <button className="gen-add-holiday-btn" onClick={addHoliday}>
                  <IconPlus /> Add Holiday
                </button>
              </div>
              <div className="gen-holiday-list">
                {holidays.length === 0 ? (
                  <div style={{ fontSize: "13px", color: "var(--text-light)", textAlign: "center", padding: "12px 0" }}>
                    No holidays added yet.
                  </div>
                ) : holidays.map((h, i) => (
                  <div className="gen-holiday-item" key={i}>
                    <span>{h}</span>
                    <button className="icon-action del-btn" onClick={() => deleteHoliday(i)}>
                      <IconTrash />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* AUDIT LOGS */}
          <div className="gen-audit-panel">
            <div className="gen-panel-header">
              <span className="gen-panel-icon"><IconFile /></span>
              <span className="gen-panel-title">Audit Logs</span>
            </div>
            <p className="gen-panel-sub">Track all user activities and system changes</p>
            <div className="gen-audit-search-wrap">
              <span className="gen-audit-search-icon"><IconSearch /></span>
              <input
                type="text"
                className="gen-audit-search-input"
                placeholder="Search users, action, date, or description..."
                value={auditQuery}
                onChange={(e) => setAuditQuery(e.target.value)}
              />
            </div>
            <div className="gen-audit-table-wrap">
              <table className="gen-audit-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", color: "var(--text-light)", padding: "24px 0", fontSize: "13px" }}>
                        No logs found.
                      </td>
                    </tr>
                  ) : filteredLogs.map((a, i) => (
                    <tr key={i}>
                      <td>{a.time}</td>
                      <td>{a.user}</td>
                      <td>{a.action}</td>
                      <td><span className="audit-success">{a.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </RailPortalShell>

      {/* MODALS */}
      <DiscountModal
        open={discModal.open}
        editData={editData}
        onClose={closeDiscModal}
        onSave={saveDiscount}
      />
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        onCancel={closeConfirm}
        onConfirm={runConfirm}
      />
      <Toast message={toast.msg} visible={toast.visible} />

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}