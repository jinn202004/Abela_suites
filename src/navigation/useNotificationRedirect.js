import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getNotificationRedirectPath } from "./notificationRedirect";

/**
 * Navigate directly to the page for a notification (no detail modal).
 *
 * @param {"guest"|"admin"|"frontdesk"|"cashier"|"housekeeping"|string} role
 * @param {{ onBeforeNavigate?: (n: object) => void, customHandler?: (n: object) => boolean }} [options]
 *   customHandler — return true if navigation was handled (skip default path)
 */
export function useNotificationRedirect(role, options = {}) {
  const navigate = useNavigate();
  const { onBeforeNavigate, customHandler } = options;

  return useCallback(
    (n) => {
      if (!n || typeof n !== "object") return;
      onBeforeNavigate?.(n);
      if (typeof customHandler === "function" && customHandler(n)) return;
      const path = getNotificationRedirectPath(n, role);
      if (path) navigate(path);
    },
    [role, navigate, onBeforeNavigate, customHandler],
  );
}
