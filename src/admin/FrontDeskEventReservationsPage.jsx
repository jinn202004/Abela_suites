import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchEventBookings, fetchEventVenues } from '../api/guestApi'
import { sortEventBookingsByEventDateDesc } from '../guest/guestBookingListSort'
import {
  formatRoomReservationStatusLabel,
  frontDeskRoomReservationPillClass,
  normalizeRoomReservationStatus,
} from '../guest/roomReservationStatus'
import AdminHeader from './AdminHeader'
import FrontDeskEventReservationModal from './FrontDeskEventReservationModal'
import './FrontDeskRoomReservationsPage.css'

function formatEventDates(start, end) {
  if (!start && !end) return '—'
  const s = start != null ? String(start).slice(0, 10) : ''
  const e = end != null ? String(end).slice(0, 10) : ''
  if (s && e && s !== e) return `${s} → ${e}`
  return s || e || '—'
}

function formatPeso(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function getEventTotalRaw(b) {
  const raw = b.totalAmount ?? b.totalEventAmount ?? b.venuePrice
  if (raw == null || String(raw).trim() === '') return null
  const n = parseFloat(String(raw).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function matchesStatusFilter(b, showPending, showApproved, showDeclined) {
  const k = normalizeRoomReservationStatus(b.status)
  if (k === 'pending') return showPending
  if (k === 'approved') return showApproved
  if (k === 'declined') return showDeclined
  return showPending
}

export default function FrontDeskEventReservationsPage() {
  const [venues, setVenues] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showPending, setShowPending] = useState(true)
  const [showApproved, setShowApproved] = useState(true)
  const [showDeclined, setShowDeclined] = useState(true)
  const statusFilterMasterRef = useRef(null)
  const [dialog, setDialog] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [venueData, bookingData] = await Promise.all([fetchEventVenues(), fetchEventBookings()])
      setVenues(Array.isArray(venueData) ? venueData : [])
      const list = Array.isArray(bookingData) ? bookingData : []
      setBookings(sortEventBookingsByEventDateDesc(list))
    } catch {
      setVenues([])
      setBookings([])
      setLoadError('Could not load event bookings. Ensure the API is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const venueById = useMemo(() => {
    const m = new Map()
    for (const v of venues) {
      m.set(String(v.id), v)
    }
    return m
  }, [venues])

  useEffect(() => {
    const el = statusFilterMasterRef.current
    if (!el) return
    el.indeterminate = showPending !== showApproved || showApproved !== showDeclined
  }, [showPending, showApproved, showDeclined])

  const filtered = useMemo(() => {
    if (!showPending && !showApproved && !showDeclined) return []
    return bookings.filter((b) => matchesStatusFilter(b, showPending, showApproved, showDeclined))
  }, [bookings, showPending, showApproved, showDeclined])

  const handleStatusFilterAll = (e) => {
    const checked = e.target.checked
    setShowPending(checked)
    setShowApproved(checked)
    setShowDeclined(checked)
  }

  const guestName = (b) => {
    const n = b.customerName ?? b.name
    if (typeof n === 'string' && n.trim()) return n.trim()
    return '—'
  }

  const venueDisplay = (b) => {
    const v = venueById.get(String(b.eventVenueId))
    return v?.name?.trim() || b.venueName?.trim() || '—'
  }

  return (
    <>
      <AdminHeader />
      {dialog && (
        <FrontDeskEventReservationModal
          isOpen
          mode={dialog.mode}
          booking={dialog.booking}
          venues={venues}
          onClose={() => setDialog(null)}
          onUpdated={load}
        />
      )}
      <main className="fd-room-res">
        <div className="fd-room-res__toolbar">
          <div>
            <h1 className="fd-room-res__heading">Event reservations</h1>
            <p className="fd-room-res__sub">View event bookings and filter by Pending, Approved, or Declined.</p>
          </div>
          <button type="button" className="fd-room-res__refresh" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {loadError && (
          <p className="fd-room-res__banner fd-room-res__banner--warn" role="status">
            {loadError}
          </p>
        )}

        <div className="fd-room-res__filter-row" role="group" aria-labelledby="fd-event-res-filter-label">
          <span id="fd-event-res-filter-label" className="fd-room-res__filter-label">
            Status
          </span>
          <div className="fd-room-res__filter-checks">
            <label className="fd-room-res__filter-check fd-room-res__filter-check--master">
              <input
                ref={statusFilterMasterRef}
                type="checkbox"
                checked={showPending && showApproved && showDeclined}
                onChange={handleStatusFilterAll}
                aria-label="Select all status filters"
              />
              <span>All</span>
            </label>
            <span className="fd-room-res__filter-sep" aria-hidden>
              |
            </span>
            <label className="fd-room-res__filter-check">
              <input type="checkbox" checked={showPending} onChange={(e) => setShowPending(e.target.checked)} />
              <span>Pending</span>
            </label>
            <label className="fd-room-res__filter-check">
              <input type="checkbox" checked={showApproved} onChange={(e) => setShowApproved(e.target.checked)} />
              <span>Approved</span>
            </label>
            <label className="fd-room-res__filter-check">
              <input type="checkbox" checked={showDeclined} onChange={(e) => setShowDeclined(e.target.checked)} />
              <span>Declined</span>
            </label>
          </div>
          {!loading && (
            <span className="fd-room-res__count" aria-live="polite">
              Showing {filtered.length} of {bookings.length}
            </span>
          )}
        </div>

        {loading ? (
          <p className="fd-room-res__loading">Loading event bookings…</p>
        ) : (
          <div className="fd-room-res__table-wrap">
            <table className="fd-room-res__table">
              <thead>
                <tr>
                  <th scope="col">Guest</th>
                  <th scope="col">Venue</th>
                  <th scope="col">Event dates</th>
                  <th scope="col">Status</th>
                  <th scope="col">Total</th>
                  <th scope="col" className="fd-room-res__th-actions">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="fd-room-res__empty">
                      {bookings.length === 0
                        ? 'No event bookings yet.'
                        : !showPending && !showApproved && !showDeclined
                          ? 'Select at least one status above to show bookings.'
                          : 'No bookings match the selected filters.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((b) => {
                    const statusLabel = formatRoomReservationStatusLabel(b.status)
                    const pillClass = frontDeskRoomReservationPillClass(b.status)
                    const canReview = normalizeRoomReservationStatus(b.status) === 'pending'
                    return (
                      <tr key={String(b.id)}>
                        <td>{guestName(b)}</td>
                        <td>{venueDisplay(b)}</td>
                        <td>{formatEventDates(b.eventDate, b.eventEndDate)}</td>
                        <td>
                          <span className={pillClass}>{statusLabel}</span>
                        </td>
                        <td>{formatPeso(getEventTotalRaw(b))}</td>
                        <td className="fd-room-res__actions">
                          {canReview && (
                            <button
                              type="button"
                              className="fd-room-res__action fd-room-res__action--review"
                              onClick={() => setDialog({ mode: 'review', booking: b })}
                            >
                              Review
                            </button>
                          )}
                          <button
                            type="button"
                            className="fd-room-res__action fd-room-res__action--view"
                            onClick={() => setDialog({ mode: 'view', booking: b })}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
