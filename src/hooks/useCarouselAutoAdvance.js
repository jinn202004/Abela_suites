import { useEffect } from "react";

/**
 * Advances the carousel to the next slide on a timer (no arrow click needed).
 * @param {(direction: number) => void} advance — e.g. slide handler with direction `1` for next
 * @param {number} slideCount
 * @param {number} [intervalMs=5000]
 * @param {boolean} [paused=false] — pause timer (e.g. while hovering the carousel)
 */
export function useCarouselAutoAdvance(advance, slideCount, intervalMs = 5000, paused = false) {
  useEffect(() => {
    if (slideCount <= 1 || paused) return;

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      advance(1);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [advance, slideCount, intervalMs, paused]);
}
