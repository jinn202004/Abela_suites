import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createEventVenue,
  deleteEventVenue,
  fetchEventBookings,
  fetchEventVenues,
  updateEventVenue,
} from '../api/guestApi'
import AdminHeader from './AdminHeader'
import GuestEventVenueDetailModal from '../guest/GuestEventVenueDetailModal'
import EventVenueFormModal from './EventVenueFormModal'
import '../guest/GuestEventVenuesPage.css'
import './AdminEventVenuesPage.css'

export default function AdminEventVenuesPage() {
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [fromApi, setFromApi] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingVenue, setEditingVenue] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [viewVenue, setViewVenue] = useState(null)
  const [eventBookings, setEventBookings] = useState([])

  const loadVenues = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchEventVenues()
      if (Array.isArray(data)) {
        setVenues(data)
        setFromApi(true)
        try {
          const eb = await fetchEventBookings()
          setEventBookings(Array.isArray(eb) ? eb : [])
        } catch {
          setEventBookings([])
        }
      }
    } catch {
      setVenues([])
      setEventBookings([])
      setFromApi(false)
      setLoadError('Could not reach the API. Start json-server with npm run api (or npm run dev:full) to manage event venues.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVenues()
  }, [loadVenues])

  const sortedVenues = useMemo(
    () =>
      [...venues].sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' }),
      ),
    [venues],
  )

  const eventStats = useMemo(() => computeEventBookingStats(eventBookings), [eventBookings])

  const openCreate = () => {
    setActionError('')
    setViewVenue(null)
    setEditingVenue(null)
    setFormOpen(true)
  }

  const openEdit = (venue) => {
    setActionError('')
    setViewVenue(null)
    setEditingVenue(venue)
    setFormOpen(true)
  }

  const closeForm = () => {
    if (!submitting) {
      setFormOpen(false)
      setEditingVenue(null)
    }
  }

  const handleSave = async (payload, isEdit) => {
    setSubmitting(true)
    setActionError('')
    try {
      if (isEdit) {
        await updateEventVenue(editingVenue.id, payload)
      } else {
        await createEventVenue(payload)
      }
      await loadVenues()
      setFormOpen(false)
      setEditingVenue(null)
    } catch {
      setActionError(
        isEdit ? 'Failed to update venue. Is the API running?' : 'Failed to create venue. Is the API running?',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const openView = (venue) => {
    if (!fromApi) return
    setViewVenue(venue)
  }

  const closeView = () => setViewVenue(null)

  const handleRowActivate = (venue) => {
    openView(venue)
  }

  const handleRowKeyDown = (e, venue) => {
    if (!fromApi) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openView(venue)
    }
  }

  const handleDelete = async (venue) => {
    if (!fromApi) {
      setActionError('Cannot delete while the API is offline.')
      return
    }
    const label = venue.name?.trim() || 'this venue'
    if (!window.confirm(`Delete “${label}”? This cannot be undone.`)) return
    setActionError('')
    try {
      await deleteEventVenue(venue.id)
      await loadVenues()
    } catch {
      setActionError('Failed to delete venue.')
    }
  }

  return (
    <>
      <GuestEventVenueDetailModal venue={viewVenue} onClose={closeView} />
      <AdminHeader />
      <main className="admin-events">
        <header className="admin-events__dashboard">
          <h1 className="admin-events__dashboard-title">Event Management Dashboard</h1>
          <p className="admin-events__dashboard-sub">
            Manage your event venues, reservations, and availability.
          </p>
          <div className="admin-events__dashboard-stats" role="region" aria-label="Event booking summary">
            <article className="admin-events__dashboard-card">
              <span className="admin-events__dashboard-card-icon" aria-hidden>
                <IconCalendar />
              </span>
              <div className="admin-events__dashboard-card-body">
                <h2 className="admin-events__dashboard-card-label">Reservation for Today</h2>
                <p className="admin-events__dashboard-card-value">{eventStats.todayStarts}</p>
              </div>
            </article>
            <article className="admin-events__dashboard-card">
              <span className="admin-events__dashboard-card-icon" aria-hidden>
                <IconDocuments />
              </span>
              <div className="admin-events__dashboard-card-body">
                <h2 className="admin-events__dashboard-card-label">Total Reservations</h2>
                <p className="admin-events__dashboard-card-value">{eventStats.total}</p>
              </div>
            </article>
            <article className="admin-events__dashboard-card">
              <span className="admin-events__dashboard-card-icon" aria-hidden>
                <IconCheckout />
              </span>
              <div className="admin-events__dashboard-card-body">
                <h2 className="admin-events__dashboard-card-label">Check-outs Today</h2>
                <p className="admin-events__dashboard-card-value">{eventStats.checkoutsToday}</p>
              </div>
            </article>
          </div>
        </header>

        <div className="admin-events__toolbar">
          <div>
            <h2 className="admin-events__heading">Event venues</h2>
            {/* <p className="admin-events__sub">Add and manage event venues, capacity (pax), and pricing.</p> */}
          </div>
          <button type="button" className="admin-events__add" onClick={openCreate} disabled={!fromApi && loadError}>
            Add venue
          </button>
        </div>

        {loadError && (
          <p className="admin-events__banner admin-events__banner--warn" role="status">
            {loadError}
            <button type="button" className="admin-events__retry" onClick={loadVenues}>
              Retry
            </button>
          </p>
        )}

        {actionError && (
          <p className="admin-events__banner admin-events__banner--error" role="alert">
            {actionError}
          </p>
        )}

        {loading ? (
          <p className="admin-events__loading">Loading venues…</p>
        ) : (
          <div className="admin-events__table-wrap">
            <table className="admin-events__table">
              <thead>
                <tr>
                  <th scope="col">Venue</th>
                  <th scope="col">Package</th>
                  <th scope="col">Pax</th>
                  <th scope="col">Price</th>
                  <th scope="col" className="admin-events__th-actions">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedVenues.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="admin-events__empty-cell">
                      {fromApi ? 'No event venues yet. Add one to get started.' : '—'}
                    </td>
                  </tr>
                ) : (
                  sortedVenues.map((venue) => {
                    const pax = formatPax(venue)
                    return (
                      <tr
                        key={venue.id}
                        className={fromApi ? 'admin-events__row admin-events__row--clickable' : undefined}
                        onClick={() => handleRowActivate(venue)}
                        onKeyDown={(e) => handleRowKeyDown(e, venue)}
                        tabIndex={fromApi ? 0 : undefined}
                        aria-label={fromApi ? `View details: ${venue.name || 'Untitled'}` : undefined}
                      >
                        <td>
                          <div className="admin-events__cell-venue admin-events__cell-venue--thumb-only">
                            {venue.image ? (
                              <img src={venue.image} alt="" className="admin-events__thumb" loading="lazy" />
                            ) : (
                              <span className="admin-events__thumb admin-events__thumb--empty" aria-hidden />
                            )}
                          </div>
                        </td>
                        <td className="admin-events__package">{venue.name != null && venue.name !== '' ? venue.name : '—'}</td>
                        <td>{pax}</td>
                        <td className="admin-events__price">{formatPrice(venue.price)}</td>
                        <td className="admin-events__actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="admin-events__icon-btn"
                            onClick={() => openEdit(venue)}
                            disabled={!fromApi}
                            aria-label={`Edit ${venue.name || 'venue'}`}
                            title="Edit"
                          >
                            <IconEdit />
                          </button>
                          <button
                            type="button"
                            className="admin-events__icon-btn admin-events__icon-btn--danger"
                            onClick={() => handleDelete(venue)}
                            disabled={!fromApi}
                            aria-label={`Delete ${venue.name || 'venue'}`}
                            title="Delete"
                          >
                            <IconTrash />
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

        <EventVenueFormModal
          isOpen={formOpen}
          onClose={closeForm}
          onSubmit={handleSave}
          venue={editingVenue}
          submitting={submitting}
        />
      </main>
    </>
  )
}

function getTodayYMD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function ymdFromField(value) {
  if (value == null || String(value).trim() === '') return ''
  return String(value).trim().slice(0, 10)
}

/** Stats from event bookings: today = event start date; check-out = last day of event. */
function computeEventBookingStats(bookings) {
  const list = Array.isArray(bookings) ? bookings : []
  const todayYMD = getTodayYMD()
  let todayStarts = 0
  let checkoutsToday = 0
  for (const b of list) {
    const start = ymdFromField(b.eventDate)
    const endSource =
      b.eventEndDate != null && String(b.eventEndDate).trim() !== '' ? b.eventEndDate : b.eventDate
    const end = ymdFromField(endSource)
    if (start === todayYMD) todayStarts += 1
    if (end === todayYMD) checkoutsToday += 1
  }
  return { todayStarts, total: list.length, checkoutsToday }
}

function IconCalendar() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeLinecap="round" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
    </svg>
  )
}

function IconDocuments() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheckout() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 17l5-5-5-5M15 12H3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Single pax number; supports legacy string `limit` like "30-40 guest". */
function formatPax(venue) {
  if (venue == null) return '—'
  const n = Number(venue.capacity)
  if (Number.isFinite(n) && n > 0) return String(Math.floor(n))
  if (venue.limit != null && String(venue.limit).trim() !== '') {
    const nums = String(venue.limit).match(/\d+/g)
    if (nums?.length) return String(Math.max(...nums.map(Number)))
  }
  return '—'
}

function formatPrice(price) {
  if (price == null || String(price).trim() === '') return '—'
  const t = String(price).trim()
  if (t.startsWith('₱')) return t
  return `₱${t}`
}

function IconEdit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinejoin="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
