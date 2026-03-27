import { useEffect, useId, useRef, useState } from 'react'
import ModalFrame from '../components/ModalFrame'
import { buildFeaturesFromForm, parseFeaturesArray } from './roomFeaturePresets'
import './RoomFormModal.css'

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const emptyForm = () => ({
  title: '',
  roomNumber: '',
  package: '',
  image: '',
  price: '',
  guests: 2,
  description: '',
  featFreeBreakfast: false,
  featWifi: false,
  featTv: false,
  featBathroom: false,
  featOther: false,
  otherFeatureText: '',
})

/**
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {function} onSubmit — async (payload) => void
 * @param {object | null} room — existing room for edit, null for create
 * @param {boolean} submitting
 */
export default function RoomFormModal({ isOpen, onClose, onSubmit, room, submitting }) {
  const titleId = useId()
  const otherInputId = useId()
  const packageHintId = useId()
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
    if (room) {
      const parsed = parseFeaturesArray(room.features)
      setForm({
        title: room.title ?? '',
        roomNumber: room.roomNumber != null ? String(room.roomNumber) : '',
        package: room.package ?? '',
        image: room.image ?? '',
        price: room.price ?? '',
        guests: Number(room.guests) || 1,
        description: room.description ?? '',
        featFreeBreakfast: parsed.featFreeBreakfast,
        featWifi: parsed.featWifi,
        featTv: parsed.featTv,
        featBathroom: parsed.featBathroom,
        featOther: parsed.featOther,
        otherFeatureText: parsed.otherFeatureText,
      })
    } else {
      setForm(emptyForm())
    }
  }, [isOpen, room])

  const toggleFeat = (key) => {
    setForm((f) => ({ ...f, [key]: !f[key] }))
  }

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
    if (!form.roomNumber.trim()) {
      setLocalError('Room number is required.')
      return
    }
    if (!form.title.trim()) {
      setLocalError('Title is required.')
      return
    }
    if (form.featOther && !form.otherFeatureText.trim()) {
      setLocalError('Add a short description for “Other”, or uncheck it.')
      return
    }
    const features = buildFeaturesFromForm(form)
    const payload = {
      title: form.title.trim(),
      roomNumber: form.roomNumber.trim(),
      package: form.package.trim(),
      image: typeof form.image === 'string' ? form.image.trim() : '',
      price: form.price.trim(),
      guests: Math.max(1, Math.min(99, Number(form.guests) || 1)),
      description: form.description.trim(),
      features,
    }
    await onSubmit(payload, Boolean(room))
  }

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} panelClassName="room-form-modal" ariaLabelledBy={titleId}>
      <div className="room-form-modal__head">
        <h2 id={titleId} className="room-form-modal__title">
          {room ? 'Edit room' : 'Add room'}
        </h2>
        <button type="button" className="room-form-modal__close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <form className="room-form-modal__form" onSubmit={handleSubmit} noValidate>
        <div className="room-form-modal__row room-form-modal__row--pair">
          <label className="room-form-modal__field">
            <span className="room-form-modal__label">Room number</span>
            <input
              className="room-form-modal__input"
              name="roomNumber"
              value={form.roomNumber}
              onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
              placeholder="e.g. 101, A-2"
              inputMode="text"
              required
            />
          </label>
          <label className="room-form-modal__field">
            <span className="room-form-modal__label">Bed package</span>
            <input
              className="room-form-modal__input"
              name="package"
              value={form.package}
              onChange={(e) => setForm((f) => ({ ...f, package: e.target.value }))}
              placeholder="e.g. Matrimonial, Twin, Queen"
              aria-describedby={packageHintId}
            />
            <span id={packageHintId} className="room-form-modal__hint">
              Bed layout or type — matrimonial, twin, queen, king, bunk, etc.
            </span>
          </label>
        </div>

        <label className="room-form-modal__field">
          <span className="room-form-modal__label">Title</span>
          <input
            className="room-form-modal__input"
            name="title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
          />
        </label>

        <div className="room-form-modal__field room-form-modal__field--image">
          <span className="room-form-modal__label" id={`${titleId}-image-label`}>
            Room photo
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
            <button
              type="button"
              className="room-form-modal__upload-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              {form.image ? 'Replace image' : 'Upload image'}
            </button>
            {form.image ? (
              <button type="button" className="room-form-modal__upload-btn room-form-modal__upload-btn--ghost" onClick={clearImage}>
                Remove
              </button>
            ) : null}
          </div>
          <span className="room-form-modal__hint">JPG, PNG, or WebP — optional, max 2MB</span>
        </div>

        <div className="room-form-modal__row">
          <label className="room-form-modal__field">
            <span className="room-form-modal__label">Price (display)</span>
            <input
              className="room-form-modal__input"
              name="price"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="₱1,666"
            />
          </label>
          <label className="room-form-modal__field">
            <span className="room-form-modal__label">Max guests</span>
            <input
              className="room-form-modal__input"
              type="number"
              name="guests"
              min={1}
              max={99}
              value={form.guests}
              onChange={(e) => setForm((f) => ({ ...f, guests: e.target.value }))}
            />
          </label>
        </div>

        <label className="room-form-modal__field">
          <span className="room-form-modal__label">Description</span>
          <textarea
            className="room-form-modal__textarea"
            name="description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>

        <fieldset className="room-form-modal__fieldset">
          <legend className="room-form-modal__label">Features</legend>
          <ul className="room-form-modal__checks">
            <li>
              <label className="room-form-modal__check">
                <input
                  type="checkbox"
                  checked={form.featFreeBreakfast}
                  onChange={() => toggleFeat('featFreeBreakfast')}
                />
                <span>Free Breakfast</span>
              </label>
            </li>
            <li>
              <label className="room-form-modal__check">
                <input type="checkbox" checked={form.featWifi} onChange={() => toggleFeat('featWifi')} />
                <span>WiFi</span>
              </label>
            </li>
            <li>
              <label className="room-form-modal__check">
                <input type="checkbox" checked={form.featTv} onChange={() => toggleFeat('featTv')} />
                <span>TV</span>
              </label>
            </li>
            <li>
              <label className="room-form-modal__check">
                <input
                  type="checkbox"
                  checked={form.featBathroom}
                  onChange={() => toggleFeat('featBathroom')}
                />
                <span>Bathroom Amenities</span>
              </label>
            </li>
            <li className="room-form-modal__check-other">
              <label className="room-form-modal__check">
                <input type="checkbox" checked={form.featOther} onChange={() => toggleFeat('featOther')} />
                <span>Other</span>
              </label>
              {form.featOther && (
                <input
                  id={otherInputId}
                  className="room-form-modal__input room-form-modal__input--other"
                  type="text"
                  value={form.otherFeatureText}
                  onChange={(e) => setForm((f) => ({ ...f, otherFeatureText: e.target.value }))}
                  placeholder="Describe other feature(s)"
                  aria-label="Other features"
                />
              )}
            </li>
          </ul>
        </fieldset>

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
            {submitting ? 'Saving…' : room ? 'Save changes' : 'Create room'}
          </button>
        </div>
      </form>
    </ModalFrame>
  )
}
