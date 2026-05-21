import { useState, useEffect } from "react";
import { fetchBookingByIdBackend } from "../api/guestApi";
import { resolveGovernmentIdUrl } from "../guests/guestBookingIdPhoto";

/**
 * List payloads may omit full guest ID data; load one booking when a modal opens.
 * @param {{ open: boolean, bookingId?: string | null, rowPhoto?: string, booking?: object | null }} p
 */
export function useLazyBookingIdPhoto({ open, bookingId, rowPhoto, booking }) {
  const [photo, setPhoto] = useState("");

  useEffect(() => {
    if (!open) {
      setPhoto("");
      return;
    }

    const fromBooking = resolveGovernmentIdUrl(booking);
    if (fromBooking) {
      setPhoto(fromBooking);
      return;
    }

    const row = String(rowPhoto || "").trim();
    const inline =
      row.startsWith("data:image/") || /^https?:\/\//i.test(row) ? row : "";
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
        const url = resolveGovernmentIdUrl(b);
        if (!cancelled) setPhoto(url || "");
      })
      .catch(() => {
        if (!cancelled) setPhoto("");
      });
    return () => {
      cancelled = true;
    };
  }, [open, bookingId, rowPhoto, booking]);

  return photo;
}
