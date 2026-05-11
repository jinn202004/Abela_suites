import { useState, useEffect } from "react";
import { fetchBookingByIdBackend } from "../api/guestApi";

/**
 * List payloads may omit `guest.validIdPhotoData`; load one booking when a modal opens.
 * @param {{ open: boolean, bookingId?: string | null, rowPhoto?: string }} p
 */
export function useLazyBookingIdPhoto({ open, bookingId, rowPhoto }) {
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    if (!open) {
      setPhoto("");
      return;
    }
    const inline = rowPhoto && String(rowPhoto).startsWith("data:") ? String(rowPhoto) : "";
    if (inline) {
      setPhoto(inline);
      return;
    }
    const id = String(bookingId ?? "").trim();
    if (!id) {
      setPhoto("");
      return;
    }
    let cancelled = false;
    fetchBookingByIdBackend(id)
      .then((b) => {
        const g = b?.guest;
        const p =
          g?.validIdPhotoData && String(g.validIdPhotoData).startsWith("data:")
            ? String(g.validIdPhotoData)
            : "";
        if (!cancelled) setPhoto(p);
      })
      .catch(() => {
        if (!cancelled) setPhoto("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, bookingId, rowPhoto]);

  return photo;
}
