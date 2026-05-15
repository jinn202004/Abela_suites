/**
 * Client-only PDF helpers: no API calls, no database writes.
 * Used by print / export buttons across the app.
 */

/** jsPDF built-in fonts are WinAnsi-oriented; avoid chars that break `doc.text` / tables. */
export function pdfSafeText(v, maxLen = 240) {
  const s = String(v ?? "—")
    .replace(/\r\n|\r|\n/g, " ")
    .slice(0, maxLen);
  let out = "";
  for (let i = 0; i < s.length; i += 1) {
    const code = s.charCodeAt(i);
    out += code <= 255 ? s[i] : "?";
  }
  return out.trim() || "—";
}

/**
 * Prefer opening the PDF in a new tab (often triggers print); fall back to download.
 * Call synchronously from a click handler when possible so pop-ups are not blocked.
 */
export function openPdfPrintOrDownload(doc, filename) {
  const fname = String(filename || "document.pdf");
  try {
    doc.autoPrint();
    const blobRef = doc.output("bloburl");
    const href = typeof blobRef === "string" ? blobRef : blobRef?.href || "";
    if (href && typeof window !== "undefined") {
      const win = window.open(href, "_blank", "noopener,noreferrer");
      if (!win) doc.save(fname);
    } else {
      doc.save(fname);
    }
  } catch {
    try {
      doc.save(fname);
    } catch {
      /* ignore */
    }
  }
}
