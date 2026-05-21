import { useEffect } from "react";
import { Modal } from "./Modal";
import "./StaffSuccessModal.css";

const SuccessCheckIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

/**
 * Centered success dialog — same hierarchy as admin_1 modals (header / body / footer).
 * Used for housekeeping completion and other staff flows.
 */
export function StaffSuccessModal({
  open,
  onClose,
  title = "Completed",
  message = "",
  confirmLabel = "OK",
  autoCloseMs = 3500,
}) {
  useEffect(() => {
    if (!open || !autoCloseMs) return undefined;
    const t = window.setTimeout(() => onClose?.(), autoCloseMs);
    return () => window.clearTimeout(t);
  }, [open, autoCloseMs, onClose]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      placement="center"
      panelClassName="staff-success-modal"
      overlayClassName="staff-success-modal-overlay"
      bodyClassName="staff-success-modal__body-wrap"
      footer={
        <div className="staff-success-modal__footer">
          <button type="button" className="staff-success-modal__ok" onClick={onClose}>
            {confirmLabel}
          </button>
        </div>
      }
      ariaLabel={title}
    >
      <div className="staff-success-modal__content">
        <div className="staff-success-modal__icon">
          <SuccessCheckIcon />
        </div>
        {message ? <p className="staff-success-modal__message">{message}</p> : null}
      </div>
    </Modal>
  );
}
