import { useEffect, useState } from 'react'
import { fetchTestimonialsPublic, GUEST_PROFILE_UPDATED_EVENT } from '../api/guestApi'
import './TestimonialsSection.css'

function Stars({ rating }) {
  const n = Math.min(5, Math.max(1, Number(rating) || 0))
  return (
    <span className="testimonials__stars" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? 'testimonials__star testimonials__star--on' : 'testimonials__star'}>
          ★
        </span>
      ))}
    </span>
  )
}

function CardAvatar({ src }) {
  const [broken, setBroken] = useState(false)
  const showImg = Boolean(src && !broken)
  return (
    <div className={`testimonials__avatar${showImg ? ' testimonials__avatar--img' : ''}`} aria-hidden>
      {showImg ? (
        <img src={src} alt="" onError={() => setBroken(true)} />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="26" height="26">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
    </div>
  )
}

export default function TestimonialsSection() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const list = await fetchTestimonialsPublic()
        if (!cancelled) setItems(Array.isArray(list) ? list : [])
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || 'Could not load testimonials.')
          setItems([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void (async () => {
        try {
          const list = await fetchTestimonialsPublic()
          setItems(Array.isArray(list) ? list : [])
        } catch {
          /* keep previous */
        }
      })()
    }, 120_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    const onProfile = () => {
      void (async () => {
        try {
          const list = await fetchTestimonialsPublic()
          setItems(Array.isArray(list) ? list : [])
        } catch {
          /* keep previous */
        }
      })()
    }
    window.addEventListener(GUEST_PROFILE_UPDATED_EVENT, onProfile)
    return () => window.removeEventListener(GUEST_PROFILE_UPDATED_EVENT, onProfile)
  }, [])

  return (
    <section className="testimonials" id="testimonials" aria-labelledby="testimonials-heading">
      <div className="testimonials__inner">
        <h2 id="testimonials-heading" className="testimonials__title">
          What Our Guests Say
        </h2>
        <p className="testimonials__sub">Real reviews from visitors after their stay</p>

        {loading ? (
          <p className="testimonials__state">Loading testimonials…</p>
        ) : error ? (
          <p className="testimonials__state testimonials__state--error">{error}</p>
        ) : items.length === 0 ? (
          <p className="testimonials__state">Be the first to share your experience after a completed stay.</p>
        ) : (
          <ul className="testimonials__grid">
            {items.map((t) => {
              const key = t.id || `${t.guestName}-${t.reviewedAt || ''}-${String(t.comment || '').slice(0, 12)}`
              const email = String(t.email || '').trim()
              return (
                <li key={key} className="testimonials__card">
                  <div className="testimonials__card-head">
                    <CardAvatar src={t.profilePhotoUrl} />
                    <div className="testimonials__who">
                      <span className="testimonials__name">{t.guestName}</span>
                      {email ? <span className="testimonials__email">{email}</span> : null}
                    </div>
                    <Stars rating={t.rating} />
                  </div>
                  <blockquote className="testimonials__quote">&ldquo;{t.comment}&rdquo;</blockquote>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
