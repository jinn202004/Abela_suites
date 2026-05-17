import { formatPeso } from "./bookingBilling";

export default function BillingPaymentPills({
  total,
  amountPaid,
  balanceDue,
  minimumDownPayment,
  className = "",
}) {
  if (!Number.isFinite(total) || total <= 0) return null;

  return (
    <div className={`billing-payment-pills ${className}`.trim()} aria-label="Payment summary">
      <div className="billing-payment-pills__item billing-payment-pills__item--total">
        <span className="billing-payment-pills__k">Total amount</span>
        <span className="billing-payment-pills__v">{formatPeso(total)}</span>
      </div>
      <div className="billing-payment-pills__item">
        <span className="billing-payment-pills__k">Amount paid</span>
        <span className="billing-payment-pills__v">{formatPeso(amountPaid)}</span>
      </div>
      <div className="billing-payment-pills__item billing-payment-pills__item--balance">
        <span className="billing-payment-pills__k">Remaining balance</span>
        <span className="billing-payment-pills__v">{formatPeso(balanceDue)}</span>
      </div>
      {minimumDownPayment > 0 ? (
        <p className="billing-payment-pills__min">
          Minimum down payment: <strong>{formatPeso(minimumDownPayment)}</strong>
        </p>
      ) : null}
    </div>
  );
}
