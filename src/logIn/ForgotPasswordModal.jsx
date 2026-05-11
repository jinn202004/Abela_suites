import { useId, useState } from 'react'
import Button from '../components/Button'
import ModalFrame from '../components/ModalFrame'
import './LoginModal.css'
import './ForgotPasswordModal.css'

export default function ForgotPasswordModal({ isOpen, onClose, onBackToLogin, onSubmitted }) {
  const titleId = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Please enter your email address.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.')
      return
    }
    onSubmitted?.(trimmed.toLowerCase())
  }

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} panelClassName="forgot-modal" ariaLabelledBy={titleId}>
      <div className="forgot-modal__icon" aria-hidden="true">
        <ResetLockIcon />
      </div>

      <h2 id={titleId} className="forgot-modal__title">
        Forgot Password
      </h2>

      <p className="forgot-modal__hint">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <form className="forgot-modal__form" onSubmit={handleSubmit} noValidate>
        <input
          id="forgot-email"
          className="login-modal__input forgot-modal__input"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Your email"
          aria-label="Your email"
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? `${titleId}-err` : undefined}
        />
        {error ? (
          <p id={`${titleId}-err`} className="forgot-modal__error" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="cta" className="login-modal__btn-primary forgot-modal__submit">
          Submit
        </Button>
      </form>

      <button type="button" className="forgot-modal__back" onClick={onBackToLogin}>
        Back to Log In
      </button>
    </ModalFrame>
  )
}

function ResetLockIcon() {
  return (
    <svg
      className="forgot-modal__svg"
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={true}
    >
      <path
        d="M28 10a14 14 0 0110.5 23.2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M42 18l2.5-2.5-2-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M28 10a14 14 0 00-10.5 23.2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M14 18l-2.5-2.5 2-4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect
        x="18"
        y="28"
        width="20"
        height="18"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      <path
        d="M22 28v-5a6 6 0 0112 0v5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="28" cy="37" r="1.75" fill="currentColor" />
    </svg>
  )
}
