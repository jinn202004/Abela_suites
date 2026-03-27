import { useCallback, useEffect, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import ModalFrame from '../components/ModalFrame'
import { fetchReservations } from '../api/guestApi'
import GuestBookingsPagination, { GUEST_BOOKINGS_PAGE_SIZE } from './GuestBookingsPagination'
import { sortReservationsByStayDateDesc } from './guestBookingListSort'
import {
  formatRoomReservationStatusLabel,
  guestRoomReservationPillClass,
  normalizeRoomReservationStatus,
} from './roomReservationStatus'
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

/** @param {string | undefined} url */
function proofDataUrlKind(url) {
  if (typeof url !== 'string') return null
  const s = url.trim()
  if (s.length < 12) return null
  if (/^data:image\//i.test(s)) return 'image'
  if (/^data:application\/pdf/i.test(s)) return 'pdf'
  return 'other'
}

function formatTableNumber(amount) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—'
  return Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatPeso(amount) {
  if (amount == null || !Number.isFinite(Number(amount))) return '—'
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

/** @param {Record<string, unknown>} r */
function computeBookingAmounts(r) {
  const total = Number(r.totalStayAmount)
  const paid = Number(r.paymentAmount)
  const hasTotal = Number.isFinite(total) && total > 0
  const hasPaid = Number.isFinite(paid) && paid >= 0

  if (!hasTotal) {
    return {
      price: null,
      down: null,
      balance: null,
    }
  }

  const paymentType = r.paymentType
  if (paymentType === 'downpayment') {
    const down = hasPaid ? paid : null
    const bal = hasPaid ? Math.max(0, total - paid) : null
    return { price: total, down, balance: bal }
  }

  // full or unspecified with payment
  if (paymentType === 'full' || !paymentType) {
    if (hasPaid) {
      return {
        price: total,
        down: paid,
        balance: Math.max(0, total - paid),
      }
    }
    return { price: total, down: null, balance: null }
  }

  return { price: total, down: hasPaid ? paid : null, balance: hasPaid ? Math.max(0, total - paid) : null }
}

export default function GuestBookingsSection() {
  const detailTitleId = useId()
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [detailReservation, setDetailReservation] = useState(null)
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const data = await fetchReservations()
      const list = Array.isArray(data) ? data : []
      const sorted = sortReservationsByStayDateDesc(list)
      setReservations(sorted)
      setPage(1)
    } catch {
      setLoadError(true)
      setReservations([])
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
    window.addEventListener('guest-reservation-created', onCreated)
    return () => window.removeEventListener('guest-reservation-created', onCreated)
  }, [load])

  const totalPages = Math.max(1, Math.ceil(reservations.length / GUEST_BOOKINGS_PAGE_SIZE))
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages))
  }, [reservations.length, totalPages])

  const pageItems = reservations.slice((page - 1) * GUEST_BOOKINGS_PAGE_SIZE, page * GUEST_BOOKINGS_PAGE_SIZE)

  const hasBookings = reservations.length > 0

  return (
    <section className="guest-bookings" aria-labelledby="guest-bookings-heading">
      <h2 id="guest-bookings-heading" className="guest-bookings__title">
        Your Bookings
      </h2>
      <p className="guest-bookings__intro">
        Keep track of your reservations and manage your bookings anytime, anywhere.
      </p>

      {loading && (
        <p className="guest-bookings__status" role="status">
          Loading bookings…
        </p>
      )}

      {!loading && loadError && (
        <p className="guest-bookings__status guest-bookings__status--warn" role="status">
          Could not load bookings. Start the API with <code className="guest-bookings__code">npm run api</code> or{' '}
          <code className="guest-bookings__code">npm run dev:full</code>, then refresh.
        </p>
      )}

      {!loading && !loadError && !hasBookings && (
        <div className="guest-bookings__empty">
          <p className="guest-bookings__empty-text">
            You don&apos;t have any bookings yet, book now and plan your stay!
          </p>
          <Link to="/guest/rooms#guest-room-availability" className="guest-bookings__cta">
            Book Now
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
                {pageItems.map((r) => {
                  const id = r.id
                  const amounts = computeBookingAmounts(r)
                  const statusLabel = formatRoomReservationStatusLabel(r.status)
                  const statusClass = guestRoomReservationPillClass(r.status)

                  return (
                    <tr key={String(id)} className="guest-bookings__row">
                      <td>Room</td>
                      <td>{amounts.price != null ? formatTableNumber(amounts.price) : '—'}</td>
                      <td>{amounts.down != null ? formatTableNumber(amounts.down) : '—'}</td>
                      <td>{amounts.balance != null ? formatTableNumber(amounts.balance) : '—'}</td>
                      <td>
                        <span className={`guest-bookings__status-pill ${statusClass}`}>{statusLabel}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="guest-bookings__view-btn"
                          onClick={() => setDetailReservation(r)}
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
            total={reservations.length}
            onPageChange={setPage}
            ariaLabelledBy="guest-bookings-heading"
          />
        </>
      )}

      <ModalFrame
        isOpen={detailReservation != null}
        onClose={() => setDetailReservation(null)}
        panelClassName="guest-booking-detail-modal"
        ariaLabelledBy={detailTitleId}
      >
        {detailReservation && (
          <GuestReservationDetailModalContent
            r={detailReservation}
            titleId={detailTitleId}
            onClose={() => setDetailReservation(null)}
          />
        )}
      </ModalFrame>
    </section>
  )
}

function GuestReservationDetailModalContent({ r, titleId, onClose }) {
  const amounts = computeBookingAmounts(r)
  const status = formatRoomReservationStatusLabel(r.status)
  const proofKind = r.proofOfPaymentDataUrl ? proofDataUrlKind(r.proofOfPaymentDataUrl) : null
  const paidNum =
    typeof r.paymentAmount === 'number'
      ? r.paymentAmount
      : Number(String(r.paymentAmount ?? '').replace(/,/g, ''))
  const hasPaid = Number.isFinite(paidNum) && paidNum >= 0
  const roomLabel = r.roomId != null && String(r.roomId).trim() !== '' ? String(r.roomId) : '—'
  const roomTypeLabel = r.roomTitle ? String(r.roomTitle) : 'Room'
  const priceDisplay = amounts.price != null ? formatPeso(amounts.price) : '—'

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
            <section className="guest-booking-detail-modal__card" aria-labelledby={`${titleId}-room`}>
              <h3 id={`${titleId}-room`} className="guest-booking-detail-modal__card-title">
                Room Details
              </h3>
              <dl className="guest-booking-detail-modal__dl">
                <div className="guest-booking-detail-modal__dl-row">
                  <dt>Room</dt>
                  <dd>{roomLabel}</dd>
                </div>
                <div className="guest-booking-detail-modal__dl-row">
                  <dt>Type</dt>
                  <dd>{roomTypeLabel}</dd>
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
              {normalizeRoomReservationStatus(r.status) === 'declined' &&
                typeof r.declineReason === 'string' &&
                r.declineReason.trim() !== '' && (
                  <div className="guest-booking-detail-modal__decline-note" role="note">
                    <p className="guest-booking-detail-modal__decline-note-title">Rejection reason</p>
                    <p className="guest-booking-detail-modal__decline-note-body">{r.declineReason.trim()}</p>
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
              {(r.paymentDate || r.paymentTransactionId) && (
                <div className="guest-booking-detail-modal__bill-meta">
                  {r.paymentDate && (
                    <p>
                      <span className="guest-booking-detail-modal__meta-label">Paid on</span> {String(r.paymentDate)}
                    </p>
                  )}
                  {r.paymentTransactionId && (
                    <p>
                      <span className="guest-booking-detail-modal__meta-label">Txn ID</span> {String(r.paymentTransactionId)}
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
                <dd>{r.customerName || '—'}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{r.email || '—'}</dd>
              </div>
              <div>
                <dt>Contact</dt>
                <dd>{r.contactNumber || '—'}</dd>
              </div>
              <div>
                <dt>Check-In</dt>
                <dd>{r.checkIn ? String(r.checkIn) : '—'}</dd>
              </div>
              <div>
                <dt>Check-Out</dt>
                <dd>{r.checkOut ? String(r.checkOut) : '—'}</dd>
              </div>
              <div>
                <dt>Additional Guest</dt>
                <dd>{r.additionalGuests != null ? String(r.additionalGuests) : '0'}</dd>
              </div>
            </dl>
            {r.createdAt && (
              <p className="guest-booking-detail-modal__booked-at">Booked {formatCreated(r.createdAt)}</p>
            )}
          </section>
        </div>

        {(r.proofOfPaymentDataUrl || r.paymentType) && (
          <section className="guest-booking-detail-modal__card guest-booking-detail-modal__card--full" aria-labelledby={`${titleId}-extra`}>
            <h3 id={`${titleId}-extra`} className="guest-booking-detail-modal__card-title">
              Payment
            </h3>
            {r.paymentType && (
              <p className="guest-booking-detail-modal__payment-type">
                {r.paymentType === 'downpayment' ? 'Down payment' : 'Paid in full'}
              </p>
            )}
            {r.proofOfPaymentDataUrl && (
              <div className="guest-bookings__proof guest-bookings__proof--modal">
                {proofKind === 'image' && (
                  <img
                    src={r.proofOfPaymentDataUrl}
                    alt="Payment receipt or transfer screenshot"
                    className="guest-bookings__proof-img"
                  />
                )}
                {proofKind === 'pdf' && (
                  <div className="guest-bookings__proof-pdf">
                    <iframe title="Proof of payment PDF" src={r.proofOfPaymentDataUrl} className="guest-bookings__proof-iframe" />
                  </div>
                )}
                {proofKind === 'other' && (
                  <p className="guest-bookings__proof-fallback">Proof file attached (preview not shown).</p>
                )}
                {r.proofOfPaymentName && (
                  <p className="guest-bookings__proof-filename">{String(r.proofOfPaymentName)}</p>
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </>
  )
}
