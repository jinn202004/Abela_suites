/** When false, failed S3/API uploads surface errors instead of a data-URL preview. */
export const IMAGE_LOCAL_FALLBACK_ENABLED = !(
  import.meta.env.VITE_MENU_IMAGE_LOCAL_FALLBACK === "false" ||
  import.meta.env.VITE_MENU_IMAGE_LOCAL_FALLBACK === "0"
);

const MENU_IMAGE_DATA_URL_MAX_CHARS = 400_000;

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

export function isStoredImageRef(value) {
  const s = String(value || "").trim();
  return s.startsWith("data:image/") || /^https?:\/\//i.test(s);
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
  });
}

export async function uploadImageWithOptionalFallback(file, uploadFn, hooks) {
  const { onSuccess, onError, onFallbackToast } = hooks;
  try {
    const result = await uploadFn(file);
    onSuccess(result.publicUrl);
  } catch (err) {
    if (IMAGE_LOCAL_FALLBACK_ENABLED && (err?.status === 503 || isLikelyNetworkFailure(err))) {
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
