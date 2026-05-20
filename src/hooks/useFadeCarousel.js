import { useState, useEffect, useCallback } from "react";
import { useCarouselAutoAdvance } from "./useCarouselAutoAdvance";

const FADE_MS = 280;

/**
 * Fade-style carousel with manual arrows, dot navigation, and optional auto-advance.
 * @param {Array<unknown>} slides
 * @param {{ intervalMs?: number, paused?: boolean }} [options]
 */
export function useFadeCarousel(slides, options = {}) {
  const { intervalMs = 5500, paused = false } = options;
  const slideCount = Array.isArray(slides) ? slides.length : 0;

  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (slideCount === 0) {
      setIndex(0);
      return;
    }
    setIndex((i) => Math.min(i, slideCount - 1));
  }, [slideCount]);

  const advance = useCallback(
    (direction) => {
      if (slideCount <= 1) return;
      setFade(false);
      window.setTimeout(() => {
        setIndex((i) => (i + direction + slideCount) % slideCount);
        setFade(true);
      }, FADE_MS);
    },
    [slideCount],
  );

  const goTo = useCallback(
    (target) => {
      if (slideCount <= 0) return;
      const next = ((Number(target) % slideCount) + slideCount) % slideCount;
      if (next === index) return;
      setFade(false);
      window.setTimeout(() => {
        setIndex(next);
        setFade(true);
      }, FADE_MS);
    },
    [index, slideCount],
  );

  useCarouselAutoAdvance(advance, slideCount, intervalMs, paused);

  const current = slideCount > 0 ? slides[index] : null;

  return { index, fade, advance, goTo, current, slideCount };
}
