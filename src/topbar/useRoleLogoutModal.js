import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearStoredAuthToken,
  GUEST_DISPLAY_NAME_KEY,
  GUEST_EMAIL_KEY,
  logoutUser,
} from "../api/authApi";

export function useRoleLogoutModal() {
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const navigate = useNavigate();

  const requestLogout = useCallback(() => setLogoutModalOpen(true), []);
  const closeLogoutModal = useCallback(() => setLogoutModalOpen(false), []);

  const confirmLogout = useCallback(() => {
    setLogoutModalOpen(false);
    void (async () => {
      await logoutUser();
      try {
        sessionStorage.removeItem(GUEST_EMAIL_KEY);
        sessionStorage.removeItem(GUEST_DISPLAY_NAME_KEY);
      } catch {
        /* ignore */
      }
      clearStoredAuthToken();
      navigate("/login");
    })();
  }, [navigate]);

  return {
    logoutModalOpen,
    requestLogout,
    closeLogoutModal,
    confirmLogout,
  };
}
