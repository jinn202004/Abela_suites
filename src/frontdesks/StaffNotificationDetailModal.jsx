import { useState, useCallback } from "react";
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

/**
 * Read-only summary of a bell notification; optional "Open reservation" for booking-linked items.
 * @param {{ notification: object | null, onClose: () => void, onOpenReservation?: (n: object) => void }} props
 */
export function StaffNotificationDetailModal({ notification, onClose, onOpenReservation }) {
  const navigate = useNavigate();
  const open = !!notification;
  const bookingId = notification ? String(notification.bookingId || "").trim() : "";
  const path = notification ? getFrontdeskNotificationBookingPath(notification) : null;

  const hint = (() => {
    const msg = `${String(notification?.msg || "")} ${String(notification?.detail || "")}`.toLowerCase();
    if (msg.includes("reject") || msg.includes("declined")) return "This alert relates to a rejected or declined outcome.";
    if (msg.includes("approv") || msg.includes("confirmed")) return "This alert relates to an approved or confirmed booking.";
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Notification"
      size="md"
      placement="center"
      panelClassName="staff-notif-detail-modal"
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
      <div className="staff-notif-detail-body">
        <p className="staff-notif-detail-msg">{String(notification?.msg || "No message.")}</p>
        {notification?.detail ? (
          <p className="staff-notif-detail-sub">{String(notification.detail)}</p>
        ) : null}
        {notification?.time ? (
          <p className="staff-notif-detail-time">{String(notification.time)}</p>
        ) : null}
        {bookingId ? (
          <dl className="staff-notif-detail-dl">
            <div>
              <dt>Booking ID</dt>
              <dd>{bookingId}</dd>
            </div>
            {notification?.bookingType ? (
              <div>
                <dt>Type</dt>
                <dd>{String(notification.bookingType)}</dd>
              </div>
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
