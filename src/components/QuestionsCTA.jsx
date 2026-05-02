import { Link } from 'react-router-dom'
import './QuestionsCTA.css'

export default function QuestionsCTA() {
  return (
    <section className="questions-cta" id="contact" aria-labelledby="questions-heading">
      <div className="questions-cta__inner">
        <h2 id="questions-heading" className="questions-cta__title">
          Have Questions?
        </h2>
        <p className="questions-cta__sub">
          Our team is here to help you plan your perfect stay or event
        </p>
        <Link to="/contact" className="btn btn--cta questions-cta__btn">
          Contact Us
        </Link>
      </div>
    </section>
  )
}
