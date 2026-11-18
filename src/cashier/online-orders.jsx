import { useState, useEffect, useMemo } from "react";
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
import { useCashierUnifiedBell } from "./useCashierUnifiedBell";
import { useCashierOnlineOrders } from "./useCashierOnlineOrders";
import OnlineOrderDetailModal from "./OnlineOrderDetailModal";
import { patchRestaurantOrderStatusBackend } from "../api/restaurantOrdersApi";
import { mapOnlineGuestOrderRow } from "./cashierOnlineOrdersUtils";
import "./orderhis.css";
import "./onlineOrders.css";
import "./cashier-sidebar-shared.css";

const ROWS_PER_PAGE = 10;
const fmt = (n) =>
  "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function OnlineOrders() {
  const location = useLocation();
  const navigate = useNavigate();
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

  const { orders, loading, error, reload } = useCashierOnlineOrders({ poll: true });
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusBusy, setStatusBusy] = useState(false);

  const { bellNotifications, hasUnreadBell, handleNotifItemClick } = useCashierUnifiedBell({
    displayName: topbarProfile?.name || TOPBAR.cashier.profile.name,
    onMenuNotificationRead: (n) =>
      navigate("/cashier", { state: { focusMenuItemId: n.menuItemId, fromNotification: true } }),
    onOrderNotificationClick: (n) => {
      if (n?.orderSource === "guest" || n?.orderId) {
        const row = orders.find((o) => o.id === n.orderId);
        if (row) setSelectedOrder(row);
        else if (n.orderId) navigate("/cashier/orders", { state: { focusOrderId: n.orderId } });
        return;
      }
      navigate("/order-history", { state: { focusOrderId: n.orderId } });
    },
  });

  useEffect(() => {
    const focusId = String(location.state?.focusOrderId || "").trim();
    if (!focusId || !orders.length) return;
    const row = orders.find((o) => o.id === focusId);
    if (row) setSelectedOrder(row);
  }, [location.state?.focusOrderId, orders]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) => {
      const hay = [
        o.number,
        o.guestName,
        o.roomNumber,
        o.bookingId,
        o.status,
        o.payment,
        o.dateTimeLabel,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [orders, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusChange = async (orderId, status) => {
    setStatusBusy(true);
    try {
      const updated = await patchRestaurantOrderStatusBackend(orderId, status);
      const row = mapOnlineGuestOrderRow(updated);
      setSelectedOrder(row);
      await reload({ silent: true });
    } catch (e) {
      window.alert(e?.message || "Could not update order status.");
    } finally {
      setStatusBusy(false);
    }
  };

  const asideProps = {
    shellClassName,
    asideStyle,
    logoWrapStyle,
    logoImgStyle,
    closeMobileSidebar,
  };

  return (
    <>
      {isMobile && mobileSidebarOpen ? (
        <>
          <div className="cashier-mobile-backdrop" onClick={closeMobileSidebar} aria-hidden />
          <CashierSidebar {...asideProps} isMobile />
        </>
      ) : null}

      <RailPortalShell
        rootClassName="cashier-online-orders-page"
        shellClassName={shellClassName}
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%", background: "#f5f0e8" }}
        mainStyle={mainStyle}
        sidebar={!isMobile ? <CashierSidebar {...asideProps} isMobile={false} /> : null}
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <CashierSidebarToggle
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              mobileSidebarOpen={mobileSidebarOpen}
            />
            <span className="breadcrumb-title">Orders</span>
          </div>
          <StaffTopbarActions
            roleKey="cashier"
            notifications={bellNotifications}
            dot={hasUnreadBell ? "active" : "muted"}
            onNotificationItemClick={handleNotifItemClick}
            onRequestLogout={requestLogout}
          />
        </header>

        <main className="content">
          <div className="oh-wrap">
            {error ? (
              <p className="oh-api-banner oh-api-banner--err" role="status">
                {error}
              </p>
            ) : null}

            <div className="oh-top-row">
              <div className="oh-heading">
                <h2 className="oh-title">Online Guest Orders</h2>
                <p className="oh-sub">Orders submitted through the Guest Portal · updates automatically</p>
              </div>
              <div className="oh-search-wrap">
                <svg
                  className="oh-search-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#aaa"
                  strokeWidth="2"
                  width="16"
                  height="16"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="oh-search-input"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>

            <div className="oh-card">
              <div className="oh-table-wrap">
                <table className="oh-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Guest Name</th>
                      <th>Room Number</th>
                      <th>Date &amp; Time Ordered</th>
                      <th>Number of Items</th>
                      <th>Total Amount</th>
                      <th>Payment Status</th>
                      <th>Order Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={9} className="oh-empty">
                          Loading orders…
                        </td>
                      </tr>
                    ) : paged.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="oh-empty">
                          No online guest orders found.
                        </td>
                      </tr>
                    ) : (
                      paged.map((order) => (
                        <tr key={order.id}>
                          <td>{order.number}</td>
                          <td>{order.guestName}</td>
                          <td>{order.roomNumber}</td>
                          <td>{order.dateTimeLabel}</td>
                          <td>{order.itemCount}</td>
                          <td>{fmt(order.total)}</td>
                          <td>
                            <span className={`oh-pay-badge oh-pay-${order.paymentKey}`}>
                              {order.payment}
                            </span>
                          </td>
                          <td>
                            <span className={`oo-status-badge oo-status-${order.statusKey}`}>
                              {order.statusEmoji ? `${order.statusEmoji} ` : ""}
                              {order.status}
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="oo-view-btn"
                              onClick={() => setSelectedOrder(order)}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="oh-pagination">
                <span className="oh-showing">
                  Showing {filtered.length} of {orders.length} online orders
                </span>
                <div className="oh-page-controls">
                  <button
                    type="button"
                    className="oh-page-btn"
                    disabled={safePage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </button>
                  <span className="oh-page-info">
                    Page {safePage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    className="oh-page-btn"
                    disabled={safePage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </RailPortalShell>

      {selectedOrder ? (
        <OnlineOrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          statusBusy={statusBusy}
        />
      ) : null}

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
