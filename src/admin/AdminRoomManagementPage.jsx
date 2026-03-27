import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoom, deleteRoom, fetchReservations, fetchRooms, updateRoom } from '../api/guestApi'
import { GUEST_ROOMS } from '../guest/guestRoomsData'
import { normalizeRoomReservationStatus } from '../guest/roomReservationStatus'
import AdminHeader from './AdminHeader'
import RoomFormModal from './RoomFormModal'
import './AdminRoomManagementPage.css'

function getTodayYMD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Stay is active today when today is on or after check-in and before check-out. */
function isStayActiveToday(res, todayYMD) {
  const ci = res.checkIn != null ? String(res.checkIn).slice(0, 10) : ''
  const co = res.checkOut != null ? String(res.checkOut).slice(0, 10) : ''
  if (!ci || !co) return false
  return ci <= todayYMD && todayYMD < co
}

function isRoomOccupiedToday(room, reservations, todayYMD) {
  const today = todayYMD ?? getTodayYMD()
  return reservations.some(
    (res) =>
      String(res.roomId) === String(room.id) &&
      isStayActiveToday(res, today) &&
      normalizeRoomReservationStatus(res.status) === 'approved',
  )
}

function countOccupiedRooms(rooms, reservations, todayYMD) {
  const today = todayYMD ?? getTodayYMD()
  return rooms.filter((room) => isRoomOccupiedToday(room, reservations, today)).length
}

