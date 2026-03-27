import { useEffect, useId, useRef, useState } from 'react'
import Button from './Button'
import ModalFrame from './ModalFrame'
import './LoginModal.css'
import './VerificationCodeModal.css'

const CODE_LEN = 6

export default function VerificationCodeModal({
  isOpen,
  onClose,
  onResend,
  onValidCode,
}) {
  const titleId = useId()
  const [digits, setDigits] = useState(() => Array(CODE_LEN).fill(''))
  const inputRefs = useRef([])

  useEffect(() => {
    if (!isOpen) return
    const id = requestAnimationFrame(() => inputRefs.current[0]?.focus())
    return () => cancelAnimationFrame(id)
  }, [isOpen])

  const setDigitAt = (index, value) => {
    const d = value.replace(/\D/g, '').slice(-1)
    setDigits((prev) => {
      const next = [...prev]
      next[index] = d
      return next
    })
    if (d && index < CODE_LEN - 1) {
      requestAnimationFrame(() => inputRefs.current[index + 1]?.focus())
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      const el = inputRefs.current[index]
      const hasValue = el?.value.length > 0
      if (hasValue) return
      if (index === 0) return
      e.preventDefault()
      setDigits((prev) => {
        const next = [...prev]
        next[index - 1] = ''
        return next
      })
      requestAnimationFrame(() => inputRefs.current[index - 1]?.focus())
      return
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'ArrowRight' && index < CODE_LEN - 1) {
      e.preventDefault()
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LEN)
    if (!text) return
    const chars = text.split('')
    setDigits((prev) => {
      const next = [...prev]
      chars.forEach((c, i) => {
        if (i < CODE_LEN) next[i] = c
      })
      return next
    })
    const focusIndex = Math.min(chars.length, CODE_LEN - 1)
    requestAnimationFrame(() => inputRefs.current[focusIndex]?.focus())
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!digits.every((d) => d !== '')) return
    onValidCode?.()
  }

  const handleResend = (e) => {
    e.preventDefault()
    onResend?.()
  }

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} panelClassName="verify-modal" ariaLabelledBy={titleId}>
      <div className="verify-modal__icon" aria-hidden="true">
        <KeypadFingerIcon />
      </div>

      <h2 id={titleId} className="verify-modal__title">
        Enter your code
      </h2>

      <p className="verify-modal__hint">A code has been sent to your email address.</p>

      <form className="verify-modal__form" onSubmit={handleSubmit} noValidate>
        <fieldset className="verify-modal__fieldset">
          <legend className="verify-modal__legend">Verification code</legend>
          <div className="verify-modal__digits" onPaste={handlePaste}>
            {digits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => {
                  inputRefs.current[i] = el
                }}
                className="verify-modal__digit"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
                value={digit}
                aria-label={`Digit ${i + 1} of ${CODE_LEN}`}
                onChange={(e) => setDigitAt(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
              />
            ))}
          </div>
        </fieldset>

        <Button type="submit" variant="cta" className="login-modal__btn-primary verify-modal__submit">
          Submit
        </Button>
      </form>

      <p className="verify-modal__footer">
        Didn&apos;t receive email?{' '}
        <button type="button" className="verify-modal__resend" onClick={handleResend}>
          Click to resend
        </button>
      </p>
    </ModalFrame>
  )
}

function KeypadFingerIcon() {
  const cells = [
    [8, 8],
    [24, 8],
    [40, 8],
    [8, 24],
    [24, 24],
    [40, 24],
    [8, 40],
    [24, 40],
    [40, 40],
  ]
  return (
    <svg
      className="verify-modal__svg"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={true}
    >
      {cells.map(([x, y], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width="12"
          height="12"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.75"
        />
      ))}
      <path
        d="M52 46c2-1 4 0 5 2l1 3c0 2-2 4-4 4h-8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M48 52l-4-8 2-2 4 2 2-6 3 1 1-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
