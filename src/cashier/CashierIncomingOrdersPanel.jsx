import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const fmt = (n) =>
  "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const ACTIVE_STATUSES = new Set(["pending", "accepted", "preparing", "ready"]);
const ROWS_PER_PAGE = 5;

/**
 * Live guest orders on the POS dashboard — appears as soon as a guest confirms.
 */
export default function CashierIncomingOrdersPanel({
  orders = [],
  loading = false,
  error = "",
  onViewOrder,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const active = orders.filter((o) => ACTIVE_STATUSES.has(o.statusRaw));
  const totalPages = Math.max(1, Math.ceil(active.length / ROWS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paged = active.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);
  const rangeFrom = active.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1;
  const rangeTo = Math.min(safePage * ROWS_PER_PAGE, active.length);

  useEffect(() => {
    setCurrentPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  return (
    <section className="pos-incoming-orders" aria-label="Incoming online guest orders">
      <div className="pos-incoming-orders__head">
        <div>
          <h2 className="pos-incoming-orders__title">Incoming Online Orders</h2>
          <p className="pos-incoming-orders__sub">
            Guest portal orders appear here automatically when confirmed.
          </p>
        </div>
        <Link to="/cashier/orders" className="pos-incoming-orders__link">
          View all orders
        </Link>
      </div>

      {error ? (
        <p className="pos-incoming-orders__warn" role="alert">
          {error}
          {error.toLowerCase().includes("sign in") ? (
            <span> Log out and sign in again with your cashier account (e.g. cashier@abela.demo).</span>
          ) : null}
        </p>
      ) : null}

      <div className="oh-card pos-incoming-orders__card">
        <div className="oh-table-wrap">
          <table className="oh-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Guest</th>
                <th>Room</th>
                <th>Time</th>
                <th>Total</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="oh-empty">
                    Loading online orders…
                  </td>
                </tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={7} className="oh-empty">
                    No pending online orders right now.
                  </td>
                </tr>
              ) : (
                paged.map((order) => (
                  <tr key={order.id} className="pos-incoming-orders__row--new">
                    <td>{order.number}</td>
                    <td>{order.guestName}</td>
                    <td>{order.roomNumber}</td>
                    <td>{order.dateTimeLabel}</td>
                    <td>{fmt(order.total)}</td>
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
                        onClick={() => onViewOrder?.(order)}
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

        <div className="pos-incoming-orders__pagination" aria-label="Incoming orders pagination">
          <span className="pos-incoming-orders__pagination-info">
            {active.length === 0
              ? "Showing 0 orders"
              : `Showing ${rangeFrom}–${rangeTo} of ${active.length} orders`}
          </span>
          <div className="pos-incoming-orders__page-controls">
            <button
              type="button"
              className="pos-incoming-orders__page-btn"
              disabled={safePage <= 1 || loading || active.length === 0}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="pos-incoming-orders__page-num">
              Page {safePage} of {totalPages}
            </span>
            <button
              type="button"
              className="pos-incoming-orders__page-btn"
              disabled={safePage >= totalPages || loading || active.length === 0}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
