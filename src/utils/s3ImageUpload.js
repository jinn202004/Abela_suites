/** When false, failed S3/API uploads surface errors instead of a data-URL preview. */
export const IMAGE_LOCAL_FALLBACK_ENABLED = !(
  import.meta.env.VITE_MENU_IMAGE_LOCAL_FALLBACK === "false" ||
  import.meta.env.VITE_MENU_IMAGE_LOCAL_FALLBACK === "0"
);

const MENU_IMAGE_DATA_URL_MAX_CHARS = 400_000;

/** Profile avatars: JPG, PNG, JPEG, WEBP only. */
const PROFILE_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const PROFILE_MAX_BYTES = (() => {
  const raw = parseInt(String(import.meta.env.VITE_PROFILE_MAX_BYTES || ""), 10);
  if (Number.isFinite(raw) && raw > 0) return Math.min(raw, 10 * 1024 * 1024);
  return 5 * 1024 * 1024;
})();

function profileMimeFromFile(file) {
  const mime = String(file?.type || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (PROFILE_ALLOWED_MIME.has(mime)) return mime;
  const name = String(file?.name || "").toLowerCase();
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".webp")) return "image/webp";
  return "";
}

/**
 * Validate profile photo before upload (format + size).
 * @param {File | undefined} file
 * @returns {string | null} error message or null if ok
 */
export function validateProfileImageFile(file) {
  if (!file) return "No file selected.";
  const mime = profileMimeFromFile(file);
  if (!mime) {
    return "Please choose a JPG, PNG, JPEG, or WEBP image.";
  }
  if (file.size > PROFILE_MAX_BYTES) {
    const mb = Math.round(PROFILE_MAX_BYTES / (1024 * 1024));
    return `Image is too large. Maximum size is ${mb} MB.`;
  }
  return null;
}

export function isLikelyNetworkFailure(err) {
  if (!err) return false;
  const msg = String(err.message || "").toLowerCase();
  return (
    err.name === "TypeError" ||
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("load failed")
  );
}

export function isHttpImageUrl(value) {
  return /^https?:\/\//i.test(String(value ?? "").trim());
}

export function isStoredImageRef(value) {
  const s = String(value || "").trim();
  return s.startsWith("data:image/") || isHttpImageUrl(s);
}

/** Bookings with S3 enabled must submit an HTTPS URL, not a dev data-URL fallback. */
export function isBookingSubmitImageRef(value) {
  return isHttpImageUrl(value);
}

export function readImageFileAsDataUrlLimited(file, maxChars = MENU_IMAGE_DATA_URL_MAX_CHARS) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || "");
      if (s.length > maxChars) {
        reject(
          new Error(
            "Image is too large to store without S3. Configure AWS_* and S3_MENU_BUCKET on the API (see .env.example).",
          ),
        );
        return;
      }
      resolve(s);
    };
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a file to S3 via the API; optional data-URL fallback when S3 is off or unreachable.
 * @param {File} file
 * @param {(file: File) => Promise<{ publicUrl: string }>} uploadFn
 * @param {{ onSuccess: (publicUrl: string) => void, onError?: (message: string) => void, onFallbackToast?: (reason: 's3-disabled' | 'network') => void }} hooks
 */
/** @param {File} file */
export function validateImageFileType(file) {
  if (!file) return "No file selected.";
  if (file.type && !file.type.startsWith("image/")) {
    return "Please choose an image file (JPEG, PNG, WebP, or GIF).";
  }
  return null;
}

/**
 * Wire a file input to S3 upload with optional dev fallback.
 * @param {File | undefined} file
 * @param {{ uploadFn: (file: File) => Promise<{ publicUrl: string }>, setPreview: (url: string) => void, setError?: (msg: string) => void, onFallbackToast?: (reason: 's3-disabled' | 'network') => void }} opts
 */
export async function handleImageFileInputChange(file, opts) {
  const typeErr = validateImageFileType(file);
  if (typeErr) {
    opts.setError?.(typeErr);
    return;
  }
  await uploadImageWithOptionalFallback(file, opts.uploadFn, {
    onSuccess: opts.setPreview,
    onError: opts.setError,
    onFallbackToast: opts.onFallbackToast,
    requireS3: opts.requireS3 === true,
  });
}

/**
 * Ensure booking payload uses an S3 URL — re-upload from File if preview is still a data URL.
 */
export async function resolveImageUrlForSubmit(preview, file, uploadFn, label = "Image") {
  const s = String(preview ?? "").trim();
  if (isHttpImageUrl(s)) return s;
  if (file) {
    const result = await uploadFn(file);
    if (!result?.publicUrl || !isHttpImageUrl(result.publicUrl)) {
      throw new Error(`${label} upload did not return a valid URL. Please try again.`);
    }
    return result.publicUrl;
  }
  if (s.startsWith("data:image/")) {
    throw new Error(
      `${label} must finish uploading to the server before you submit. Please select the file again and wait until the preview appears.`,
    );
  }
  throw new Error(`Please upload ${label.toLowerCase()}.`);
}

export async function uploadImageWithOptionalFallback(file, uploadFn, hooks) {
  const { onSuccess, onError, onFallbackToast, requireS3 = false } = hooks;
  try {
    const result = await uploadFn(file);
    onSuccess(result.publicUrl);
  } catch (err) {
    if (
      !requireS3 &&
      IMAGE_LOCAL_FALLBACK_ENABLED &&
      (err?.status === 503 || isLikelyNetworkFailure(err))
    ) {
      const dataUrl = await readImageFileAsDataUrlLimited(file);
      onSuccess(dataUrl);
      onFallbackToast?.(err?.status === 503 ? "s3-disabled" : "network");
      return;
    }
    if (!IMAGE_LOCAL_FALLBACK_ENABLED && isLikelyNetworkFailure(err)) {
      onError?.(
        "Could not reach the API. Use relative /api in dev (leave VITE_API_BASE_URL unset with the Vite proxy), or fix the API URL.",
      );
      return;
    }
    onError?.(err?.message || "Image upload failed.");
  }
}
