import { useEffect, useId, useRef, useState } from 'react'
import ModalFrame from '../components/ModalFrame'
import './RoomFormModal.css'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function amenitiesToText(venue) {
  if (!venue?.amenities) return ''
  if (Array.isArray(venue.amenities)) return venue.amenities.join(', ')
  return String(venue.amenities)
}

function parseAmenities(text) {
  return String(text)
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

const emptyForm = () => ({
  name: '',
  capacity: 50,
  price: '',
  location: '',
  description: '',
  amenitiesText: '',
  image: '',
})

/**
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {function} onSubmit — async (payload) => void
 * @param {object | null} venue — existing venue for edit, null for create
 * @param {boolean} submitting
 */
export default function EventVenueFormModal({ isOpen, onClose, onSubmit, venue, submitting }) {
  const titleId = useId()
  const [form, setForm] = useState(emptyForm)
  const [localError, setLocalError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    setLocalError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (venue) {
      setForm({
        name: venue.name ?? '',
        capacity: Number(venue.capacity) > 0 ? Number(venue.capacity) : 50,
        price: venue.price != null ? String(venue.price) : '',
        location: venue.location ?? '',
        description: venue.description ?? '',
        amenitiesText: amenitiesToText(venue),
        image: venue.image ?? '',
      })
    } else {
      setForm(emptyForm())
    }
  }, [isOpen, venue])

  const clearImage = () => {
    setForm((f) => ({ ...f, image: '' }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImageFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLocalError('Please choose an image file (JPG, PNG, WebP, etc.).')
      e.target.value = ''
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLocalError('Image must be 2MB or smaller.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      setForm((f) => ({ ...f, image: typeof result === 'string' ? result : '' }))
      setLocalError('')
    }
    reader.onerror = () => {
      setLocalError('Could not read that file.')
      e.target.value = ''
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    if (!form.name.trim()) {
      setLocalError('Venue name is required.')
      return
    }
    const cap = Math.max(1, Math.min(50000, Number(form.capacity) || 1))
    const amenities = parseAmenities(form.amenitiesText)
    const payload = {
      name: form.name.trim(),
      capacity: cap,
      price: form.price.trim(),
      location: form.location.trim(),
      description: form.description.trim(),
      amenities,
      image: typeof form.image === 'string' ? form.image.trim() : '',
    }
    if (!venue) {
      payload.createdAt = new Date().toISOString()
    } else if (venue.createdAt) {
      payload.createdAt = venue.createdAt
    }
    await onSubmit(payload, Boolean(venue))
  }

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} panelClassName="room-form-modal" ariaLabelledBy={titleId}>
      <div className="room-form-modal__head">
        <h2 id={titleId} className="room-form-modal__title">
          {venue ? 'Edit event venue' : 'Add event venue'}
        </h2>
        <button type="button" className="room-form-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <form className="room-form-modal__form" onSubmit={handleSubmit} noValidate>
        <label className="room-form-modal__field">
          <span className="room-form-modal__label">Package</span>
          <input
            className="room-form-modal__input"
            name="name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Mini Sky Bar, Function Hall"
            required
          />
        </label>

        <div className="room-form-modal__row room-form-modal__row--pair">
          <label className="room-form-modal__field">
            <span className="room-form-modal__label">Pax</span>
            <input
              className="room-form-modal__input"
              type="number"
              name="capacity"
              min={1}
              max={50000}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              inputMode="numeric"
            />
            <span className="room-form-modal__hint">Maximum guests for this venue (single number)</span>
          </label>
          <label className="room-form-modal__field">
            <span className="room-form-modal__label">Price</span>
            <input
              className="room-form-modal__input"
              name="price"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="₱1,148"
            />
          </label>
        </div>

        <label className="room-form-modal__field">
          <span className="room-form-modal__label">Location / floor</span>
          <input
            className="room-form-modal__input"
            name="location"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="e.g. Main building, 2nd floor"
          />
        </label>

        <div className="room-form-modal__field room-form-modal__field--image">
          <span className="room-form-modal__label" id={`${titleId}-image-label`}>
            Venue photo
          </span>
          <input
            ref={fileInputRef}
            className="room-form-modal__file-input"
            type="file"
            accept="image/*"
            aria-labelledby={`${titleId}-image-label`}
            onChange={handleImageFile}
          />
          {form.image ? (
            <div className="room-form-modal__image-preview">
              <img className="room-form-modal__preview-img" src={form.image} alt="" />
            </div>
          ) : null}
          <div className="room-form-modal__image-actions">
            <button type="button" className="room-form-modal__upload-btn" onClick={() => fileInputRef.current?.click()}>
              {form.image ? 'Replace image' : 'Upload image'}
            </button>
            {form.image ? (
              <button
                type="button"
                className="room-form-modal__upload-btn room-form-modal__upload-btn--ghost"
                onClick={clearImage}
              >
                Remove
              </button>
            ) : null}
          </div>
          <span className="room-form-modal__hint">JPG, PNG, or WebP — optional, max 2MB</span>
        </div>

        <label className="room-form-modal__field">
          <span className="room-form-modal__label">Description</span>
          <textarea
            className="room-form-modal__textarea"
            name="description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Layout, best use (weddings, conferences, etc.)"
          />
        </label>

        <label className="room-form-modal__field">
          <span className="room-form-modal__label">Inclusions</span>
          <textarea
            className="room-form-modal__textarea"
            name="amenities"
            rows={2}
            value={form.amenitiesText}
            onChange={(e) => setForm((f) => ({ ...f, amenitiesText: e.target.value }))}
            placeholder="Comma-separated: AV system, stage, dance floor, lighting"
          />
          <span className="room-form-modal__hint">What&apos;s included — separate items with commas</span>
        </label>

        {localError && (
          <p className="room-form-modal__error" role="alert">
            {localError}
          </p>
        )}

        <div className="room-form-modal__actions">
          <button type="button" className="room-form-modal__btn room-form-modal__btn--ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="room-form-modal__btn room-form-modal__btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : venue ? 'Save changes' : 'Add venue'}
          </button>
        </div>
      </form>
    </ModalFrame>
  )
}
