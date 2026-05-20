import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./RoomDetailModal.css";

/** Collect unique photo URLs from a room view object (supports future `images` / `photos` arrays). */
export function collectRoomPhotos(room) {
  if (!room || typeof room !== "object") return [];
  const seen = new Set();
  const out = [];
  const add = (raw) => {
    const src = String(raw ?? "").trim();
    if (!src || seen.has(src)) return;
    seen.add(src);
    out.push({ src, alt: String(room.name ?? "").trim() || "Room photo" });
  };
  if (Array.isArray(room.images)) room.images.forEach(add);
  if (Array.isArray(room.photos)) room.photos.forEach(add);
  add(room.img);
  add(room.image);
  return out;
}

/**
 * Guest room detail modal — full info before booking (replaces image-only preview on /rooms).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {object|null} props.room — mapped guest room view row
 * @param {{ ok?: boolean, label?: string, dateLabel?: string }|null} [props.availability]
 * @param {boolean} [props.bookDisabled]
 * @param {() => void} [props.onBookNow]
 */
export function RoomDetailModal({
  open,
  onClose,
  room,
  availability = null,
  bookDisabled = false,
  onBookNow,
}) {
  const photos = useMemo(() => collectRoomPhotos(room), [room]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setPhotoIndex(0);
  }, [open, room?.id]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const goPrev = useCallback(() => {
    setPhotoIndex((i) => (photos.length ? (i - 1 + photos.length) % photos.length : 0));
  }, [photos.length]);

  const goNext = useCallback(() => {
    setPhotoIndex((i) => (photos.length ? (i + 1) % photos.length : 0));
  }, [photos.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (photos.length <= 1) return;
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
  }, [open, photos.length, goPrev, goNext]);

  if (!open || !room) return null;

  const currentPhoto = photos[photoIndex] ?? photos[0];
  const hasManyPhotos = photos.length > 1;
  const features = Array.isArray(room.features) ? room.features.filter(Boolean) : [];

  const availLabel = availability?.label ?? "Check dates to confirm";
  const availOk = availability?.ok === true;
  const availKnown = availability != null;
  const availClass = availKnown ? (availOk ? "room-detail-avail--ok" : "room-detail-avail--no") : "room-detail-avail--neutral";

  const desc =
    String(room.desc ?? room.description ?? "").trim() || "No description provided for this room yet.";

  return createPortal(
    <div
      className="modal-backdrop active room-detail-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current?.();
      }}
    >
      <div
        className="modal room-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="room-detail-header">
          <h2 id="room-detail-title" className="room-detail-title">
            {room.name}
          </h2>
          <button type="button" className="modal-close" onClick={() => onCloseRef.current?.()} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="room-detail-body">
          <section className="room-detail-gallery" aria-label="Room photos">
            <div className="room-detail-stage">
              {hasManyPhotos ? (
                <>
                  <button
                    type="button"
                    className="room-detail-nav room-detail-nav--prev"
                    onClick={goPrev}
                    aria-label="Previous photo"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="room-detail-nav room-detail-nav--next"
                    onClick={goNext}
                    aria-label="Next photo"
                  >
                    ›
                  </button>
                </>
              ) : null}
              {currentPhoto ? (
                <img
                  key={currentPhoto.src}
                  src={currentPhoto.src}
                  alt={currentPhoto.alt}
                  className="room-detail-main-img"
                  decoding="async"
                />
              ) : (
                <p className="room-detail-amenities-empty">No photos available</p>
              )}
            </div>
            {hasManyPhotos ? (
              <div className="room-detail-thumbs" role="tablist" aria-label="Photo thumbnails">
                {photos.map((p, i) => (
                  <button
                    key={p.src}
                    type="button"
                    role="tab"
                    aria-selected={i === photoIndex}
                    className={`room-detail-thumb${i === photoIndex ? " room-detail-thumb--active" : ""}`}
                    onClick={() => setPhotoIndex(i)}
                  >
                    <img src={p.src} alt="" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}
          </section>

          <section className="room-detail-info">
            <div className="room-detail-meta-row">
              <span className={`room-detail-avail ${availClass}`}>{availLabel}</span>
              {availability?.dateLabel ? (
                <span className="room-detail-dates">{availability.dateLabel}</span>
              ) : null}
            </div>

            <p className="room-detail-price">{room.priceNew ?? "—"}</p>

            <div className="room-detail-stats">
              <div className="room-detail-stat">
                <span className="room-detail-stat-label">Capacity</span>
                <span className="room-detail-stat-value">{room.guestLabel ?? "—"}</span>
              </div>
              <div className="room-detail-stat">
                <span className="room-detail-stat-label">Room number</span>
                <span className="room-detail-stat-value">{room.roomNumber || "—"}</span>
              </div>
              <div className="room-detail-stat">
                <span className="room-detail-stat-label">Package</span>
                <span className="room-detail-stat-value">{room.packageLabel || "Room"}</span>
              </div>
              <div className="room-detail-stat">
                <span className="room-detail-stat-label">Type</span>
                <span className="room-detail-stat-value">Room</span>
              </div>
            </div>

            <p className="room-detail-desc">{desc}</p>

            <h3 className="room-detail-amenities-title">Amenities &amp; features</h3>
            {features.length > 0 ? (
              <ul className="room-detail-amenities">
                {features.map((f) => (
                  <li key={f}>✔ {f}</li>
                ))}
              </ul>
            ) : (
              <p className="room-detail-amenities-empty">Amenities will be listed here when available.</p>
            )}

            <div className="room-detail-actions">
              <button
                type="button"
                className="room-detail-btn-book"
                disabled={bookDisabled}
                onClick={() => {
                  onBookNow?.();
                  onCloseRef.current?.();
                }}
              >
                Book Now
              </button>
              <button type="button" className="room-detail-btn-close" onClick={() => onCloseRef.current?.()}>
                Close
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
