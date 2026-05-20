import { useState, useCallback, useId } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../components/Modal";
import { getFrontdeskNotificationBookingPath } from "./staffNotificationUtils";
import "./StaffNotificationDetailModal.css";

export function useStaffNotificationDetail() {
  const [notification, setNotification] = useState(null);
  const openStaffNotification = useCallback((n) => {
    setNotification(n && typeof n === "object" ? n : null);
  }, []);
  const closeStaffNotification = useCallback(() => setNotification(null), []);
  return { staffNotification: notification, openStaffNotification, closeStaffNotification };
}

function formatBookingTypeLabel(raw) {
  const t = String(raw || "").trim().toLowerCase();
  if (t === "room") return "Room reservation";
  if (t === "event") return "Event booking";
  if (!t) return "—";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Read-only summary of a bell notification; optional "Open reservation" for booking-linked items.
 * @param {{ notification: object | null, onClose: () => void, onOpenReservation?: (n: object) => void }} props
 */
export function StaffNotificationDetailModal({ notification, onClose, onOpenReservation }) {
  const navigate = useNavigate();
  const titleId = useId();
  const open = !!notification;
  const bookingId = notification ? String(notification.bookingId || "").trim() : "";
  const path = notification ? getFrontdeskNotificationBookingPath(notification) : null;

  const hint = (() => {
    const msg = `${String(notification?.msg || "")} ${String(notification?.detail || "")}`.toLowerCase();
    if (msg.includes("reject") || msg.includes("declined")) {
      return "This alert relates to a rejected or declined outcome.";
    }
    if (msg.includes("approv") || msg.includes("confirmed")) {
      return "This alert relates to an approved or confirmed booking.";
    }
    if (msg.includes("confirmation") || msg.includes("pending") || msg.includes("needs your")) {
      return "Open the reservation screen to review, approve, or reject when applicable.";
    }
    return "";
  })();

  const handleOpenReservation = () => {
    if (!notification) return;
    if (typeof onOpenReservation === "function") {
      onOpenReservation(notification);
      onClose();
      return;
    }
    if (path) navigate(path);
    onClose();
  };

  const detailLine = notification?.detail ? String(notification.detail).trim() : "";
  const timeLine = notification?.time ? String(notification.time).trim() : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      hideHeader
      size="md"
      placement="center"
      panelClassName="staff-notif-detail-modal"
      bodyClassName="staff-notif-detail-modal__body-shell"
      ariaLabel="Notification"
      footer={
        <div className="staff-notif-detail-footer">
          <button type="button" className="staff-notif-btn staff-notif-btn--ghost" onClick={onClose}>
            Close
          </button>
          {bookingId ? (
            <button type="button" className="staff-notif-btn staff-notif-btn--primary" onClick={handleOpenReservation}>
              Open reservation
            </button>
          ) : null}
        </div>
      }
    >
      <header className="staff-notif-detail-header">
        <h2 className="staff-notif-detail-title" id={titleId}>
          Notification
        </h2>
        <button type="button" className="staff-notif-detail-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="staff-notif-detail-ornament" aria-hidden>
          <span className="staff-notif-detail-ornament-line" />
          <span className="staff-notif-detail-ornament-diamond" />
          <span className="staff-notif-detail-ornament-line" />
        </div>
      </header>

      <div className="staff-notif-detail-body" aria-labelledby={titleId}>
        <p className="staff-notif-detail-msg">{String(notification?.msg || "No message.")}</p>

        {detailLine || timeLine ? (
          <div className="staff-notif-detail-meta">
            {detailLine ? <span className="staff-notif-detail-meta-item">{detailLine}</span> : null}
            {detailLine && timeLine ? (
              <span className="staff-notif-detail-meta-sep" aria-hidden>
                ·
              </span>
            ) : null}
            {timeLine ? <span className="staff-notif-detail-meta-item">{timeLine}</span> : null}
          </div>
        ) : null}

        {bookingId ? (
          <dl className="staff-notif-detail-grid">
            <dt className="staff-notif-detail-label">Booking ID</dt>
            <dd className="staff-notif-detail-value staff-notif-detail-value--mono">{bookingId}</dd>
            {notification?.bookingType ? (
              <>
                <dt className="staff-notif-detail-label">Type</dt>
                <dd className="staff-notif-detail-value">
                  {formatBookingTypeLabel(notification.bookingType)}
                </dd>
              </>
            ) : null}
          </dl>
        ) : (
          <p className="staff-notif-detail-note">This notification is not linked to a specific booking.</p>
        )}

        {hint ? <p className="staff-notif-detail-hint">{hint}</p> : null}
      </div>
    </Modal>
  );
}
