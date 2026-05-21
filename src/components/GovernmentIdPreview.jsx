import { resolveGovernmentIdUrl } from "../guests/guestBookingIdPhoto";

/**
 * Government ID card for reservation detail modals (guest, front desk, admin).
 * @param {{ booking?: object | null, title?: string }} props
 */
export default function GovernmentIdPreview({ booking, title = "Government ID" }) {
  const src = resolveGovernmentIdUrl(booking);
  return (
    <section className="rdm-card">
      <h4 className="rdm-card__title">{title}</h4>
      <div className="rdm-media-frame rdm-media-frame--tall">
        {src ? (
          <img
            src={src}
            alt="Government ID"
            className="rdm-media-img"
            decoding="async"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const parent = el.parentElement;
              if (parent && !parent.querySelector(".rdm-media-placeholder")) {
                const ph = document.createElement("div");
                ph.className = "rdm-media-placeholder";
                ph.textContent = "Government ID image unavailable";
                parent.appendChild(ph);
              }
            }}
          />
        ) : (
          <div className="rdm-media-placeholder">No government ID uploaded</div>
        )}
      </div>
    </section>
  );
}
