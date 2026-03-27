import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchReservations, fetchRooms } from '../api/guestApi'
import { GUEST_ROOMS } from '../guest/guestRoomsData'
import { formatRoomReservationStatusLabel, normalizeRoomReservationStatus } from '../guest/roomReservationStatus'
import AdminHeader from './AdminHeader'
import {
  FRONTDESK_DEMO_ROOMS,
  FRONTDESK_RESERVED_SNAPSHOT,
  FRONTDESK_STATS_DEFAULT,
} from './frontDeskDashboardData'
import './FrontDeskDashboardPage.css'

function getTodayYMD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isStayActiveToday(res, todayYMD) {
  const ci = res.checkIn != null ? String(res.checkIn).slice(0, 10) : ''
  const co = res.checkOut != null ? String(res.checkOut).slice(0, 10) : ''
  if (!ci || !co) return false
  return ci <= todayYMD && todayYMD < co
}

function isRoomOccupiedToday(room, reservations, todayYMD) {
  return reservations.some(
    (res) =>
      String(res.roomId) === String(room.id) &&
      isStayActiveToday(res, todayYMD) &&
      normalizeRoomReservationStatus(res.status) === 'approved',
  )
}

/** Canonical keys: available | occupied | needs_cleaning | under_maintenance | unavailable */
function normalizeRoomStatusKey(raw) {
  if (raw == null || raw === '') return null
  const s = String(raw).trim().toLowerCase()
  const compact = s.replace(/\s+/g, '_')
  if (compact === 'available' || s === 'available') return 'available'
  if (compact === 'occupied' || s === 'occupied') return 'occupied'
  if (compact === 'unavailable' || s === 'unavailable') return 'unavailable'
  if (
    compact === 'needs_cleaning' ||
    compact === 'need_clean' ||
    s === 'needs cleaning' ||
    s === 'need clean'
  ) {
    return 'needs_cleaning'
  }
  if (compact === 'under_maintenance' || compact === 'maintenance' || s === 'under maintenance') {
    return 'under_maintenance'
  }
  return null
}

function deriveStatus(room, reservations, todayYMD) {
  const explicit = normalizeRoomStatusKey(room.roomStatus ?? room.status ?? room.cleaningStatus)
  if (explicit === 'unavailable' || explicit === 'under_maintenance') {
    return explicit
  }
  if (explicit === 'needs_cleaning') {
    return 'needs_cleaning'
  }
  if (isRoomOccupiedToday(room, reservations, todayYMD)) {
    return 'occupied'
  }
  if (explicit === 'occupied') {
    return 'occupied'
  }
  if (explicit === 'available') {
    return 'available'
  }
  return 'available'
}

