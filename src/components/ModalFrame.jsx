import { useModalEscape } from '../hooks/useModalEscape'

/**
 * Shared modal shell: dimmed backdrop, cream panel, Escape to close.
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string} [panelClassName] — extra classes on `.login-modal` (e.g. `forgot-modal`)
 * @param {string} ariaLabelledBy — id of the dialog title element
 * @param {import('react').ReactNode} children
 */
export default function ModalFrame({ isOpen, onClose, panelClassName = '', ariaLabelledBy, children }) {
  useModalEscape(isOpen, onClose)

  if (!isOpen) return null

  return (
    <div
      className="login-modal__backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div
        className={`login-modal ${panelClassName}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
