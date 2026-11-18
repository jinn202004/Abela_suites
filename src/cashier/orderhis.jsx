import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TOPBAR } from "../topbar/roleTopbarData";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import StaffTopbarActions from "../topbar/StaffTopbarActions";
import { useCashierSidebarLayout } from "./useCashierSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import CashierSidebarToggle from "./CashierSidebarToggle";
import CashierSidebar from "./CashierSidebar";
import "./orderhis.css";
import "./cashier-sidebar-shared.css";
import "../admin_1/adminClickable.css";
import { handleAdminRowActivate, handleAdminRowKeyDown } from "../admin_1/adminClickUtils";
import { useCashierUnifiedBell } from "./useCashierUnifiedBell";
import { paymentProofImageSrc } from "../components/reservationDetailsHelpers";

const HOTEL = {
  name:    "Abela Suites",
  address: "Barangay Linggangao near\nBalingasag bus terminal fronting\nbalingasag pasalubong center,\nBalingasag, Philippines, 9005",
};

const ROWS_PER_PAGE = 10;

// ── Helpers ────────────────────────────────────────────────────────────
const fmt = n => "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2 });

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

  const timeStr     = order.timeLabel || "—";
  const subtotalRaw = (order.items || []).reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = subtotalRaw - order.total;
  const proofSrc = paymentProofImageSrc(order.paymentProofData);

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
                <span className={`oh-pay-badge oh-pay-${order.paymentKey || String(order.payment).toLowerCase()}`}>
                  {order.payment}
                </span>
              </span>
            </div>
            {order.transactionId ? (
              <div className="ri-total-row">
                <span>Transaction ID</span>
                <span>{order.transactionId}</span>
              </div>
            ) : null}
            {order.paymentDate ? (
              <div className="ri-total-row">
                <span>Payment Date</span>
                <span>{order.paymentDate}</span>
              </div>
            ) : null}
            {proofSrc ? (
              <div className="oh-gcash-proof-block">
                <p className="oh-gcash-proof-label">GCash proof of payment</p>
                <a href={proofSrc} target="_blank" rel="noopener noreferrer" className="oh-gcash-proof-link">
                  <img src={proofSrc} alt="GCash payment proof" className="oh-gcash-proof-img" />
                </a>
              </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export default function OrderHistory() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { topbarProfile } = useTopbarUserProfile("cashier");
  const {
    orders,
    ordersLoading,
    ordersError,
    bellNotifications,
    hasUnreadBell,
    handleNotifItemClick,
  } = useCashierUnifiedBell({
    displayName: topbarProfile?.name || TOPBAR.cashier.profile.name,
    onOrderNotificationClick: (n) => {
      if (n?.orderSource === "guest") {
        navigate("/cashier/orders", { state: { focusOrderId: n.orderId, fromNotification: true } });
        return;
      }
      navigate("/order-history", { state: { focusOrderId: n.orderId, fromNotification: true } });
    },
    onMenuNotificationRead: (n) =>
      navigate("/cashier", { state: { focusMenuItemId: n.menuItemId, fromNotification: true } }),
  });
  const [searchQuery,   setSearchQuery]   = useState("");
  const [currentPage,   setCurrentPage]   = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

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
    const focusOrderId = location.state?.focusOrderId;
    if (!focusOrderId) return;
    const hit = orders.find((o) => String(o.id) === String(focusOrderId));
    if (hit) {
      setSelectedOrder(hit);
      // Jump to the page that contains the order instead of filling search.
      const idx = orders.findIndex((o) => String(o.id) === String(focusOrderId));
      if (idx >= 0) {
        setCurrentPage(Math.floor(idx / ROWS_PER_PAGE) + 1);
      }
    }
    navigate("/order-history", { replace: true, state: {} });
  }, [location.state, orders, navigate]);

  // ── Filter ──
  const q = searchQuery.trim().toLowerCase();
  const filtered = orders.filter((o) => {
    if (!q) return true;
    const itemHay = (o.items || []).some((it) => String(it.name).toLowerCase().includes(q));
    return (
      o.customer.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q) ||
      o.payment.toLowerCase().includes(q) ||
      String(o.number).toLowerCase().includes(q) ||
      String(o.id).toLowerCase().includes(q) ||
      o.date.includes(q) ||
      itemHay
    );
  });

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paged      = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  function handleSearchChange(val) {
    setSearchQuery(val);
    setCurrentPage(1);
  }

  const asideProps = {
    shellClassName,
    asideStyle,
    logoWrapStyle,
    logoImgStyle,
    closeMobileSidebar,
  };

  return (
    <>
      {isMobile && mobileSidebarOpen && (
        <div
          className="cashier-mobile-backdrop"
          onClick={closeMobileSidebar}
          aria-hidden
        />
      )}
      {isMobile && mobileSidebarOpen ? <CashierSidebar {...asideProps} isMobile /> : null}
      <RailPortalShell
        rootClassName="cashier-order-history-page"
        shellClassName={shellClassName}
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%", background: "#f5f0e8" }}
        mainStyle={mainStyle}
        sidebar={!isMobile ? <CashierSidebar {...asideProps} isMobile={false} /> : null}
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

          <StaffTopbarActions
            roleKey="cashier"
            notifications={bellNotifications}
            dot={hasUnreadBell ? "active" : "muted"}
            onNotificationItemClick={handleNotifItemClick}
            onRequestLogout={requestLogout}
          />
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="content">
          <div className="oh-wrap">
            {ordersError ? (
              <p className="oh-api-banner oh-api-banner--err" role="status">
                {ordersError}
              </p>
            ) : null}

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
                      <th>Total</th>
                      <th>Received</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersLoading ? (
                      <tr>
                        <td colSpan={5} className="oh-empty">
                          Loading orders…
                        </td>
                      </tr>
                    ) : paged.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="oh-empty">No orders found.</td>
                      </tr>
                    ) : (
                      paged.map((order) => (
                        <tr
                          key={order.id}
                          className="admin-clickable-row"
                          tabIndex={0}
                          role="button"
                          aria-label={`View receipt for order ${order.number}`}
                          onClick={(e) =>
                            handleAdminRowActivate(e, () => setSelectedOrder(order))
                          }
                          onKeyDown={(e) =>
                            handleAdminRowKeyDown(e, () => setSelectedOrder(order))
                          }
                        >
                          <td>{order.number}</td>
                          <td>{order.date}</td>
                          <td>₱{order.total.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>₱{order.received.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>
                            <span className={`oh-pay-badge oh-pay-${order.paymentKey}`}>
                              {order.payment}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="oh-pagination">
                <span className="oh-showing">
                  Showing {filtered.length} of {orders.length} orders
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
