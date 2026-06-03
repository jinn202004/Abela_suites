import { useEffect, useState } from "react";
import { resolveGovernmentIdUrl } from "../guests/guestBookingIdPhoto";

/**
 * Government ID card for reservation detail modals (guest, front desk, admin).
 * @param {{ booking?: object | null, title?: string }} props
 */
export default function GovernmentIdPreview({ booking, title = "Government ID" }) {
  const src = resolveGovernmentIdUrl(booking);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const placeholder = broken
    ? "Government ID image unavailable"
    : "No government ID uploaded";

  return (
    <section className="rdm-card">
      <h4 className="rdm-card__title">{title}</h4>
      <div className="rdm-media-frame rdm-media-frame--tall">
        {src && !broken ? (
          <img
            src={src}
            alt="Government ID"
            className="rdm-media-img"
            decoding="async"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="rdm-media-placeholder">{placeholder}</div>
        )}
      </div>
    </section>
  );
}
