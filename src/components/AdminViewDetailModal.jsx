import "./AdminViewDetailModal.css";

/**
 * Read-only admin item details (reuses room-management modal chrome).
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {string} props.title
 * @param {import("react").ReactNode} props.children
 * @param {string} [props.className] — extra class on `.rm-modal`
 */
export function AdminViewDetailModal({ open, onClose, title, children, className = "" }) {
  if (!open) return null;
  const modalClass = ["rm-modal", "admin-view-detail-modal", className].filter(Boolean).join(" ");
  return (
    <div
      className="rm-modal-backdrop active"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={modalClass}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-view-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rm-modal-header">
          <h2 className="rm-modal-title" id="admin-view-detail-title">
            {title}
          </h2>
          <button type="button" className="rm-modal-close" onClick={onClose} aria-label="Close">
            &#x2715;
          </button>
        </div>
        <div className="rm-modal-body admin-view-detail-body">{children}</div>
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.label
 * @param {import("react").ReactNode} [props.children]
 * @param {import("react").ReactNode} [props.value]
 */
export function AdminDetailRow({ label, value, children }) {
  const content = children ?? value ?? "—";
  return (
    <div className="view-item-row">
      <strong>{label}:</strong> {content}
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} [props.src]
 * @param {string} [props.alt]
 */
export function AdminDetailHeroImage({ src, alt = "" }) {
  const url = String(src ?? "").trim();
  if (!url) return null;
  return (
    <div className="admin-view-detail-hero">
      <img src={url} alt={alt || "Item photo"} />
    </div>
  );
}
