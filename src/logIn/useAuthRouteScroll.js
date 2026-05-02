import { useEffect } from "react";
import "./authRouteScroll.css";

/** Re-enable normal page scroll on auth routes (global admin/frontdesk CSS locks the shell). */
export function useAuthRouteScroll() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevHeight = body.style.height;
    html.classList.add("abela-auth-scroll");
    body.style.overflow = "visible";
    body.style.height = "auto";
    return () => {
      html.classList.remove("abela-auth-scroll");
      body.style.overflow = prevOverflow;
      body.style.height = prevHeight;
    };
  }, []);
}
