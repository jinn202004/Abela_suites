import { useState, useEffect, useRef } from "react";
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
import "./orderhis.css";
import "./cashier-sidebar-shared.css";

// ── Sample Data ────────────────────────────────────────────────────────
const initialOrders = [
  {
    number: 1, date: "24-02-2026", customer: "James",
    cashier: "Joanah Faye Cultura", total: 250, received: 250,
    payment: "Cash", discount: "None",
    items: [{ name: "Sinigang na Bangus", qty: 1, price: 250 }],
  },
  {
    number: 2, date: "24-02-2026", customer: "Jane",
    cashier: "Joanah Faye Cultura", total: 520, received: 700,
    payment: "GCash", discount: "None",
    items: [
      { name: "Steamed Rice", qty: 2, price: 50 },
      { name: "Bulalo",       qty: 1, price: 420 },
    ],
  },
  {
    number: 3, date: "24-02-2026", customer: "Jay",
    cashier: "Joanah Faye Cultura", total: 250, received: 250,
    payment: "Cash", discount: "None",
    items: [{ name: "Sinigang na Bangus", qty: 1, price: 250 }],
  },
];

const HOTEL = {
  name:    "Abela Suites",
  address: "Barangay Linggangao near\nBalingasag bus terminal fronting\nbalingasag pasalubong center,\nBalingasag, Philippines, 9005",
};

const ROWS_PER_PAGE = 10;

// ── Helpers ────────────────────────────────────────────────────────────
const fmt = n => "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2 });

// ── Icons ──────────────────────────────────────────────────────────────
const POSIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM5.82 6h14.18l-1.5 7H7.5L5.82 6zM3 2H1v2h2l3.6 7.59-1.36 2.45C5.09 14.66 5 15.07 5 15.5 5 16.88 6.12 18 7.5 18h13v-2H7.83c-.17 0-.3-.13-.3-.3l.03-.12.9-1.58H18c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 22.5 5H5.21L4.27 3H1v2h2l3.6 7.59z"/>
  </svg>
);

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const SettingsNavIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const BillingNavIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

