import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { createStaff, deleteStaff, fetchStaff, updateStaff } from '../api/guestApi'
import ModalFrame from '../components/ModalFrame'
import AdminHeader from './AdminHeader'
import './RoomFormModal.css'
import './AdminStaffManagementPage.css'

function roleSelectOptions(currentRole) {
  const set = new Set(ROLE_OPTIONS)
  if (currentRole && String(currentRole).trim()) set.add(String(currentRole).trim())
  return [...set]
}

const ROLE_OPTIONS = ['Front Desk', 'Housekeeping', 'Admin', 'Cashier']

function normalizeStatus(s) {
  if (s == null) return 'active'
  const x = String(s).trim().toLowerCase()
  return x === 'inactive' ? 'inactive' : 'active'
}

function statusLabel(s) {
  return normalizeStatus(s) === 'active' ? 'Active' : 'Inactive'
}

function IconPencil() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

const MIN_PASSWORD_LEN = 6

function StaffFormModal({ isOpen, onClose, initial, onSave, submitting, error }) {
  const titleId = useId()
  const errId = useId()
  const clientErrId = useId()
  const isEdit = initial != null
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState(ROLE_OPTIONS[0])
  const [contact, setContact] = useState('')
  const [status, setStatus] = useState('active')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [clientError, setClientError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setClientError('')
    setPassword('')
    setConfirmPassword('')
    if (initial) {
      setName(typeof initial.name === 'string' ? initial.name : '')
      setEmail(typeof initial.email === 'string' ? initial.email : '')
      const r = typeof initial.role === 'string' && initial.role.trim() ? initial.role.trim() : ROLE_OPTIONS[0]
      setRole(r)
      setContact(typeof initial.contact === 'string' ? initial.contact : '')
      setStatus(normalizeStatus(initial.status) === 'inactive' ? 'inactive' : 'active')
    } else {
      setName('')
      setEmail('')
      setRole(ROLE_OPTIONS[0])
      setContact('')
      setStatus('active')
    }
  }, [isOpen, initial])

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    setClientError('')

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      contact: contact.trim(),
      status,
    }
    if (!payload.name) return
    if (!payload.email) return

    if (!isEdit) {
      if (!password.trim()) {
        setClientError('Password is required.')
        return
      }
      if (password.length < MIN_PASSWORD_LEN) {
        setClientError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`)
        return
      }
      if (password !== confirmPassword) {
        setClientError('Passwords do not match.')
        return
      }
      onSave({ ...payload, password: password.trim() })
      return
    }

    const wantChange = password.trim() !== '' || confirmPassword.trim() !== ''
    if (wantChange) {
      if (password.length < MIN_PASSWORD_LEN) {
        setClientError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`)
        return
      }
      if (password !== confirmPassword) {
        setClientError('Passwords do not match.')
        return
      }
      onSave({ ...payload, password: password.trim() })
      return
    }
    onSave(payload)
  }

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} ariaLabelledBy={titleId} panelClassName="room-form-modal">
      <div className="room-form-modal__head">
        <h2 id={titleId} className="room-form-modal__title">
          {isEdit ? 'Edit staff' : 'Add staff'}
        </h2>
        <button type="button" className="room-form-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <form className="room-form-modal__form" onSubmit={handleSubmit} noValidate>
        {error && (
          <p id={errId} className="room-form-modal__error" role="alert">
            {error}
          </p>
        )}
        <label className="room-form-modal__field">
          <span className="room-form-modal__label">Name</span>
          <input
            className="room-form-modal__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </label>
        <label className="room-form-modal__field">
          <span className="room-form-modal__label">Email</span>
          <input
            className="room-form-modal__input"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setClientError('')
            }}
            required
            autoComplete="email"
          />
        </label>
        <div className="room-form-modal__row room-form-modal__row--pair">
          <label className="room-form-modal__field">
            <span className="room-form-modal__label">{isEdit ? 'New password' : 'Password'}</span>
            <input
              className="room-form-modal__input"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setClientError('')
              }}
              autoComplete="new-password"
              required={!isEdit}
              placeholder={isEdit ? 'Leave blank to keep current' : ''}
              aria-invalid={Boolean(clientError)}
              aria-describedby={clientError ? clientErrId : undefined}
            />
          </label>
          <label className="room-form-modal__field">
            <span className="room-form-modal__label">{isEdit ? 'Confirm new password' : 'Confirm password'}</span>
            <input
              className="room-form-modal__input"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setClientError('')
              }}
              autoComplete="new-password"
              required={!isEdit}
              placeholder={isEdit ? 'Leave blank to keep current' : ''}
              aria-invalid={Boolean(clientError)}
              aria-describedby={clientError ? clientErrId : undefined}
            />
          </label>
        </div>
        {clientError && (
          <p id={clientErrId} className="room-form-modal__error" role="alert">
            {clientError}
          </p>
        )}
        <div className="room-form-modal__row room-form-modal__row--pair">
          <label className="room-form-modal__field">
            <span className="room-form-modal__label">Role</span>
            <select className="room-form-modal__select" value={role} onChange={(e) => setRole(e.target.value)}>
              {roleSelectOptions(role).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="room-form-modal__field">
            <span className="room-form-modal__label">Contact</span>
            <input className="room-form-modal__input" value={contact} onChange={(e) => setContact(e.target.value)} autoComplete="tel" />
          </label>
        </div>
        <label className="room-form-modal__field">
          <span className="room-form-modal__label">Status</span>
          <select className="room-form-modal__select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <div className="room-form-modal__actions">
          <button type="button" className="room-form-modal__btn room-form-modal__btn--ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="room-form-modal__btn room-form-modal__btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add staff'}
          </button>
        </div>
      </form>
    </ModalFrame>
  )
}

