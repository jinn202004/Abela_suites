import { useState } from "react";
import { ADMIN_LOGO_CANDIDATES, nextAdminLogoSrc } from "../admin_1/adminLogoSrc";

const PRINT_LOGO_CANDIDATES = [
  ...ADMIN_LOGO_CANDIDATES,
  `${import.meta.env.BASE_URL}logo.jpg`,
  `${import.meta.env.BASE_URL}logo.png`,
];

/**
 * Print header logo with fallbacks when static assets are missing from `public/`.
 */
export default function BillsPrintLogo() {
  const [src, setSrc] = useState(PRINT_LOGO_CANDIDATES[0]);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="bm-print-logo-mark bm-print-logo-mark--fallback" aria-hidden>
        <span className="bm-print-logo-fallback" aria-hidden>
          A
        </span>
      </div>
    );
  }

  return (
    <div className="bm-print-logo-mark" aria-hidden>
      <img
        src={src}
        alt="Abela Suites"
        className="bm-print-logo-img"
        width={56}
        height={56}
        decoding="async"
        onError={() => {
          const idx = PRINT_LOGO_CANDIDATES.indexOf(src);
          const next = nextAdminLogoSrc(src) ?? PRINT_LOGO_CANDIDATES[idx + 1];
          if (next) setSrc(next);
          else setFailed(true);
        }}
      />
    </div>
  );
}
