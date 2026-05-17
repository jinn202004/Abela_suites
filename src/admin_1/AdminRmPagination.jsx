/** Client-side table pagination for admin Room / Event management (no API or DB changes). */

export function visibleAdminPageNumbers(currentPage, totalPages) {
  const t = Math.max(1, Math.min(5000, Number(totalPages) || 1));
  const c = Math.min(Math.max(1, Number(currentPage) || 1), t);
  if (t <= 9) return Array.from({ length: t }, (_, i) => i + 1);
  const set = new Set([1, t, c, c - 1, c + 1]);
  return [...set].filter((p) => p >= 1 && p <= t).sort((a, b) => a - b);
}

export default function AdminRmPagination({
  loading = false,
  rangeFrom = 0,
  rangeTo = 0,
  totalItems = 0,
  page = 1,
  totalPages = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  ariaLabel = "Table pages",
}) {
  const tp = Math.max(1, Number(totalPages) || 1);
  const pg = Math.min(Math.max(1, Number(page) || 1), tp);
  const hasRows = totalItems > 0 && rangeTo > 0;

  return (
    <nav
      className="rm-pagination-row rm-pagination-bar"
      aria-label={ariaLabel}
      aria-busy={loading}
    >
      <div className="rm-pagination-meta">
        <span className="rm-pagination-count">
          {loading ? (
            <>Loading page {pg}…</>
          ) : hasRows ? (
            <>
              Showing <strong>{rangeFrom}–{rangeTo}</strong> of <strong>{totalItems}</strong>
              {" · "}Page {pg} of {tp}
            </>
          ) : (
            <>
              <strong>{totalItems}</strong> record{totalItems === 1 ? "" : "s"}
              {" · "}Page {pg} of {tp}
            </>
          )}
        </span>
        <label className="rm-pagination-limit">
          <span>Per page</span>
          <select
            className="rm-pagination-select"
            value={pageSize}
            disabled={loading}
            onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>
      <div className="rm-pagination-btns">
        <button
          type="button"
          className="rm-page-btn"
          disabled={loading || pg <= 1}
          onClick={() => onPageChange?.(Math.max(1, pg - 1))}
        >
          Previous
        </button>
        {visibleAdminPageNumbers(pg, tp).map((pNum, idx, arr) => {
          const prev = arr[idx - 1];
          const showEllipsis = prev != null && pNum - prev > 1;
          return (
            <span key={pNum} className="rm-page-btn-wrap">
              {showEllipsis ? <span className="rm-page-ellipsis">…</span> : null}
              <button
                type="button"
                className={`rm-page-btn${pNum === pg ? " rm-page-btn--active" : ""}`}
                aria-label={`Page ${pNum}`}
                disabled={loading}
                {...(pNum === pg ? { "aria-current": "page" } : {})}
                onClick={() => onPageChange?.(pNum)}
              >
                {pNum}
              </button>
            </span>
          );
        })}
        <button
          type="button"
          className="rm-page-btn"
          disabled={loading || pg >= tp}
          onClick={() => onPageChange?.(Math.min(tp, pg + 1))}
        >
          Next
        </button>
      </div>
    </nav>
  );
}