export default function AdminStaffManagementPage() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const data = await fetchStaff()
      setStaff(Array.isArray(data) ? data : [])
    } catch {
      setStaff([])
      setLoadError('Could not load staff. Start the API with npm run api (or npm run dev:full).')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return staff
    return staff.filter((s) => {
      const parts = [s.name, s.email, s.role, s.contact].map((x) => (x != null ? String(x).toLowerCase() : ''))
      return parts.some((p) => p.includes(q))
    })
  }, [staff, search])

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' })),
    [filtered],
  )

  const openCreate = () => {
    setActionError('')
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (row) => {
    setActionError('')
    setEditing(row)
    setFormOpen(true)
  }

  const closeForm = () => {
    if (!submitting) {
      setFormOpen(false)
      setEditing(null)
      setActionError('')
    }
  }

  const handleSave = async (payload) => {
    setSubmitting(true)
    setActionError('')
    try {
      if (editing) {
        const { username: _omitUsername, ...rest } = editing
        await updateStaff(editing.id, { ...rest, ...payload })
      } else {
        await createStaff(payload)
      }
      await load()
      setFormOpen(false)
      setEditing(null)
    } catch {
      setActionError(editing ? 'Failed to update staff. Is the API running?' : 'Failed to add staff. Is the API running?')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove ${row.name ?? 'this staff member'} from the list?`)) return
    try {
      await deleteStaff(row.id)
      await load()
    } catch {
      setLoadError('Could not delete staff. Is the API running?')
    }
  }

  return (
    <>
      <AdminHeader />
      <StaffFormModal
        isOpen={formOpen}
        onClose={closeForm}
        initial={editing}
        onSave={handleSave}
        submitting={submitting}
        error={actionError}
      />
      <main className="admin-staff">
        <header className="admin-staff__intro">
          <h1 className="admin-staff__heading">Staff Management</h1>
          <p className="admin-staff__sub">Manage hotel staff accounts and roles.</p>
        </header>

        <div className="admin-staff__toolbar">
          <div className="admin-staff__search-wrap">
            <span className="admin-staff__search-icon" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              className="admin-staff__search"
              placeholder="Search staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search staff"
            />
          </div>
          <button type="button" className="admin-staff__add-btn" onClick={openCreate}>
            <IconPlus />
            Add Staff
          </button>
        </div>

        {loadError && (
          <p className="admin-staff__banner" role="status">
            {loadError}
          </p>
        )}

        <section className="admin-staff__table-section" aria-labelledby="admin-staff-table-title">
          <h2 id="admin-staff-table-title" className="visually-hidden">
            Staff list
          </h2>
          {loading ? (
            <p className="admin-staff__loading">Loading…</p>
          ) : (
            <div className="admin-staff__table-scroll">
              <table className="admin-staff__table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="admin-staff__th-actions">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="admin-staff__empty">
                        {staff.length === 0 ? 'No staff yet. Click Add Staff to create one.' : 'No staff match your search.'}
                      </td>
                    </tr>
                  ) : (
                    sorted.map((s) => {
                      const active = normalizeStatus(s.status) === 'active'
                      return (
                        <tr key={String(s.id)}>
                          <td>{s.name?.trim() || '—'}</td>
                          <td>
                            <code className="admin-staff__email">{s.email?.trim() || '—'}</code>
                          </td>
                          <td>{s.role?.trim() || '—'}</td>
                          <td>{s.contact?.trim() || '—'}</td>
                          <td>
                            <span className={`admin-staff__pill ${active ? 'admin-staff__pill--active' : 'admin-staff__pill--inactive'}`}>
                              {statusLabel(s.status)}
                            </span>
                          </td>
                          <td className="admin-staff__actions">
                            <button
                              type="button"
                              className="admin-staff__icon-btn admin-staff__icon-btn--edit"
                              onClick={() => openEdit(s)}
                              aria-label={`Edit ${s.name ?? 'staff'}`}
                              title="Edit"
                            >
                              <IconPencil />
                            </button>
                            <button
                              type="button"
                              className="admin-staff__icon-btn admin-staff__icon-btn--delete"
                              onClick={() => handleDelete(s)}
                              aria-label={`Delete ${s.name ?? 'staff'}`}
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
        </section>
      </main>
    </>
  )
}
