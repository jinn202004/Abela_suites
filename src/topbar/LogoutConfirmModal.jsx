import { Modal } from "../components/Modal";
import "./LogoutConfirmModal.css";

export function LogoutConfirmModal({ open, onClose, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      placement="center"
      contentOnly
      shellStyle={false}
      panelClassName="logout-confirm-box"
      overlayClassName="logout-confirm-overlay"
      ariaLabel="Confirm log out"
    >
      <h2 id="logout-confirm-title" className="logout-confirm-title">
        Log out?
      </h2>
      <p className="logout-confirm-sub">You will need to sign in again to access your account.</p>
      <div className="logout-confirm-actions">
        <button type="button" className="logout-confirm-cancel" onClick={() => onClose?.()}>
          Cancel
        </button>
        <button type="button" className="logout-confirm-ok" onClick={() => onConfirm?.()}>
          Log out
        </button>
      </div>
    </Modal>
  );
}
