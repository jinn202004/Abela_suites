import { formatPeso } from './bookingBilling'
import { BILLING_CONFIG } from './billingConfig'
import './billing-summary.css'

/**
 * Itemized billing summary for room or event bookings.
 */
export default function BillingSummary({
  bill,
  title = 'Billing summary',
  showMinimumDown = false,
  className = '',
}) {
  if (!bill?.lines?.length) return null

  return (
    <section className={`bill-summary ${className}`.trim()} aria-live="polite">
      <h3 className="bill-summary__title">{title}</h3>
      {bill.stayLabel ? (
        <p className="bill-summary__meta">
          <span className="bill-summary__meta-label">Stay</span>
          <span className="bill-summary__meta-value">{bill.stayLabel}</span>
        </p>
      ) : null}
      {bill.durationHours != null && bill.durationHours > 0 && !bill.stayLabel ? (
        <p className="bill-summary__meta">
          <span className="bill-summary__meta-label">Duration</span>
          <span className="bill-summary__meta-value">{bill.durationHours} hours</span>
        </p>
      ) : null}
      <dl className="bill-summary__grid">
        {bill.lines.map((line, idx) => {
          const isTotal = line.kind === 'total'
          const isSubtotal = line.kind === 'subtotal'
          const rowClass = [
            'bill-summary__row',
            isTotal ? 'bill-summary__row--total' : '',
            isSubtotal ? 'bill-summary__row--subtotal' : '',
            line.emphasis ? 'bill-summary__row--emphasis' : '',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <div key={`${line.kind}-${idx}`} className={rowClass}>
              <dt>{line.label}</dt>
              <dd>
                {line.detail ? <span className="bill-summary__detail">{line.detail}</span> : null}
                <span className="bill-summary__amount">{formatPeso(line.amount)}</span>
              </dd>
            </div>
          )
        })}
      </dl>
      {showMinimumDown && bill.minimumDownPayment > 0 ? (
        <p className="bill-summary__down">
          Minimum down payment ({Math.round(BILLING_CONFIG.MINIMUM_DOWN_PAYMENT_RATE * 100)}%):{' '}
          <strong>{formatPeso(bill.minimumDownPayment)}</strong>
        </p>
      ) : null}
      {bill.storedTotalOverride ? (
        <p className="bill-summary__note" role="note">
          Total reflects the amount recorded on your booking (may include hotel adjustments).
        </p>
      ) : null}
    </section>
  )
}
