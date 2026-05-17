import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const billsPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/admin_1/bills.jsx",
);

let s = fs.readFileSync(billsPath, "utf8");

s = s.replace(
  /            <div className="bm-print-logo-mark" aria-hidden>\s*<img[\s\S]*?\/>\s*<\/motion.div>/,
  "            <BillsPrintLogo />",
);
s = s.replace(
  /            <div className="bm-print-logo-mark" aria-hidden>\s*<img[\s\S]*?\/>\s*<\/div>/,
  "            <BillsPrintLogo />",
);

s = s.replace(
  'return <AdminSidebarNav logoSrc="/public/logo.png" />;',
  'return <AdminSidebarNav logoSrc="/logo.png" />;',
);

s = s.replace(
  `          {!loading && (
            <div className="rm-pagination-row">`,
  `          {(totalItems > 0 || rows.length > 0) && (
            <nav className="rm-pagination-row" aria-label="Billing table pages" aria-busy={loading}>`,
);

s = s.replace(
  `            </div>
          )}

          <BillsPrintModal`,
  `            </nav>
          )}

          <BillsPrintModal`,
);

s = s.replace(
  `                <button
                  type="button"
                  className="rm-page-btn"
                  disabled={page <= 1}`,
  `                <button
                  type="button"
                  className="rm-page-btn"
                  disabled={loading || page <= 1}`,
);

s = s.replace(
  `                <button
                  type="button"
                  className="rm-page-btn"
                  disabled={page >= totalPages}`,
  `                <button
                  type="button"
                  className="rm-page-btn"
                  disabled={loading || page >= totalPages}`,
);

s = s.replace(
  `                        className={\`rm-page-btn\${pNum === page ? " rm-page-btn--active" : ""}\`}
                        onClick={() => setPage(pNum)}`,
  `                        className={\`rm-page-btn\${pNum === page ? " rm-page-btn--active" : ""}\`}
                        disabled={loading}
                        onClick={() => setPage(pNum)}`,
);

s = s.replace(
  `                    value={limit}
                    onChange={(e) => {`,
  `                    value={limit}
                    disabled={loading}
                    onChange={(e) => {`,
);

fs.writeFileSync(billsPath, s);
console.log("ok");
