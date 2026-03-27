import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchEventBookings, fetchEventVenues, fetchReservations, fetchRooms } from '../api/guestApi'
import { sortEventBookingsByEventDateDesc, sortReservationsByStayDateDesc } from '../guest/guestBookingListSort'
import { formatRoomReservationStatusLabel, normalizeRoomReservationStatus } from '../guest/roomReservationStatus'
import AdminHeader from './AdminHeader'
import FrontDeskEventReservationModal from './FrontDeskEventReservationModal'
import FrontDeskReservationModal from './FrontDeskReservationModal'
import './AdminBookingManagementPage.css'

function todayLocalYMD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateCell(value) {
  if (value == null || String(value).trim() === '') return '—'
  const s = String(value).slice(0, 10)
  const d = new Date(`${s}T12:00:00`)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatPeso(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function roomTotalRaw(r) {
  const t = Number(r.totalStayAmount)
  return Number.isFinite(t) && t > 0 ? t : null
}

function roomBalance(r) {
  const total = Number(r.totalStayAmount)
  const paid = Number(r.paymentAmount)
  if (!Number.isFinite(total) || total <= 0) return 0
  if (!Number.isFinite(paid) || paid < 0) return total
  return Math.max(0, total - paid)
}

function getEventTotalRaw(b) {
  const raw = b.totalAmount ?? b.totalEventAmount ?? b.venuePrice
  if (raw == null || String(raw).trim() === '') return null
  const n = parseFloat(String(raw).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function eventBalance(b) {
  const total = getEventTotalRaw(b)
  if (total == null) return 0
  const paid = Number(b.paymentAmount)
  if (!Number.isFinite(paid) || paid < 0) return total
  return Math.max(0, total - paid)
}

function formatEventDates(start, end) {
  if (!start && !end) return '—'
  const s = start != null ? String(start).slice(0, 10) : ''
  const e = end != null ? String(end).slice(0, 10) : ''
  if (s && e && s !== e) return `${formatDateCell(s)} → ${formatDateCell(e)}`
  return formatDateCell(s || e)
}

function guestNameRoom(r) {
  const n = r.customerName ?? r.name
  if (typeof n === 'string' && n.trim()) return n.trim()
  return ''
}

function guestNameEvent(b) {
  const n = b.customerName ?? b.name
  if (typeof n === 'string' && n.trim()) return n.trim()
  return ''
}

function matchesSearch(q, name) {
  if (!q.trim()) return true
  return name.toLowerCase().includes(q.trim().toLowerCase())
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function openPrintWindow(title, innerHtml) {
  const w = window.open('', '_blank')
  if (!w) return
  const doc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, Segoe UI, sans-serif; padding: 1.25rem; color: #222; max-width: 40rem; margin: 0 auto; }
    h1 { font-size: 1.1rem; margin: 0 0 1rem; border-bottom: 1px solid #ccc; padding-bottom: 0.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th { text-align: left; width: 38%; padding: 0.35rem 0.5rem 0.35rem 0; color: #555; font-weight: 600; vertical-align: top; }
    td { padding: 0.35rem 0; vertical-align: top; }
    tr + tr th, tr + tr td { border-top: 1px solid #eee; }
    @media print { body { padding: 0.5rem; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${innerHtml}
</body>
</html>`
  w.document.open()
  w.document.write(doc)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
    w.close()
  }, 200)
}

function printRoomBooking(r, roomTitle) {
  const status = formatRoomReservationStatusLabel(r.status)
  const rows = [
    ['Guest', r.customerName || '—'],
    ['Email', r.email || '—'],
    ['Contact', r.contactNumber || '—'],
    ['Room / type', roomTitle],
    ['Check-in', formatDateCell(r.checkIn)],
    ['Check-out', formatDateCell(r.checkOut)],
    ['Status', status],
    ['Total', roomTotalRaw(r) != null ? formatPeso(roomTotalRaw(r)) : '—'],
  ]
  if (typeof r.declineReason === 'string' && r.declineReason.trim()) {
    rows.push(['Decline reason', r.declineReason.trim()])
  }
  const inner = `<table><tbody>${rows
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join('')}</tbody></table>`
  openPrintWindow(`Room booking #${r.id}`, inner)
}

function printEventBooking(b, venueTitle) {
  const status = formatRoomReservationStatusLabel(b.status)
  const price = getEventTotalRaw(b)
  const rows = [
    ['Guest', b.customerName || '—'],
    ['Email', b.email || '—'],
    ['Contact', b.contactNumber || '—'],
    ['Event', b.eventTitle?.trim() || '—'],
    ['Venue', venueTitle],
    ['Event dates', formatEventDates(b.eventDate, b.eventEndDate)],
    ['Status', status],
    ['Price', price != null ? formatPeso(price) : '—'],
  ]
  if (typeof b.declineReason === 'string' && b.declineReason.trim()) {
    rows.push(['Decline reason', b.declineReason.trim()])
  }
  const inner = `<table><tbody>${rows
    .map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join('')}</tbody></table>`
  openPrintWindow(`Event booking #${b.id}`, inner)
}

function IconView() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconPrint() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8Z" strokeLinejoin="round" />
    </svg>
  )
}

export default function AdminBookingManagementPage() {
  const [tab, setTab] = useState('room')
  const [search, setSearch] = useState('')
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [venues, setVenues] = useState([])
  const [eventBookings, setEventBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [viewOpen, setViewOpen] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const [roomData, resData, venueData, ebData] = await Promise.all([
        fetchRooms(),
        fetchReservations(),
        fetchEventVenues(),
        fetchEventBookings(),
      ])
      setRooms(Array.isArray(roomData) ? roomData : [])
      const resList = Array.isArray(resData) ? resData : []
      setReservations(sortReservationsByStayDateDesc(resList))
      setVenues(Array.isArray(venueData) ? venueData : [])
      const ebList = Array.isArray(ebData) ? ebData : []
      setEventBookings(sortEventBookingsByEventDateDesc(ebList))
    } catch {
      setRooms([])
      setReservations([])
      setVenues([])
      setEventBookings([])
      setLoadError('Could not load bookings. Ensure the API is running.')
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

  const venueById = useMemo(() => {
    const m = new Map()
    for (const v of venues) {
      m.set(String(v.id), v)
    }
    return m
  }, [venues])

  const today = todayLocalYMD()

  const roomRowsFiltered = useMemo(() => {
    const q = search
    return reservations.filter((r) => matchesSearch(q, guestNameRoom(r)))
  }, [reservations, search])

  const eventRowsFiltered = useMemo(() => {
    const q = search
    return eventBookings.filter((b) => matchesSearch(q, guestNameEvent(b)))
  }, [eventBookings, search])

  const statsRoom = useMemo(() => {
    const list = reservations
    const todayCount = list.filter((r) => String(r.checkIn ?? '').slice(0, 10) === today).length
    const totalBal = list.reduce((sum, r) => sum + roomBalance(r), 0)
    return { today: todayCount, total: list.length, balance: totalBal }
  }, [reservations, today])

  const statsEvent = useMemo(() => {
    const list = eventBookings
    const todayCount = list.filter((b) => String(b.eventDate ?? '').slice(0, 10) === today).length
    const totalBal = list.reduce((sum, b) => sum + eventBalance(b), 0)
    return { today: todayCount, total: list.length, balance: totalBal }
  }, [eventBookings, today])

  const stats = tab === 'room' ? statsRoom : statsEvent

  const roomTypeLabel = (r) => {
    const room = roomById.get(String(r.roomId))
    return room?.title?.trim() || r.roomTitle?.trim() || '—'
  }

  const venueLabel = (b) => {
    const v = venueById.get(String(b.eventVenueId))
    return v?.name?.trim() || b.venueName?.trim() || '—'
  }

  return (
    <>
      <AdminHeader />
      {viewOpen?.type === 'room' && (
        <FrontDeskReservationModal
          isOpen
          mode="view"
          reservation={viewOpen.item}
          rooms={rooms}
          onClose={() => setViewOpen(null)}
          onUpdated={load}
        />
      )}
      {viewOpen?.type === 'event' && (
        <FrontDeskEventReservationModal
          isOpen
          mode="view"
          booking={viewOpen.item}
          venues={venues}
          onClose={() => setViewOpen(null)}
          onUpdated={load}
        />
      )}
      <main className="admin-booking-mgmt">
        <header className="admin-booking-mgmt__intro">
          <h1 className="admin-booking-mgmt__heading">Booking Management Dashboard</h1>
          {/* <p className="admin-booking-mgmt__sub">Manage your hotel rooms, reservations, and availability.</p> */}
        </header>

        <section className="admin-booking-mgmt__stats" aria-label="Booking summary">
          <article className="admin-booking-mgmt__stat-card">
            <h2 className="admin-booking-mgmt__stat-label">Reservation today</h2>
            <p className="admin-booking-mgmt__stat-value">{loading ? '—' : stats.today}</p>
          </article>
          <article className="admin-booking-mgmt__stat-card">
            <h2 className="admin-booking-mgmt__stat-label">Total reservation</h2>
            <p className="admin-booking-mgmt__stat-value">{loading ? '—' : stats.total}</p>
          </article>
          <article className="admin-booking-mgmt__stat-card">
            <h2 className="admin-booking-mgmt__stat-label">Total balance</h2>
            <p className="admin-booking-mgmt__stat-value admin-booking-mgmt__stat-value--money">
              {loading ? '—' : formatPeso(stats.balance)}
            </p>
          </article>
        </section>

        <div className="admin-booking-mgmt__tabs" role="tablist" aria-label="Booking type">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'room'}
            className={`admin-booking-mgmt__tab ${tab === 'room' ? 'admin-booking-mgmt__tab--active' : ''}`.trim()}
            onClick={() => setTab('room')}
          >
            Room reservation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'event'}
            className={`admin-booking-mgmt__tab ${tab === 'event' ? 'admin-booking-mgmt__tab--active' : ''}`.trim()}
            onClick={() => setTab('event')}
          >
            Event reservation
          </button>
        </div>

        <div className="admin-booking-mgmt__search-wrap">
          <span className="admin-booking-mgmt__search-icon" aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </span>
          <input
            type="search"
            className="admin-booking-mgmt__search"
            placeholder="Search guest…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search by guest name"
          />
        </div>

        {loadError && (
          <p className="admin-booking-mgmt__banner" role="status">
            {loadError}
          </p>
        )}

        <section className="admin-booking-mgmt__table-section" aria-labelledby="admin-booking-mgmt-table-title">
          <h2 id="admin-booking-mgmt-table-title" className="admin-booking-mgmt__table-title">
            Reservation status
          </h2>

          {loading ? (
            <p className="admin-booking-mgmt__loading">Loading…</p>
          ) : tab === 'room' ? (
            <div className="admin-booking-mgmt__table-scroll">
              <table className="admin-booking-mgmt__table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Type</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Price</th>
                    <th scope="col">Check-in</th>
                    <th scope="col">Check-out</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="admin-booking-mgmt__th-actions">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roomRowsFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="admin-booking-mgmt__empty">
                        No room reservations match your search.
                      </td>
                    </tr>
                  ) : (
                    roomRowsFiltered.map((r, i) => {
                      const price = roomTotalRaw(r)
                      const typeStr = roomTypeLabel(r)
                      return (
                        <tr key={String(r.id)}>
                          <td>{i + 1}</td>
                          <td>{typeStr}</td>
                          <td>{guestNameRoom(r) || '—'}</td>
                          <td>{price != null ? formatPeso(price) : '—'}</td>
                          <td>{formatDateCell(r.checkIn)}</td>
                          <td>{formatDateCell(r.checkOut)}</td>
                          <td>
                            <span
                              className={`admin-booking-mgmt__pill admin-booking-mgmt__pill--${normalizeRoomReservationStatus(r.status)}`}
                            >
                              {formatRoomReservationStatusLabel(r.status)}
                            </span>
                          </td>
                          <td className="admin-booking-mgmt__actions">
                            <button
                              type="button"
                              className="admin-booking-mgmt__icon-btn"
                              onClick={() => setViewOpen({ type: 'room', item: r })}
                              aria-label={`View room booking ${i + 1}`}
                              title="View details"
                            >
                              <IconView />
                            </button>
                            <button
                              type="button"
                              className="admin-booking-mgmt__icon-btn"
                              onClick={() => printRoomBooking(r, typeStr)}
                              aria-label={`Print room booking ${i + 1}`}
                              title="Print"
                            >
                              <IconPrint />
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="admin-booking-mgmt__table-scroll">
              <table className="admin-booking-mgmt__table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Event</th>
                    <th scope="col">Venue</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Price</th>
                    <th scope="col">Event dates</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="admin-booking-mgmt__th-actions">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {eventRowsFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="admin-booking-mgmt__empty">
                        No event bookings match your search.
                      </td>
                    </tr>
                  ) : (
                    eventRowsFiltered.map((b, i) => {
                      const price = getEventTotalRaw(b)
                      const vLabel = venueLabel(b)
                      return (
                        <tr key={String(b.id)}>
                          <td>{i + 1}</td>
                          <td>{b.eventTitle?.trim() || '—'}</td>
                          <td>{vLabel}</td>
                          <td>{guestNameEvent(b) || '—'}</td>
                          <td>{price != null ? formatPeso(price) : '—'}</td>
                          <td>{formatEventDates(b.eventDate, b.eventEndDate)}</td>
                          <td>
                            <span
                              className={`admin-booking-mgmt__pill admin-booking-mgmt__pill--${normalizeRoomReservationStatus(b.status)}`}
                            >
                              {formatRoomReservationStatusLabel(b.status)}
                            </span>
                          </td>
                          <td className="admin-booking-mgmt__actions">
                            <button
                              type="button"
                              className="admin-booking-mgmt__icon-btn"
                              onClick={() => setViewOpen({ type: 'event', item: b })}
                              aria-label={`View event booking ${i + 1}`}
                              title="View details"
                            >
                              <IconView />
                            </button>
                            <button
                              type="button"
                              className="admin-booking-mgmt__icon-btn"
                              onClick={() => printEventBooking(b, vLabel)}
                              aria-label={`Print event booking ${i + 1}`}
                              title="Print"
                            >
                              <IconPrint />
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
        </section>
      </main>
    </>
  )
}
