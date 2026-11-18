import { Modal } from "../components/Modal";
import { paymentProofImageSrc } from "../components/reservationDetailsHelpers";
import { getOnlineOrderStatusMeta } from "./cashierOnlineOrdersUtils";

const fmt = (n) =>
  "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_ACTIONS = [
  { status: "accepted", label: "Accept" },
  { status: "cancelled", label: "Reject", danger: true },
];

export default function OnlineOrderDetailModal({ order, onClose, onStatusChange, statusBusy }) {
  if (!order) return null;

  const statusMeta = getOnlineOrderStatusMeta(order.statusRaw);
  const proofSrc = paymentProofImageSrc(order.paymentProofData);

  const footer = (
    <div className="oo-modal-actions">
      {STATUS_ACTIONS.map((action) => {
        const isCurrent = order.statusRaw === action.status;
        return (
          <button
            key={action.status}
            type="button"
            className={`oo-status-action${action.danger ? " oo-status-action--danger" : ""}${isCurrent ? " oo-status-action--current" : ""}`}
            disabled={statusBusy || isCurrent}
            onClick={() => onStatusChange?.(order.id, action.status)}
          >
            {action.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <Modal
      open
      onClose={onClose}
      title="Order Details"
      size="xl"
      placement="top"
      panelClassName="oo-detail-modal"
      bodyClassName="oo-detail-modal__body"
      footer={footer}
    >
      <div className="oo-detail-grid">
        <section className="oo-detail-section" aria-label="Guest information">
          <h3 className="oo-detail-section__title">Guest Information</h3>
          <dl className="oo-detail-meta">
            <div className="oo-detail-meta__row">
              <dt>Guest Name</dt>
              <dd>{order.guestName}</dd>
            </div>
            <div className="oo-detail-meta__row">
              <dt>Room Number</dt>
              <dd>{order.roomNumber}</dd>
            </div>
            {order.bookingId ? (
              <div className="oo-detail-meta__row">
                <dt>Booking ID</dt>
                <dd className="oo-detail-meta__mono">{order.bookingId}</dd>
              </div>
            ) : null}
            <div className="oo-detail-meta__row">
              <dt>Contact Number</dt>
              <dd>{order.guestPhone}</dd>
            </div>
            <div className="oo-detail-meta__row">
              <dt>Order Number</dt>
              <dd>{order.number}</dd>
            </div>
            <div className="oo-detail-meta__row">
              <dt>Date &amp; Time Ordered</dt>
              <dd>{order.dateTimeLabel}</dd>
            </div>
            <div className="oo-detail-meta__row">
              <dt>Order Status</dt>
              <dd>
                <span className={`oo-status-badge oo-status-${order.statusKey}`}>
                  {statusMeta.emoji ? `${statusMeta.emoji} ` : ""}
                  {order.status}
                </span>
              </dd>
            </div>
            <div className="oo-detail-meta__row">
              <dt>Payment</dt>
              <dd>
                <span className={`oh-pay-badge oh-pay-${order.paymentKey}`}>{order.payment}</span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="oo-detail-section" aria-label="Ordered items">
          <h3 className="oo-detail-section__title">Ordered Items</h3>
          <div className="oo-items-table-wrap">
            <table className="oo-items-table">
              <thead>
                <tr>
                  <th>Dish Image</th>
                  <th>Dish Name</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Special Instructions</th>
                  <th>Total Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={`${item.menuItemId || item.name}-${idx}`}>
                    <td>
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="oo-dish-thumb" loading="lazy" />
                      ) : (
                        <span className="oo-dish-thumb oo-dish-thumb--placeholder" aria-hidden>
                          —
                        </span>
                      )}
                    </td>
                    <td className="oo-dish-name">{item.name}</td>
                    <td>{item.qty}</td>
                    <td>{fmt(item.price)}</td>
                    <td className="oo-instructions">{item.specialInstructions}</td>
                    <td>{fmt(item.price * item.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="oo-detail-totals">
        <div className="oo-detail-totals__row">
          <span>Subtotal</span>
          <span>{fmt(order.subtotal)}</span>
        </div>
        <div className="oo-detail-totals__row">
          <span>Service Charge</span>
          <span>{fmt(order.serviceCharge)}</span>
        </div>
        <div className="oo-detail-totals__row">
          <span>Tax</span>
          <span>{fmt(order.taxAmount)}</span>
        </div>
        <div className="oo-detail-totals__row oo-detail-totals__row--grand">
          <span>Grand Total</span>
          <span>{fmt(order.total)}</span>
        </div>
      </div>

      {proofSrc ? (
        <div className="oo-payment-proof">
          <p className="oo-payment-proof__label">GCash payment proof</p>
          <img src={proofSrc} alt="Payment proof" className="oo-payment-proof__img" />
        </div>
      ) : null}
    </Modal>
  );
}
