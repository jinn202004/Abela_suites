import { createPortal } from "react-dom";
import "./StaffNoticeToast.css";

/**
 * Compact portaled snackbar for non-blocking staff feedback (errors, started, etc.).
 * Portals to document.body so #root flex layout cannot stretch it.
 */
export function StaffNoticeToast({ open, title, message }) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="hk-notice-toast" role="status" aria-live="polite">
      <div className="hk-notice-toast__text">
        {title ? <p className="hk-notice-toast__title">{title}</p> : null}
        {message ? <p className="hk-notice-toast__sub">{message}</p> : null}
      </div>
    </div>,
    document.body,
  );
}