// ── Receipt Modal ──────────────────────────────────────────────────────
function ReceiptModal({ order, onClose }) {
  // Close on Escape key
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Prevent background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const now         = new Date();
  const timeStr     = now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const subtotalRaw = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = subtotalRaw - order.total;

  return (
    // FIX: use inline styles / className toggling instead of CSS display:none/flex
    // The backdrop is only rendered when selectedOrder is set, so no need for .active toggle
    <div className="oh-modal-backdrop" onClick={onClose}>
      <div className="oh-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="oh-modal-header">
          <h2 className="oh-modal-title">Receipt</h2>
          <button className="oh-modal-close" onClick={onClose}>&#x2715;</button>
        </div>

        {/* Body */}
        <div className="oh-modal-body">

          {/* Hotel info */}
          <div className="ri-hotel-block">
            <p className="ri-hotel-name">{HOTEL.name}</p>
            <p className="ri-hotel-addr">
              {HOTEL.address.split("\n").map((line, i) => (
                <span key={i}>{line}<br /></span>
              ))}
            </p>
            <p className="ri-meta">Date: {order.date}</p>
            <p className="ri-meta">Time: {timeStr}</p>
            <p className="ri-meta">Cashier: {order.cashier}</p>
            <p className="ri-meta">Customer: {order.customer}</p>
          </div>

          <hr className="ri-divider" />

          {/* Items */}
          <p className="ri-items-heading">Items Purchased</p>
          <table className="ri-items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i}>
                  <td className="ri-item-name">{item.name} x{item.qty}</td>
                  <td className="ri-item-price">{fmt(item.price)}</td>
                  <td className="ri-item-sub">{fmt(item.price * item.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <hr className="ri-divider" />

          {/* Totals */}
          <div className="ri-totals">
            <div className="ri-total-row">
              <span>Subtotal</span><span>{fmt(subtotalRaw)}</span>
            </div>
            <div className="ri-total-row">
              <span>Discount ({order.discount})</span>
              <span>{fmt(discountAmt >= 0 ? discountAmt : 0)}</span>
            </div>
            <div className="ri-total-row ri-grand-total">
              <span>Total</span><span>{fmt(order.total)}</span>
            </div>
            <div className="ri-total-row">
              <span>Amount Received</span><span>{fmt(order.received)}</span>
            </div>
            <div className="ri-total-row">
              <span>Change</span>
              <span>{fmt(Math.max(0, order.received - order.total))}</span>
            </div>
            <div className="ri-total-row" style={{ marginTop: 4 }}>
              <span>Payment Method</span>
              <span>
                <span className={`oh-pay-badge oh-pay-${order.payment.toLowerCase()}`}>
                  {order.payment}
                </span>
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export default function OrderHistory() {
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { topbarProfile } = useTopbarUserProfile("cashier");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [currentPage,   setCurrentPage]   = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

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

  useEffect(() => {
    const onDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // ── Filter ──
  const q = searchQuery.trim().toLowerCase();
  const filtered = initialOrders.filter(o =>
    o.customer.toLowerCase().includes(q) ||
    o.cashier.toLowerCase().includes(q)  ||
    o.payment.toLowerCase().includes(q)  ||
    String(o.number).includes(q)         ||
    o.date.includes(q)
  );

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paged      = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  function handleSearchChange(val) {
    setSearchQuery(val);
    setCurrentPage(1);
  }

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
        rootClassName="cashier-order-history-page"
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
              to="/cashier"
              className="sidebar-logo"
              title="POS"
              style={logoWrapStyle}
              onClick={() => { if (isMobile) closeMobileSidebar(); }}
            >
              <img
                src="/logo.png"
                alt="Abela Suites Logo"
                className="sidebar-logo-img"
                decoding="async"
                style={logoImgStyle}
              />
            </Link>
            <nav className="sidebar-nav">
              <NavLink
                to="/cashier-billing"
                end
                onClick={() => { if (isMobile) closeMobileSidebar(); }}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon"><BillingNavIcon /></span>
                <span>Guest billing</span>
              </NavLink>
              <NavLink
                to="/cashier"
                end
                onClick={() => { if (isMobile) closeMobileSidebar(); }}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon"><POSIcon /></span>
                <span>POS</span>
              </NavLink>
              <NavLink
                to="/order-history"
                end
                onClick={() => { if (isMobile) closeMobileSidebar(); }}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon"><HistoryIcon /></span>
                <span>Order History</span>
              </NavLink>
              <NavLink
                to="/cashier-settings"
                end
                onClick={() => { if (isMobile) closeMobileSidebar(); }}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <span className="nav-icon"><SettingsNavIcon /></span>
                <span>Settings</span>
              </NavLink>
            </nav>
          </aside>
        }
      >
        {/* ── TOPBAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <CashierSidebarToggle
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              mobileSidebarOpen={mobileSidebarOpen}
            />
            <span className="breadcrumb-title">Order History</span>
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
              <span
                className="user-arrow"
                style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              >
                &#9662;
              </span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={topbarProfile}
                profilePath={TOPBAR.cashier.profilePath}
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
          <div className="oh-wrap">

            {/* Top row: title + search */}
            <div className="oh-top-row">
              <div className="oh-heading">
                <h2 className="oh-title">Overall Orders</h2>
                <p className="oh-sub">View customer orders</p>
              </div>
              <div className="oh-search-wrap">
                <svg className="oh-search-icon" viewBox="0 0 24 24" fill="none"
                  stroke="#aaa" strokeWidth="2" width="16" height="16">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  className="oh-search-input"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                />
              </div>
            </div>

            {/* Table card */}
            <div className="oh-card">
              <div className="oh-table-wrap">
                <table className="oh-table">
                  <thead>
                    <tr>
                      <th>Number</th>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Cashier</th>
                      <th>Total</th>
                      <th>Received</th>
                      <th>Payment</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="oh-empty">No orders found.</td>
                      </tr>
                    ) : paged.map((order, i) => (
                      <tr key={i}>
                        <td>{order.number}</td>
                        <td>{order.date}</td>
                        <td>{order.customer}</td>
                        <td>{order.cashier}</td>
                        <td>₱{order.total.toLocaleString()}</td>
                        <td>₱{order.received.toLocaleString()}</td>
                        <td>
                          <span className={`oh-pay-badge oh-pay-${order.payment.toLowerCase()}`}>
                            {order.payment}
                          </span>
                        </td>
                        <td>
                          <button
                            className="oh-eye-btn"
                            title="View Receipt"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <EyeIcon />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="oh-pagination">
                <span className="oh-showing">
                  Showing {filtered.length} of {initialOrders.length} orders
                </span>
                <div className="oh-page-controls">
                  <button
                    className="oh-page-btn"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  >Prev</button>
                  <span className="oh-page-info">Page {safePage} of {totalPages}</span>
                  <button
                    className="oh-page-btn"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  >Next</button>
                </div>
              </div>
            </div>

          </div>
        </main>
      </RailPortalShell>

      {/* ── RECEIPT MODAL ── */}
      {/* FIX: conditionally render instead of CSS display toggle — React handles mounting/unmounting */}
      {selectedOrder && (
        <ReceiptModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