function formatPeso(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function statusPillClass(status) {
  if (status === 'occupied') return 'fd-dash__pill fd-dash__pill--occupied'
  if (status === 'needs_cleaning') return 'fd-dash__pill fd-dash__pill--needs_cleaning'
  if (status === 'under_maintenance') return 'fd-dash__pill fd-dash__pill--under_maintenance'
  if (status === 'unavailable') return 'fd-dash__pill fd-dash__pill--unavailable'
  return 'fd-dash__pill fd-dash__pill--available'
}

function statusLabel(status) {
  const labels = {
    available: 'Available',
    occupied: 'Occupied',
    needs_cleaning: 'Needs cleaning',
    under_maintenance: 'Under maintenance',
    unavailable: 'Unavailable',
  }
  return labels[status] ?? status
}

function daysInMonth(year, monthIndex0) {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

function ymdParts(ymd) {
  const s = String(ymd).slice(0, 10)
  const [y, m, d] = s.split('-').map((x) => Number(x))
  return { y, m, d }
}

/** Stays overlapping this calendar month → list items for reserved-days panel */
function reservedLinesForMonth(rooms, reservations, year, monthIndex0) {
  const roomById = new Map(rooms.map((r) => [String(r.id), r]))
  const first = new Date(year, monthIndex0, 1)
  const lastDay = daysInMonth(year, monthIndex0)
  const last = new Date(year, monthIndex0, lastDay, 23, 59, 59)
  const lines = []

  for (const res of reservations) {
    if (normalizeRoomReservationStatus(res.status) !== 'approved') continue
    const ci = res.checkIn != null ? String(res.checkIn).slice(0, 10) : ''
    const co = res.checkOut != null ? String(res.checkOut).slice(0, 10) : ''
    if (!ci || !co) continue
    const start = new Date(`${ci}T12:00:00`)
    const end = new Date(`${co}T12:00:00`)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) continue
    if (end <= first || start >= last) continue

    const room = roomById.get(String(res.roomId))
    const num = room?.roomNumber != null ? String(room.roomNumber) : String(res.roomId ?? '—')
    const name =
      (typeof res.customerName === 'string' && res.customerName.trim()) ||
      (typeof res.name === 'string' && res.name.trim()) ||
      'Guest'
    const statusText = formatRoomReservationStatusLabel(res.status)

    for (let day = 1; day <= lastDay; day++) {
      const ds = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (ds >= ci && ds < co) {
        lines.push({
          id: `api-${res.id}-${ds}`,
          sort: day,
          day,
          month: monthIndex0 + 1,
          year,
          label: `Room ${num} — ${name}`,
          detail: `Status: ${statusText}`,
        })
      }
    }
  }

  const snapshot = FRONTDESK_RESERVED_SNAPSHOT.filter(
    (s) => s.year === year && s.month === monthIndex0 + 1,
  ).map((s) => ({
    id: s.id,
    sort: s.day,
    day: s.day,
    month: s.month,
    year: s.year,
    label: s.label,
    detail: s.detail,
  }))

  const merged = [...snapshot, ...lines]
  merged.sort((a, b) => a.sort - b.sort || String(a.label).localeCompare(String(b.label)))
  return merged
}

function countReservationsToday(reservations, todayYMD) {
  return reservations.filter((res) => {
    if (normalizeRoomReservationStatus(res.status) !== 'approved') return false
    const ci = res.checkIn != null ? String(res.checkIn).slice(0, 10) : ''
    const co = res.checkOut != null ? String(res.checkOut).slice(0, 10) : ''
    if (!ci || !co) return false
    return ci <= todayYMD && todayYMD < co
  }).length
}

function sumBalanceDue(reservations) {
  let sum = 0
  for (const r of reservations) {
    if (normalizeRoomReservationStatus(r.status) !== 'approved') continue
    const total = Number(r.totalStayAmount)
    const paid = Number(r.paymentAmount)
    if (!Number.isFinite(total) || total <= 0) continue
    const bal =
      r.paymentType === 'downpayment' && Number.isFinite(paid) ? Math.max(0, total - paid) : 0
    if (bal > 0) sum += bal
  }
  return sum
}

export default function FrontDeskDashboardPage() {
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const todayYMD = getTodayYMD()
  const { y: ty, m: tm } = ymdParts(todayYMD)
  const [viewYear, setViewYear] = useState(ty)
  const [viewMonth, setViewMonth] = useState(tm - 1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchRooms()
      if (Array.isArray(data) && data.length > 0) {
        setRooms(data)
        try {
          const resList = await fetchReservations()
          setReservations(Array.isArray(resList) ? resList : [])
        } catch {
          setReservations([])
        }
      } else {
        setRooms([])
        setReservations([])
      }
    } catch {
      setRooms(GUEST_ROOMS)
      try {
        const resList = await fetchReservations()
        setReservations(Array.isArray(resList) ? resList : [])
      } catch {
        setReservations([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const tableRows = useMemo(() => {
    const useDemo = rooms.length === 0
    const rows = useDemo
      ? FRONTDESK_DEMO_ROOMS.map((r) => ({
          id: r.id,
          roomNumber: r.roomLabel,
          title: r.title,
          price: r.price,
          status: normalizeRoomStatusKey(r.status) ?? 'available',
        }))
      : [...rooms]
          .sort((a, b) =>
            String(a.roomNumber ?? '').localeCompare(String(b.roomNumber ?? ''), undefined, { numeric: true }),
          )
          .map((room) => ({
            id: String(room.id),
            roomNumber: room.roomNumber ?? '—',
            title: room.title ?? '—',
            price: room.price,
            status: deriveStatus(room, reservations, todayYMD),
          }))

    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        String(r.roomNumber).toLowerCase().includes(q) ||
        String(r.title).toLowerCase().includes(q) ||
        statusLabel(r.status).toLowerCase().includes(q),
    )
  }, [rooms, reservations, search, todayYMD])

  const stats = useMemo(() => {
    if (rooms.length === 0) {
      return FRONTDESK_STATS_DEFAULT
    }
    const todayCount = countReservationsToday(reservations, todayYMD)
    const total = reservations.length
    const toCollect = sumBalanceDue(reservations)
    return {
      reservationsToday: todayCount,
      totalReservations: total,
      toCollect,
    }
  }, [rooms.length, reservations, todayYMD])

  const reservedLines = useMemo(() => {
    if (rooms.length === 0) {
      return FRONTDESK_RESERVED_SNAPSHOT.filter((s) => s.year === viewYear && s.month === viewMonth + 1).map(
        (s) => ({
          key: s.id,
          line: `${s.label}, ${s.detail} (${monthName(viewMonth)} ${s.day}, ${s.year})`,
        }),
      )
    }
    const lines = reservedLinesForMonth(rooms, reservations, viewYear, viewMonth)
    return lines.map((s) => ({
      key: s.id,
      line: `${s.label}, ${s.detail} (${monthName(viewMonth)} ${s.day}, ${s.year})`,
    }))
  }, [rooms, reservations, viewYear, viewMonth])

  const calendarDays = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay()
    const dim = daysInMonth(viewYear, viewMonth)
    const cells = []
    for (let i = 0; i < firstDow; i++) cells.push({ key: `pad-${i}`, day: null })
    for (let d = 1; d <= dim; d++) cells.push({ key: `d-${d}`, day: d })
    return cells
  }, [viewYear, viewMonth])

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  return (
    <>
      <AdminHeader />
      <main className="fd-dash">
        <header className="fd-dash__intro">
          <h1 className="fd-dash__title">Front Desk Dashboard</h1>
          {/* <p className="fd-dash__sub">Manage your hotel rooms, reservations, and availability.</p> */}
        </header>

        <section className="fd-dash__stats" aria-label="Summary">
          <article className="fd-dash__stat-card">
            <h2 className="fd-dash__stat-label">Reservations for Today</h2>
            <p className="fd-dash__stat-value">{stats.reservationsToday}</p>
          </article>
          <article className="fd-dash__stat-card">
            <h2 className="fd-dash__stat-label">Total Reservations</h2>
            <p className="fd-dash__stat-value">{stats.totalReservations}</p>
          </article>
          <article className="fd-dash__stat-card">
            <h2 className="fd-dash__stat-label">To Collect</h2>
            <p className="fd-dash__stat-value fd-dash__stat-value--money">
              {formatPeso(stats.toCollect)}
            </p>
          </article>
        </section>

        <section className="fd-dash__panel" aria-labelledby="fd-room-status-heading">
          <div className="fd-dash__panel-head">
            <h2 id="fd-room-status-heading" className="fd-dash__panel-title">
              Room Status
            </h2>
          </div>
          <div className="fd-dash__toolbar">
            <label className="fd-dash__search">
              <IconSearch />
              <input
                type="search"
                className="fd-dash__search-input"
                placeholder="Search reservations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoComplete="off"
              />
            </label>
          </div>
          <div className="fd-dash__table-wrap">
            <table className="fd-dash__table">
              <thead>
                <tr>
                  <th scope="col">Room</th>
                  <th scope="col">Type</th>
                  <th scope="col">Price</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="fd-dash__muted">
                      Loading rooms…
                    </td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="fd-dash__muted">
                      No rooms match your search.
                    </td>
                  </tr>
                ) : (
                  tableRows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.roomNumber}</td>
                      <td>{r.title}</td>
                      <td>{formatPeso(r.price)}</td>
                      <td>
                        <span className={statusPillClass(r.status)}>{statusLabel(r.status)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="fd-dash__bottom" aria-label="Calendar and reserved days">
          <div className="fd-dash__calendar-card">
            <div className="fd-dash__calendar-head">
              <button type="button" className="fd-dash__cal-nav" onClick={goPrevMonth} aria-label="Previous month">
                ‹
              </button>
              <h3 className="fd-dash__calendar-title">
                {monthName(viewMonth)} {viewYear}
              </h3>
              <button type="button" className="fd-dash__cal-nav" onClick={goNextMonth} aria-label="Next month">
                ›
              </button>
            </div>
            <div className="fd-dash__weekdays" aria-hidden>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="fd-dash__grid">
              {calendarDays.map((c) =>
                c.day == null ? (
                  <span key={c.key} className="fd-dash__cell fd-dash__cell--empty" />
                ) : (
                  <button
                    key={c.key}
                    type="button"
                    className="fd-dash__cell"
                  >
                    {c.day}
                  </button>
                ),
              )}
            </div>
            <p className="fd-dash__calendar-hint">Booking calendar</p>
          </div>
          <div className="fd-dash__reserved-card">
            <h3 className="fd-dash__reserved-title">Information of Reserved Days</h3>
            {reservedLines.length === 0 ? (
              <p className="fd-dash__muted">No reservations this month.</p>
            ) : (
              <ul className="fd-dash__reserved-list">
                {reservedLines.map(({ key, line }) => (
                  <li key={key} className="fd-dash__reserved-item">
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </>
  )
}

function monthName(m0) {
  return [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ][m0]
}

function IconSearch() {
  return (
    <svg className="fd-dash__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.75" />
      <path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
