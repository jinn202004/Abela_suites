import { useId, useMemo, useState } from 'react'
import Button from './Button'
import ModalFrame from './ModalFrame'
import PasswordField from './PasswordField'
import '../logIn/LoginModal.css'
import './SetNewPasswordModal.css'

const PASSWORD_RULES = [
  {
    id: 'len',
    label: 'Must be at least 6 characters',
    test: (p) => p.length >= 6,
  },
  {
    id: 'upper',
    label: 'Must contain an uppercase letter',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'lower',
    label: 'Must contain a lowercase letter',
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: 'num',
    label: 'Must contain at least one numeric character',
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: 'Must contain a special character',
    test: (p) => /[^A-Za-z0-9]/.test(p),
  },
]

function passwordMeetsAllRules(p) {
  return PASSWORD_RULES.every((r) => r.test(p))
}

export default function SetNewPasswordModal({ isOpen, onClose, onBackToLogin, onPasswordSet }) {
  const titleId = useId()
  const rulesId = useId()
  const mismatchId = useId()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const ruleStates = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, ok: r.test(password) })),
    [password],
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!passwordMeetsAllRules(password)) return
    if (password !== confirm) return
    onPasswordSet?.(password)
  }

  const showRules = password.length > 0
  const passwordsMismatch = confirm.length > 0 && password !== confirm

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} panelClassName="set-password-modal" ariaLabelledBy={titleId}>
      <h2 id={titleId} className="set-password-modal__title">
        Set new password
      </h2>

      <form className="set-password-modal__form" onSubmit={handleSubmit} noValidate>
        <PasswordField
          id="set-pw-password"
          label="Password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          ariaDescribedBy={showRules ? rulesId : undefined}
        >
          {showRules && (
            <ul id={rulesId} className="set-password-modal__rules" aria-live="polite">
              {ruleStates.map(({ id, label, ok }) => (
                <li
                  key={id}
                  className={`set-password-modal__rule ${ok ? 'set-password-modal__rule--ok' : ''}`}
                >
                  <span className="set-password-modal__rule-mark" aria-hidden="true">
                    {ok ? '✓' : '○'}
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          )}
        </PasswordField>

        <PasswordField
          id="set-pw-confirm"
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          inputClassName={passwordsMismatch ? 'set-password-modal__input--error' : ''}
          ariaInvalid={passwordsMismatch}
          ariaDescribedBy={passwordsMismatch ? mismatchId : undefined}
          showToggleAriaLabel="Show confirm password"
          hideToggleAriaLabel="Hide confirm password"
        >
          {passwordsMismatch && (
            <p id={mismatchId} className="set-password-modal__mismatch" role="alert">
              Passwords do not match
            </p>
          )}
        </PasswordField>

        <Button type="submit" variant="cta" className="login-modal__btn-primary set-password-modal__confirm">
          Confirm
        </Button>
      </form>

      <button type="button" className="set-password-modal__back" onClick={onBackToLogin}>
        Back to Log In
      </button>
    </ModalFrame>
  )
}
