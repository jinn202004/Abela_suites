import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons/EyeIcons'

/**
 * Label + password input + visibility toggle. Supports controlled or uncontrolled value.
 */
export default function PasswordField({
  id,
  label,
  name,
  autoComplete,
  placeholder,
  value,
  defaultValue,
  onChange,
  inputClassName = '',
  ariaDescribedBy,
  ariaInvalid,
  showToggleAriaLabel = 'Show password',
  hideToggleAriaLabel = 'Hide password',
  children,
}) {
  const [visible, setVisible] = useState(false)
  const controlled = value !== undefined

  return (
    <div className="login-modal__field">
      <label className="login-modal__label" htmlFor={id}>
        {label}
      </label>
      <div className="login-modal__password-wrap">
        <input
          id={id}
          className={`login-modal__input login-modal__input--password ${inputClassName}`.trim()}
          type={visible ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          {...(controlled
            ? { value, onChange }
            : { defaultValue: defaultValue ?? '' })}
        />
        <button
          type="button"
          className="login-modal__toggle-pw"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideToggleAriaLabel : showToggleAriaLabel}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {children}
    </div>
  )
}
