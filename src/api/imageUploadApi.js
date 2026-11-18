import { backendUrl } from "./config";
import { getStoredAuthToken } from "./authApi";

/**
 * POST multipart field `image` to an upload endpoint; returns `{ publicUrl, key, contentType, contentLength }`.
 * @param {File} file
 * @param {string} path e.g. `/api/menu/upload`
 */
export async function uploadImageDirectBackend(file, path) {
  const token = getStoredAuthToken();
  if (!token) {
    const err = new Error("Not signed in");
    err.code = "NO_TOKEN";
    throw err;
  }
  if (!file || !(file instanceof Blob)) {
    throw new Error("No image file selected.");
  }
  const fd = new FormData();
  fd.append("image", file, file.name || "image");
  const res = await fetch(backendUrl(path), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    if (data.code) err.code = data.code;
    throw err;
  }
  if (!data?.publicUrl) {
    throw new Error("Server did not return an image URL.");
  }
  return data;
}

export const uploadMenuImageDirectBackend = (file) => uploadImageDirectBackend(file, "/api/menu/upload");
export const uploadRoomImageDirectBackend = (file) => uploadImageDirectBackend(file, "/api/rooms/upload");
export const uploadVenueImageDirectBackend = (file) =>
  uploadImageDirectBackend(file, "/api/event-venues/upload");
export const uploadProfilePhotoDirectBackend = (file) =>
  uploadImageDirectBackend(file, "/api/guests/me/upload/profile-photo");
export const uploadUserProfilePhotoDirectBackend = (file) =>
  uploadImageDirectBackend(file, "/api/users/me/upload/profile-photo");
export const uploadGuestValidIdDirectBackend = (file) =>
  uploadImageDirectBackend(file, "/api/guests/me/upload/valid-id");
export const uploadBookingGuestValidIdDirectBackend = (file) =>
  uploadImageDirectBackend(file, "/api/bookings/upload/guest-id");
export const uploadPaymentProofDirectBackend = (file) =>
  uploadImageDirectBackend(file, "/api/bookings/upload/payment-proof");
