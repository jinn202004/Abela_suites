import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchReservations, fetchRooms } from '../api/guestApi'
import { sortReservationsByStayDateDesc } from '../guest/guestBookingListSort'
import {
  formatRoomReservationStatusLabel,
  frontDeskRoomReservationPillClass,
  normalizeRoomReservationStatus,
} from '../guest/roomReservationStatus'
import AdminHeader from './AdminHeader'
import FrontDeskReservationModal from './FrontDeskReservationModal'
import './FrontDeskRoomReservationsPage.css'

function formatDateYMD(value) {
  if (value == null || String(value).trim() === '') return '—'
  const s = String(value).slice(0, 10)
  const d = new Date(`${s}T12:00:00`)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function formatPeso(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function matchesStatusFilter(r, showPending, showApproved, showDeclined) {
  const k = normalizeRoomReservationStatus(r.status)
  if (k === 'pending') return showPending
  if (k === 'approved') return showApproved
  if (k === 'declined') return showDeclined
  return showPending
}

export default function FrontDeskRoomReservationsPage() {
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
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
      const [roomData, resData] = await Promise.all([fetchRooms(), fetchReservations()])
      setRooms(Array.isArray(roomData) ? roomData : [])
      const list = Array.isArray(resData) ? resData : []
      setReservations(sortReservationsByStayDateDesc(list))
    } catch {
      setRooms([])
      setReservations([])
      setLoadError('Could not load reservations. Ensure the API is running.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const roomById = useMemo(() => {
    const m = new Map()
    for (const room of rooms) {
      m.set(String(room.id), room)
    }
    return m
  }, [rooms])

  useEffect(() => {
    const el = statusFilterMasterRef.current
    if (!el) return
    el.indeterminate = showPending !== showApproved || showApproved !== showDeclined
  }, [showPending, showApproved, showDeclined])

  const filtered = useMemo(() => {
    if (!showPending && !showApproved && !showDeclined) return []
    return reservations.filter((r) => matchesStatusFilter(r, showPending, showApproved, showDeclined))
  }, [reservations, showPending, showApproved, showDeclined])

  const handleStatusFilterAll = (e) => {
    const checked = e.target.checked
    setShowPending(checked)
    setShowApproved(checked)
    setShowDeclined(checked)
  }

  const guestName = (r) => {
    const n = r.customerName ?? r.name
    if (typeof n === 'string' && n.trim()) return n.trim()
    return '—'
  }

  const roomDisplay = (r) => {
    const room = roomById.get(String(r.roomId))
    const num = room?.roomNumber != null && String(room.roomNumber).trim() !== '' ? String(room.roomNumber) : ''
    const title = room?.title ?? r.roomTitle ?? 'Room'
    return num ? `Room ${num} — ${title}` : title
  }

  return (
    <>
      <AdminHeader />
      {dialog && (
        <FrontDeskReservationModal
          isOpen
          mode={dialog.mode}
          reservation={dialog.reservation}
          rooms={rooms}
          onClose={() => setDialog(null)}
          onUpdated={load}
        />
      )}
      <main className="fd-room-res">
        <div className="fd-room-res__toolbar">
          <div>
            <h1 className="fd-room-res__heading">Room reservations</h1>
            <p className="fd-room-res__sub">View room reservations and filter by Pending, Approved, or Declined.</p>
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

        <div className="fd-room-res__filter-row" role="group" aria-labelledby="fd-room-res-filter-label">
          <span id="fd-room-res-filter-label" className="fd-room-res__filter-label">
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
              <input
                type="checkbox"
                checked={showPending}
                onChange={(e) => setShowPending(e.target.checked)}
              />
              <span>Pending</span>
            </label>
            <label className="fd-room-res__filter-check">
              <input
                type="checkbox"
                checked={showApproved}
                onChange={(e) => setShowApproved(e.target.checked)}
              />
              <span>Approved</span>
            </label>
            <label className="fd-room-res__filter-check">
              <input
                type="checkbox"
                checked={showDeclined}
                onChange={(e) => setShowDeclined(e.target.checked)}
              />
              <span>Declined</span>
            </label>
          </div>
          {!loading && (
            <span className="fd-room-res__count" aria-live="polite">
              Showing {filtered.length} of {reservations.length}
            </span>
          )}
        </div>

        {loading ? (
          <p className="fd-room-res__loading">Loading reservations…</p>
        ) : (
          <div className="fd-room-res__table-wrap">
            <table className="fd-room-res__table">
              <thead>
                <tr>
                  <th scope="col">Guest</th>
                  <th scope="col">Room</th>
                  <th scope="col">Check-in</th>
                  <th scope="col">Check-out</th>
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
                    <td colSpan={7} className="fd-room-res__empty">
                      {reservations.length === 0
                        ? 'No room reservations yet.'
                        : !showPending && !showApproved && !showDeclined
                          ? 'Select at least one status above to show reservations.'
                          : 'No reservations match the selected filters.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const statusLabel = formatRoomReservationStatusLabel(r.status)
                    const pillClass = frontDeskRoomReservationPillClass(r.status)
                    const canReview = normalizeRoomReservationStatus(r.status) === 'pending'
                    return (
                      <tr key={String(r.id)}>
                        <td>{guestName(r)}</td>
                        <td>{roomDisplay(r)}</td>
                        <td>{formatDateYMD(r.checkIn)}</td>
                        <td>{formatDateYMD(r.checkOut)}</td>
                        <td>
                          <span className={pillClass}>{statusLabel}</span>
                        </td>
                        <td>{formatPeso(r.totalStayAmount)}</td>
                        <td className="fd-room-res__actions">
                          {canReview && (
                            <button
                              type="button"
                              className="fd-room-res__action fd-room-res__action--review"
                              onClick={() => setDialog({ mode: 'review', reservation: r })}
                            >
                              Review
                            </button>
                          )}
                          <button
                            type="button"
                            className="fd-room-res__action fd-room-res__action--view"
                            onClick={() => setDialog({ mode: 'view', reservation: r })}
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
