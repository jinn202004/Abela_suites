import { paymentMethodDisplayLabel } from "./reservationDetailsHelpers";

/**
 * Always-visible proof-of-payment block with image or neutral placeholder.
 */
export function ReservationProofPreview({ booking, proofSrc, className = "" }) {
  const methodLabel = paymentMethodDisplayLabel(booking);
  const hasImg = !!proofSrc;

  return (
    <section className={`rdm-card rdm-card--proof ${className}`.trim()} aria-labelledby="rdm-proof-heading">
      <h4 id="rdm-proof-heading" className="rdm-card__title">
        Proof of Payment
      </h4>
      <p className="rdm-card__sub">Method: {methodLabel}</p>
      <div className={`rdm-proof-frame${hasImg ? " rdm-proof-frame--has-img" : ""}`}>
        {hasImg ? (
          <img src={proofSrc} alt="Uploaded payment proof" className="rdm-proof-img" decoding="async" />
        ) : (
          <div className="rdm-proof-placeholder" role="status">
            No payment proof uploaded
          </div>
        )}
      </div>
    </section>
  );
}
