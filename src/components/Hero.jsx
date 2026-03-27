import Button from './Button'
import './Hero.css'

export default function Hero() {
  return (
    <section className="hero" id="home" aria-labelledby="hero-heading">
      <div className="hero__media" role="presentation" />
      <div className="hero__inner">
        <div className="hero__title-bar">
          <h1 id="hero-heading" className="hero__heading">
            Welcome to Abela Suites
          </h1>
        </div>
        <p className="hero__tagline">Where Services and Comforts Meet</p>
        <p className="hero__copy">
          Stay with us, feel at home, and enjoy a place where comfort, care, and
          hospitality come together to create a truly memorable experience
        </p>
        <Button variant="cta" className="hero__cta">
          View Our Services
        </Button>
      </div>
    </section>
  )
}
