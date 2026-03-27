export const GUEST_BOOKINGS_PAGE_SIZE = 5

/**
 * @param {object} props
 * @param {number} props.page — 1-based
 * @param {number} props.pageSize
 * @param {number} props.total
 * @param {function} props.onPageChange — (nextPage: number) => void
 * @param {string} [props.ariaLabelledBy] — id of visible heading for aria-labelledby
 */
export default function GuestBookingsPagination({ page, pageSize, total, onPageChange, ariaLabelledBy }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (total === 0 || totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  return (
    <nav
      className="guest-bookings__pager"
      aria-label="Booking list pages"
      {...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {})}
    >
      <p className="guest-bookings__pager-summary">
        Showing {start}–{end} of {total}
      </p>
      <div className="guest-bookings__pager-actions">
        <button
          type="button"
          className="guest-bookings__pager-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span className="guest-bookings__pager-status">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="guest-bookings__pager-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </nav>
  )
}
