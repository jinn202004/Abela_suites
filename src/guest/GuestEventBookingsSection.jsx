import { useCallback, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import ModalFrame from '../components/ModalFrame'
import { fetchEventBookings } from '../api/guestApi'
import GuestBookingsPagination, { GUEST_BOOKINGS_PAGE_SIZE } from './GuestBookingsPagination'
import { sortEventBookingsByEventDateDesc } from './guestBookingListSort'
import { normalizeRoomReservationStatus } from './roomReservationStatus'
import './GuestBookingsSection.css'

function formatCreated(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) return ''
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return ''
  }
}

function formatEventDates(start, end) {
  if (!start && !end) return '—'
  if (start && end && start !== end) return `${start} → ${end}`
  return start || end || '—'
}

function formatTableNumber(amount) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—'
  return Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatPeso(amount) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—'
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

/** @param {string | undefined} url */
function proofDataUrlKind(url) {
  if (typeof url !== 'string') return null
  const s = url.trim()
  if (s.length < 12) return null
  if (/^data:image\//i.test(s)) return 'image'
  if (/^data:application\/pdf/i.test(s)) return 'pdf'
  return 'other'
}

/** Total price for an event booking (venue / package). */
function getEventTotalRaw(b) {
  const raw = b.totalAmount ?? b.totalEventAmount ?? b.venuePrice
  if (raw == null || String(raw).trim() === '') return null
  const n = parseFloat(String(raw).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** @param {Record<string, unknown>} b */
function computeEventBookingAmounts(b) {
  const total = getEventTotalRaw(b)
  const paid = Number(b.paymentAmount)
  const hasTotal = total != null
  const hasPaid = Number.isFinite(paid) && paid >= 0

  if (!hasTotal) {
    return { price: null, down: null, balance: null }
  }

  const paymentType = b.paymentType
  if (paymentType === 'downpayment') {
    return {
      price: total,
      down: hasPaid ? paid : null,
      balance: hasPaid ? Math.max(0, total - paid) : null,
    }
  }
  if (paymentType === 'full' || !paymentType) {
    if (hasPaid) {
      return { price: total, down: paid, balance: Math.max(0, total - paid) }
    }
    return { price: total, down: null, balance: null }
  }
  return { price: total, down: hasPaid ? paid : null, balance: hasPaid ? Math.max(0, total - paid) : null }
}

function bookingStatusLabel(b) {
  if (b.status && typeof b.status === 'string' && b.status.trim()) return b.status.trim()
  return 'Pending'
}

export default function GuestEventBookingsSection() {
  const detailTitleId = useId()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [detailBooking, setDetailBooking] = useState(null)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const data = await fetchEventBookings()
      const list = Array.isArray(data) ? data : []
      const sorted = sortEventBookingsByEventDateDesc(list)
      setBookings(sorted)
      setPage(1)
    } catch {
      setLoadError(true)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const onCreated = () => {
      setLoading(true)
      load()
    }
    window.addEventListener('guest-event-booking-created', onCreated)
    return () => window.removeEventListener('guest-event-booking-created', onCreated)
  }, [load])

  const totalPages = Math.max(1, Math.ceil(bookings.length / GUEST_BOOKINGS_PAGE_SIZE))
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [bookings.length, totalPages])

  const pageItems = bookings.slice((page - 1) * GUEST_BOOKINGS_PAGE_SIZE, page * GUEST_BOOKINGS_PAGE_SIZE)

  const hasBookings = bookings.length > 0

  return (
    <section className="guest-bookings guest-bookings--events" aria-labelledby="guest-event-bookings-heading">
      <h2 id="guest-event-bookings-heading" className="guest-bookings__title">
        Your Bookings
      </h2>
      <p className="guest-bookings__intro">
        Keep track of your reservations and manage your bookings anytime, anywhere.
      </p>

      {loading && (
        <p className="guest-bookings__status" role="status">
          Loading event bookings…
        </p>
      )}

      {!loading && loadError && (
        <p className="guest-bookings__status guest-bookings__status--warn" role="status">
          Could not load event bookings. Start the API with <code className="guest-bookings__code">npm run api</code> or{' '}
          <code className="guest-bookings__code">npm run dev:full</code>, then refresh.
        </p>
      )}

      {!loading && !loadError && !hasBookings && (
        <div className="guest-bookings__empty">
          <p className="guest-bookings__empty-text">
            No event bookings yet — browse venues and submit a booking request.
          </p>
          <Link to="/guest/events" className="guest-bookings__cta">
            Browse event venues
          </Link>
        </div>
      )}

      {!loading && !loadError && hasBookings && (
        <>
          <div className="guest-bookings__table-wrap">
            <table className="guest-bookings__table">
              <thead>
                <tr>
                  <th scope="col">Type</th>
                  <th scope="col">Price</th>
                  <th scope="col">Paid</th>
                  <th scope="col">Balance</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((b) => {
                  const id = b.id
                  const amounts = computeEventBookingAmounts(b)
                  const status = bookingStatusLabel(b)
                  const statusClass =
                    status.toLowerCase() === 'pending'
                      ? 'guest-bookings__status-pill--pending'
                      : status.toLowerCase() === 'confirmed' || status.toLowerCase() === 'approved'
                        ? 'guest-bookings__status-pill--ok'
                        : 'guest-bookings__status-pill--neutral'

                  return (
                    <tr key={String(id)} className="guest-bookings__row">
                      <td>Event</td>
                      <td>{amounts.price != null ? formatTableNumber(amounts.price) : '—'}</td>
                      <td>{amounts.down != null ? formatTableNumber(amounts.down) : '—'}</td>
                      <td>{amounts.balance != null ? formatTableNumber(amounts.balance) : '—'}</td>
                      <td>
                        <span className={`guest-bookings__status-pill ${statusClass}`}>{status}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="guest-bookings__view-btn"
                          onClick={() => setDetailBooking(b)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <GuestBookingsPagination
            page={page}
            pageSize={GUEST_BOOKINGS_PAGE_SIZE}
            total={bookings.length}
            onPageChange={setPage}
            ariaLabelledBy="guest-event-bookings-heading"
          />
        </>
      )}

      <ModalFrame
        isOpen={detailBooking != null}
        onClose={() => setDetailBooking(null)}
        panelClassName="guest-booking-detail-modal"
        ariaLabelledBy={detailTitleId}
      >
        {detailBooking && (
          <GuestEventBookingDetailModalContent
            b={detailBooking}
            titleId={detailTitleId}
            onClose={() => setDetailBooking(null)}
          />
        )}
      </ModalFrame>
    </section>
  )
}

function GuestEventBookingDetailModalContent({ b, titleId, onClose }) {
  const amounts = computeEventBookingAmounts(b)
  const status = bookingStatusLabel(b)
  const proofKind = b.proofOfPaymentDataUrl ? proofDataUrlKind(b.proofOfPaymentDataUrl) : null
  const paidNum =
    typeof b.paymentAmount === 'number'
      ? b.paymentAmount
      : Number(String(b.paymentAmount ?? '').replace(/,/g, ''))
  const hasPaid = Number.isFinite(paidNum) && paidNum >= 0
  const priceDisplay = amounts.price != null ? formatPeso(amounts.price) : '—'
  const pax =
    b.expectedPax != null && Number.isFinite(Number(b.expectedPax)) ? Math.floor(Number(b.expectedPax)) : null

  return (
    <>
      <div className="guest-booking-detail-modal__head">
        <h2 id={titleId} className="guest-booking-detail-modal__title">
          Reservation Details
        </h2>
        <button type="button" className="guest-booking-detail-modal__close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="guest-booking-detail-modal__body">
        <div className="guest-booking-detail-modal__grid">
          <div className="guest-booking-detail-modal__stack">
            <section className="guest-booking-detail-modal__card" aria-labelledby={`${titleId}-event`}>
              <h3 id={`${titleId}-event`} className="guest-booking-detail-modal__card-title">
                Event Details
              </h3>
              <dl className="guest-booking-detail-modal__dl">
                <div className="guest-booking-detail-modal__dl-row">
                  <dt>Venue</dt>
                  <dd>{b.venueName ? String(b.venueName) : '—'}</dd>
                </div>
                <div className="guest-booking-detail-modal__dl-row">
                  <dt>Type</dt>
                  <dd>Event</dd>
                </div>
                <div className="guest-booking-detail-modal__dl-row">
                  <dt>Price</dt>
                  <dd>{priceDisplay}</dd>
                </div>
                <div className="guest-booking-detail-modal__dl-row">
                  <dt>Status</dt>
                  <dd>{status}</dd>
                </div>
              </dl>
              {normalizeRoomReservationStatus(b.status) === 'declined' &&
                typeof b.declineReason === 'string' &&
                b.declineReason.trim() !== '' && (
                  <div className="guest-booking-detail-modal__decline-note" role="note">
                    <p className="guest-booking-detail-modal__decline-note-title">Rejection reason</p>
                    <p className="guest-booking-detail-modal__decline-note-body">{b.declineReason.trim()}</p>
                  </div>
                )}
            </section>

            <section className="guest-booking-detail-modal__card" aria-labelledby={`${titleId}-bill`}>
              <h3 id={`${titleId}-bill`} className="guest-booking-detail-modal__card-title">
                Billing Summary
              </h3>
              <dl className="guest-booking-detail-modal__dl">
                <div className="guest-booking-detail-modal__dl-row">
                  <dt>Total Amount</dt>
                  <dd>{amounts.price != null ? formatPeso(amounts.price) : '—'}</dd>
                </div>
                <div className="guest-booking-detail-modal__dl-row">
                  <dt>Paid</dt>
                  <dd>{hasPaid ? formatPeso(paidNum) : '—'}</dd>
                </div>
                <div className="guest-booking-detail-modal__dl-row">
                  <dt>Remaining Balance</dt>
                  <dd className="guest-booking-detail-modal__value--balance">
                    {amounts.balance != null ? formatPeso(amounts.balance) : '—'}
                  </dd>
                </div>
                <div className="guest-booking-detail-modal__dl-row">
                  <dt>Total Paid</dt>
                  <dd className="guest-booking-detail-modal__value--paid">{hasPaid ? formatPeso(paidNum) : '—'}</dd>
                </div>
              </dl>
              {(b.paymentDate || b.paymentTransactionId) && (
                <div className="guest-booking-detail-modal__bill-meta">
                  {b.paymentDate && (
                    <p>
                      <span className="guest-booking-detail-modal__meta-label">Paid on</span> {String(b.paymentDate)}
                    </p>
                  )}
                  {b.paymentTransactionId && (
                    <p>
                      <span className="guest-booking-detail-modal__meta-label">Txn ID</span> {String(b.paymentTransactionId)}
                    </p>
                  )}
                </div>
              )}
            </section>
          </div>

          <section className="guest-booking-detail-modal__card guest-booking-detail-modal__card--guest" aria-labelledby={`${titleId}-guest`}>
            <h3 id={`${titleId}-guest`} className="guest-booking-detail-modal__card-title">
              Guest Information
            </h3>
            <dl className="guest-booking-detail-modal__dl guest-booking-detail-modal__dl--stack">
              <div>
                <dt>Guest</dt>
                <dd>{b.customerName || '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{b.email || '—'}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{b.contactNumber || '—'}</dd>
              </div>
              <div>
                <dt>Event</dt>
                <dd>{formatEventDates(b.eventDate, b.eventEndDate)}</dd>
              </div>
              {pax != null && (
                <div>
                  <dt>Expected guests</dt>
                  <dd>{pax} pax</dd>
                </div>
              )}
              <div>
                <dt>Event title</dt>
                <dd>{b.eventTitle ? String(b.eventTitle) : '—'}</dd>
              </div>
              {b.address && String(b.address).trim() !== '' && (
                <div>
                  <dt>Address</dt>
                  <dd>{String(b.address)}</dd>
                </div>
              )}
              {b.additionalRequests && String(b.additionalRequests).trim() !== '' && (
                <div>
                  <dt>Additional requests</dt>
                  <dd>{String(b.additionalRequests)}</dd>
                </div>
              )}
            </dl>
            {b.createdAt && (
              <p className="guest-booking-detail-modal__booked-at">Requested {formatCreated(b.createdAt)}</p>
            )}
          </section>
        </div>

        {(b.proofOfPaymentDataUrl || b.paymentType) && (
          <section className="guest-booking-detail-modal__card guest-booking-detail-modal__card--full" aria-labelledby={`${titleId}-extra`}>
            <h3 id={`${titleId}-extra`} className="guest-booking-detail-modal__card-title">
              Payment
            </h3>
            {b.paymentType && (
              <p className="guest-booking-detail-modal__payment-type">
                {b.paymentType === 'downpayment' ? 'Down payment' : 'Paid in full'}
              </p>
            )}
            {b.proofOfPaymentDataUrl && (
              <div className="guest-bookings__proof guest-bookings__proof--modal">
                {proofKind === 'image' && (
                  <img
                    src={b.proofOfPaymentDataUrl}
                    alt="Payment receipt or transfer screenshot"
                    className="guest-bookings__proof-img"
                  />
                )}
                {proofKind === 'pdf' && (
                  <div className="guest-bookings__proof-pdf">
                    <iframe title="Proof of payment PDF" src={b.proofOfPaymentDataUrl} className="guest-bookings__proof-iframe" />
                  </div>
                )}
                {proofKind === 'other' && (
                  <p className="guest-bookings__proof-fallback">Proof file attached (preview not shown).</p>
                )}
                {b.proofOfPaymentName && (
                  <p className="guest-bookings__proof-filename">{String(b.proofOfPaymentName)}</p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  )
}
