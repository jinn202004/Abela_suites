import { useState, useEffect, useCallback, useRef } from "react";
import { Link, NavLink } from "react-router-dom";
import { TopbarUserIcon } from "../frontdesks/frontdeskTopbarIcons";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useCashierSidebarLayout } from "./useCashierSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import CashierSidebarToggle from "./CashierSidebarToggle";
import { fetchAllBillingRecordsBackend, updateBillingPaymentBackend } from "../api/guestApi";
import { getStoredAuthToken } from "../api/authApi";
import { Modal } from "../components/Modal";
import "./cashier-sidebar-shared.css";
import "./cashier-billing.css";

const POSIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5.82 6h14.18l-1.5 7H7.5L5.82 6zM3 2H1v2h2l3.6 7.59-1.36 2.45C5.09 14.66 5 15.07 5 15.5 5 16.88 6.12 18 7.5 18h13v-2H7.83c-.17 0-.3-.13-.3-.3l.03-.12.9-1.58H18c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 22.5 5H5.21L4.27 3H1v2h2l3.6 7.59z" />
  </svg>
);
const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const BillingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);
const SettingsNavIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

function fmtPeso(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "₱0.00";
  return `₱${v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function guestLabel(g) {
  if (!g || typeof g !== "object") return "—";
  return String(g.name || g.displayName || g.email || "").trim() || "—";
}

export default function CashierBillingDashboard() {
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { topbarProfile } = useTopbarUserProfile("cashier");
  const {
    collapsed: sidebarCollapsed,
    isMobile,
    mobileSidebarOpen,
    closeMobileSidebar,
    toggleSidebar,
    shellClassName,
    asideStyle,
    mainStyle,
    logoWrapStyle,
    logoImgStyle,
  } = useCashierSidebarLayout();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(null);
  const [paymentDraft, setPaymentDraft] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const load = useCallback(async () => {
    if (!getStoredAuthToken()) {
      setRecords([]);
      setLoading(false);
      setErr("Sign in to load billing records.");
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const rows = await fetchAllBillingRecordsBackend();
      setRecords(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setRecords([]);
      setErr(e?.message || "Could not load billing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function handler(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!selected?.billing?.id) return;
    const paid = Number(selected.billing.amountPaid);
    setPaymentDraft(String(Number.isFinite(paid) ? paid : 0));
  }, [selected]);

  return (
    <>
      {isMobile && mobileSidebarOpen && (
        <div
          className="cashier-mobile-backdrop"
          onClick={closeMobileSidebar}
          aria-hidden
        />
      )}
      <RailPortalShell
        rootClassName="cashier-billing-page"
        shellClassName={shellClassName}
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%", background: "#f5f0e8" }}
        mainStyle={mainStyle}
        sidebar={
          <aside className={`sidebar ${shellClassName}`} style={asideStyle}>
            {isMobile && (
              <button
                type="button"
                className="cashier-mobile-close-btn"
                onClick={closeMobileSidebar}
                aria-label="Close menu"
              >
                ×
              </button>
            )}
            <Link
              to="/cashier-billing"
              className="sidebar-logo"
              title="Billing"
              style={logoWrapStyle}
              onClick={() => { if (isMobile) closeMobileSidebar(); }}
            >
              <img src="/logo.png" alt="Abela" className="sidebar-logo-img" decoding="async" style={logoImgStyle} />
            </Link>
            <nav className="sidebar-nav">
              <NavLink
                to="/cashier-billing"
                end
                onClick={() => { if (isMobile) closeMobileSidebar(); }}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">
                  <BillingIcon />
                </span>
                <span>Guest billing</span>
              </NavLink>
              <NavLink
                to="/cashier"
                end
                onClick={() => { if (isMobile) closeMobileSidebar(); }}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">
                  <POSIcon />
                </span>
                <span>POS</span>
              </NavLink>
              <NavLink
                to="/order-history"
                end
                onClick={() => { if (isMobile) closeMobileSidebar(); }}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">
                  <HistoryIcon />
                </span>
                <span>Order History</span>
              </NavLink>
              <NavLink
                to="/cashier-settings"
                end
                onClick={() => { if (isMobile) closeMobileSidebar(); }}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">
                  <SettingsNavIcon />
                </span>
                <span>Settings</span>
              </NavLink>
            </nav>
          </aside>
        }
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <CashierSidebarToggle
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              mobileSidebarOpen={mobileSidebarOpen}
            />
            <span className="breadcrumb-title">Guest billing</span>
          </div>
          <div className="topbar-actions">
            <RoleTopbarBell
              ref={notifRef}
              isOpen={notifOpen}
              onBellClick={(e) => {
                e.stopPropagation();
                setNotifOpen((v) => !v);
                setUserOpen(false);
              }}
              notifications={TOPBAR.cashier.notifications}
              bellIconClassName="topbar-icon"
              dot="muted"
            />
            <div
              className="icon-btn"
              ref={userRef}
              onClick={(e) => {
                e.stopPropagation();
                setUserOpen((v) => !v);
                setNotifOpen(false);
              }}
            >
              <TopbarUserIcon className="topbar-icon" />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                &#9662;
              </span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={topbarProfile}
                profilePath={TOPBAR.cashier.profilePath}
                onCloseMenus={() => { setNotifOpen(false); setUserOpen(false); }}
                onLogout={() => { setNotifOpen(false); setUserOpen(false); requestLogout(); }}
              />
            </div>
          </div>
        </header>

        <main className="content cb-main">
          <div className="cb-heading">
            <h1 className="cb-title">Guest ledgers</h1>
            <p className="cb-sub">Record payments; balance and payment status update automatically.</p>
            <button type="button" className="cb-refresh" onClick={() => void load()} disabled={loading}>
              Refresh
            </button>
          </div>
          {err ? <p className="cb-err">{err}</p> : null}
          <div className="cb-table-wrap">
            <table className="cb-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Booking</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="cb-empty">
                      Loading…
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="cb-empty">
                      No billing records.
                    </td>
                  </tr>
                ) : (
                  records.map((row) => (
                    <tr key={row.id}>
                      <td>{guestLabel(row.guest)}</td>
                      <td>{String(row.booking?.room || row.booking?.type || "—")}</td>
                      <td>{fmtPeso(row.billing?.totalAmount)}</td>
                      <td>{fmtPeso(row.billing?.amountPaid)}</td>
                      <td>{fmtPeso(row.billing?.balance)}</td>
                      <td>
                        <span className={`cb-pill cb-pill-${String(row.billing?.paymentStatus || "unpaid")}`}>
                          {String(row.billing?.paymentStatus || "—")}
                        </span>
                      </td>
                      <td>
                        <button type="button" className="cb-btn" onClick={() => setSelected(row)}>
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </RailPortalShell>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        placement="center"
        contentOnly
        shellStyle={false}
        panelClassName="cb-modal"
        overlayClassName="cb-modal-backdrop"
        ariaLabel="Record payment"
      >
        <button type="button" className="cb-modal-close" onClick={() => setSelected(null)} aria-label="Close">
          ×
        </button>
        <h2 className="cb-modal-title">Payment</h2>
        <p className="cb-modal-guest">
          <strong>Guest:</strong> {selected ? guestLabel(selected.guest) : ""}
        </p>
        <p className="cb-modal-row">
          <span>Total</span> <strong>{selected ? fmtPeso(selected.billing?.totalAmount) : ""}</strong>
        </p>
        <p className="cb-modal-row">
          <span>Paid</span> <strong>{selected ? fmtPeso(selected.billing?.amountPaid) : ""}</strong>
        </p>
        <p className="cb-modal-row">
          <span>Balance</span> <strong>{selected ? fmtPeso(selected.billing?.balance) : ""}</strong>
        </p>
        <p className="cb-modal-row">
          <span>Status</span>{" "}
          <strong>{selected ? String(selected.billing?.paymentStatus || "—") : ""}</strong>
        </p>
        <label className="cb-label" htmlFor="cb-pay-amt">
          Amount paid (record full amount received)
        </label>
        <input
          id="cb-pay-amt"
          type="number"
          min="0"
          step="0.01"
          className="cb-input"
          value={paymentDraft}
          onChange={(e) => setPaymentDraft(e.target.value)}
        />
        <div className="cb-modal-actions">
          <button type="button" className="cb-btn cb-btn-muted" onClick={() => setSelected(null)}>
            Cancel
          </button>
          <button
            type="button"
            className="cb-btn cb-btn-primary"
            disabled={saveBusy || !selected?.billing?.id}
            onClick={async () => {
              const amt = Number(paymentDraft);
              if (!Number.isFinite(amt) || amt < 0) {
                window.alert("Enter a valid amount.");
                return;
              }
              setSaveBusy(true);
              try {
                const updated = await updateBillingPaymentBackend(selected.billing.id, { amountPaid: amt });
                setSelected(updated);
                await load();
              } catch (e) {
                window.alert(e?.message || "Update failed.");
              } finally {
                setSaveBusy(false);
              }
            }}
          >
            {saveBusy ? "Saving…" : "Save payment"}
          </button>
        </div>
      </Modal>

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
