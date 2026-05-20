import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./ImagePreviewModal.css";

/**
 * Normalize props into a gallery list.
 * @param {{ src?: string, alt?: string, caption?: string, images?: Array<{ src: string, alt?: string, caption?: string }>, initialIndex?: number }} props
 */
function normalizeImages(props) {
  if (Array.isArray(props.images) && props.images.length > 0) {
    return props.images
      .map((item) => ({
        src: String(item?.src ?? "").trim(),
        alt: String(item?.alt ?? "").trim(),
        caption: String(item?.caption ?? item?.alt ?? "").trim(),
      }))
      .filter((item) => item.src);
  }
  const src = String(props.src ?? "").trim();
  if (!src) return [];
  return [
    {
      src,
      alt: String(props.alt ?? "").trim(),
      caption: String(props.caption ?? props.alt ?? "").trim(),
    },
  ];
}

/**
 * Full-size image preview modal for guest room/venue photos and catalog carousels.
 * Supports single image or gallery navigation while keeping existing sliders unchanged.
 */
export function ImagePreviewModal({
  open,
  onClose,
  src,
  alt = "",
  caption = "",
  images,
  initialIndex = 0,
}) {
  const gallery = useMemo(() => normalizeImages({ src, alt, caption, images }), [src, alt, caption, images]);
  const [index, setIndex] = useState(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const safe = Math.min(Math.max(0, initialIndex), Math.max(0, gallery.length - 1));
    setIndex(safe);
  }, [open, initialIndex, gallery.length]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const goPrev = useCallback(() => {
    setIndex((i) => (gallery.length ? (i - 1 + gallery.length) % gallery.length : 0));
  }, [gallery.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (gallery.length ? (i + 1) % gallery.length : 0));
  }, [gallery.length]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (gallery.length <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, gallery.length, goPrev, goNext]);

  if (!open || gallery.length === 0) return null;

  const current = gallery[index] ?? gallery[0];
  const hasMany = gallery.length > 1;
  const title = current.caption || current.alt || "Photo preview";

  return createPortal(
    <div
      className="img-preview-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        className="img-preview-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="img-preview-header">
          <p className="img-preview-caption" title={title}>
            {title}
          </p>
          {hasMany ? (
            <span className="img-preview-counter" aria-live="polite">
              {index + 1} / {gallery.length}
            </span>
          ) : null}
          <button type="button" className="img-preview-close" onClick={() => onCloseRef.current?.()} aria-label="Close preview">
            ×
          </button>
        </div>
        <div className="img-preview-stage">
          {hasMany ? (
            <>
              <button type="button" className="img-preview-nav img-preview-nav--prev" onClick={goPrev} aria-label="Previous photo">
                ‹
              </button>
              <button type="button" className="img-preview-nav img-preview-nav--next" onClick={goNext} aria-label="Next photo">
                ›
              </button>
            </>
          ) : null}
          <img
            key={current.src}
            src={current.src}
            alt={current.alt || title}
            className="img-preview-image"
            decoding="async"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