export default function AdminRoomManagementPage() {
  const [rooms, setRooms] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [fromApi, setFromApi] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [filterAvailable, setFilterAvailable] = useState(true)
  const [filterOccupied, setFilterOccupied] = useState(true)
  const statusFilterMasterRef = useRef(null)

  useEffect(() => {
    const el = statusFilterMasterRef.current
    if (!el) return
    el.indeterminate = filterAvailable !== filterOccupied
  }, [filterAvailable, filterOccupied])

  const loadRooms = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchRooms()
      if (Array.isArray(data)) {
        setRooms(data)
        setFromApi(true)
        try {
          const resList = await fetchReservations()
          setReservations(Array.isArray(resList) ? resList : [])
        } catch {
          setReservations([])
        }
      }
    } catch {
      setRooms(GUEST_ROOMS)
      setReservations([])
      setFromApi(false)
      setLoadError('Could not reach the API. Showing cached room list — start json-server with npm run api to manage rooms.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRooms()
  }, [loadRooms])

  const todayYMD = getTodayYMD()

  const stats = useMemo(() => {
    const total = rooms.length
    const occupied = fromApi ? countOccupiedRooms(rooms, reservations, todayYMD) : 0
    const available = Math.max(0, total - occupied)
    return { total, occupied, available }
  }, [rooms, reservations, fromApi, todayYMD])

  const filteredRooms = useMemo(() => {
    const sorted = [...rooms].sort((a, b) =>
      String(a.roomNumber ?? '').localeCompare(String(b.roomNumber ?? ''), undefined, { numeric: true }),
    )
    if ((!filterAvailable && !filterOccupied) || (filterAvailable && filterOccupied)) {
      return sorted
    }
    return sorted.filter((room) => {
      const occupied = fromApi && isRoomOccupiedToday(room, reservations, todayYMD)
      if (filterAvailable && !filterOccupied) return !occupied
      if (!filterAvailable && filterOccupied) return occupied
      return true
    })
  }, [rooms, reservations, fromApi, filterAvailable, filterOccupied, todayYMD])

  const handleStatusFilterAll = (e) => {
    const checked = e.target.checked
    setFilterAvailable(checked)
    setFilterOccupied(checked)
  }

  const openCreate = () => {
    setActionError('')
    setEditingRoom(null)
    setFormOpen(true)
  }

  const openEdit = (room) => {
    setActionError('')
    setEditingRoom(room)
    setFormOpen(true)
  }

  const closeForm = () => {
    if (!submitting) {
      setFormOpen(false)
      setEditingRoom(null)
    }
  }

  const handleSave = async (payload, isEdit) => {
    setSubmitting(true)
    setActionError('')
    try {
      if (isEdit) {
        await updateRoom(editingRoom.id, payload)
      } else {
        await createRoom(payload)
      }
      await loadRooms()
      setFormOpen(false)
      setEditingRoom(null)
    } catch {
      setActionError(isEdit ? 'Failed to update room. Is the API running?' : 'Failed to create room. Is the API running?')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (room) => {
    if (!fromApi) {
      setActionError('Cannot delete while the API is offline.')
      return
    }
    const deleteLabel =
      room.roomNumber != null && String(room.roomNumber).trim() !== ''
        ? `Room ${room.roomNumber} — ${room.title}`
        : room.title
    if (!window.confirm(`Delete “${deleteLabel}”? This cannot be undone.`)) return
    setActionError('')
    try {
      await deleteRoom(room.id)
      await loadRooms()
    } catch {
      setActionError('Failed to delete room.')
    }
  }

  return (
    <>
      <AdminHeader />
      <main className="admin-rooms">
        <div className="admin-rooms__toolbar">
          <div>
            <h1 className="admin-rooms__heading">Room management</h1>
            {/* <p className="admin-rooms__sub">Create, edit, or remove rooms shown to guests on the booking site.</p> */}
          </div>
          <button type="button" className="admin-rooms__add" onClick={openCreate} disabled={!fromApi && loadError}>
            Add room
          </button>
        </div>

        {!loading && (
          <div className="admin-rooms__stats" aria-label="Room counts">
            <div className="admin-rooms__stat">
              <span className="admin-rooms__stat-value">{stats.available}</span>
              <span className="admin-rooms__stat-label">Available rooms</span>
            </div>
            <div className="admin-rooms__stat">
              <span className="admin-rooms__stat-value">{stats.occupied}</span>
              <span className="admin-rooms__stat-label">Occupied rooms</span>
            </div>
            <div className="admin-rooms__stat">
              <span className="admin-rooms__stat-value">{stats.total}</span>
              <span className="admin-rooms__stat-label">Total rooms</span>
            </div>
          </div>
        )}

        {loadError && (
          <p className="admin-rooms__banner admin-rooms__banner--warn" role="status">
            {loadError}
            <button type="button" className="admin-rooms__retry" onClick={loadRooms}>
              Retry
            </button>
          </p>
        )}

        {actionError && (
          <p className="admin-rooms__banner admin-rooms__banner--error" role="alert">
            {actionError}
          </p>
        )}

        {loading ? (
          <p className="admin-rooms__loading">Loading rooms…</p>
        ) : (
          <div className="admin-rooms__table-wrap">
            <div className="admin-rooms__filter" role="group" aria-labelledby="admin-rooms-filter-label">
              <span className="admin-rooms__filter-label" id="admin-rooms-filter-label">
                Status
              </span>
              <div className="admin-rooms__filter-checks">
                <label className="admin-rooms__filter-check admin-rooms__filter-check--master">
                  <input
                    ref={statusFilterMasterRef}
                    type="checkbox"
                    checked={filterAvailable && filterOccupied}
                    onChange={handleStatusFilterAll}
                    aria-label="Check or uncheck all status filters"
                  />
                  <span>All</span>
                </label>
                <span className="admin-rooms__filter-sep" aria-hidden>
                  |
                </span>
                <label className="admin-rooms__filter-check">
                  <input
                    type="checkbox"
                    checked={filterAvailable}
                    onChange={(e) => setFilterAvailable(e.target.checked)}
                  />
                  <span>Available</span>
                </label>
                <label className="admin-rooms__filter-check">
                  <input
                    type="checkbox"
                    checked={filterOccupied}
                    onChange={(e) => setFilterOccupied(e.target.checked)}
                  />
                  <span>Occupied</span>
                </label>
              </div>
              {/* <span className="admin-rooms__filter-hint">
                All checks or clears both filters. Picking a single status narrows the list; both on or both off still shows every room.
              </span> */}
            </div>

            <table className="admin-rooms__table">
              <thead>
                <tr>
                  <th scope="col">Room</th>
                  <th scope="col">Room #</th>
                  <th scope="col">Status</th>
                  <th scope="col">Bed package</th>
                  <th scope="col">Price</th>
                  <th scope="col">Guests</th>
                  <th scope="col" className="admin-rooms__th-actions">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-rooms__empty-cell">
                      {rooms.length === 0
                        ? 'No rooms yet. Add one to get started.'
                        : 'No rooms match this filter.'}
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map((room) => {
                    const occupied = fromApi && isRoomOccupiedToday(room, reservations, todayYMD)
                    return (
                  <tr key={room.id}>
                    <td>
                      <div className="admin-rooms__cell-room">
                        {room.image ? (
                          <img src={room.image} alt="" className="admin-rooms__thumb" loading="lazy" />
                        ) : (
                          <span className="admin-rooms__thumb admin-rooms__thumb--empty" aria-hidden />
                        )}
                        <span className="admin-rooms__title">{room.title}</span>
                      </div>
                    </td>
                    <td>{room.roomNumber != null && room.roomNumber !== '' ? room.roomNumber : '—'}</td>
                    <td>
                      {!fromApi ? (
                        <span className="admin-rooms__status admin-rooms__status--muted" title="Connect API to show live status">
                          —
                        </span>
                      ) : occupied ? (
                        <span className="admin-rooms__status admin-rooms__status--occupied">Occupied</span>
                      ) : (
                        <span className="admin-rooms__status admin-rooms__status--available">Available</span>
                      )}
                    </td>
                    <td>{room.package != null && room.package !== '' ? room.package : '—'}</td>
                    <td>{room.price}</td>
                    <td>{room.guests}</td>
                    <td className="admin-rooms__actions">
                      <button
                        type="button"
                        className="admin-rooms__icon-btn"
                        onClick={() => openEdit(room)}
                        disabled={!fromApi}
                        aria-label={
                          room.roomNumber != null && String(room.roomNumber).trim() !== ''
                            ? `Edit room ${room.roomNumber}`
                            : `Edit ${room.title}`
                        }
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="admin-rooms__icon-btn admin-rooms__icon-btn--danger"
                        onClick={() => handleDelete(room)}
                        disabled={!fromApi}
                        aria-label={
                          room.roomNumber != null && String(room.roomNumber).trim() !== ''
                            ? `Delete room ${room.roomNumber}`
                            : `Delete ${room.title}`
                        }
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
      </main>

      <RoomFormModal
        isOpen={formOpen}
        onClose={closeForm}
        onSubmit={handleSave}
        room={editingRoom}
        submitting={submitting}
      />
    </>
  )
}

function IconEdit() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}
