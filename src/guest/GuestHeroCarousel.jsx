import { useEffect, useState } from 'react'
import { useCarouselIndex } from '../hooks/useCarouselIndex'
import './GuestHeroCarousel.css'

const AUTO_MS = 3000

const SLIDES = [
  { id: 's1', src: '/guest-room-1.jpg', alt: 'Hotel room' },
  { id: 's2', src: '/guest-room-2.jpg', alt: 'Suite interior' },
  { id: 's3', src: '/guest-room-3.jpg', alt: 'Guest room' },
]

export default function GuestHeroCarousel() {
  const slideCount = SLIDES.length
  const { index, setIndex, trackStyle } = useCarouselIndex(slideCount)
  const [hoverPaused, setHoverPaused] = useState(false)
  const [tabHidden, setTabHidden] = useState(() =>
    typeof document !== 'undefined' ? document.hidden : false,
  )

  useEffect(() => {
    const syncVisibility = () => setTabHidden(document.hidden)
    syncVisibility()
    document.addEventListener('visibilitychange', syncVisibility)
    return () => document.removeEventListener('visibilitychange', syncVisibility)
  }, [])

  const autoPaused = hoverPaused || tabHidden

  useEffect(() => {
    if (slideCount < 2 || autoPaused) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % slideCount)
    }, AUTO_MS)
    return () => window.clearInterval(id)
  }, [slideCount, setIndex, autoPaused])

  return (
    <section className="guest-hero" aria-labelledby="guest-hero-heading">
      <div className="guest-hero__inner">
        <h2 id="guest-hero-heading" className="guest-hero__title">
          Abela&apos;s Deals
        </h2>
        <p className="guest-hero__subtitle">Grab exclusive deals and plan your perfect stay.</p>

        <div
          className="guest-hero__carousel"
          aria-roledescription="carousel"
          aria-label="Promotional deals"
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
        >
          <div className="guest-hero__viewport">
            <div className="guest-hero__track" style={trackStyle}>
              {SLIDES.map(({ id, src, alt }) => (
                <div key={id} className="guest-hero__slide">
                  <img src={src} alt={alt} className="guest-hero__img" width={640} height={213} />
                </div>
              ))}
            </div>
          </div>
          <div className="guest-hero__dots" role="tablist" aria-label="Promo slides">
            {SLIDES.map(({ id }, i) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                className={`guest-hero__dot ${i === index ? 'guest-hero__dot--active' : ''}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
