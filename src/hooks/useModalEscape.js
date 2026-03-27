import { useEffect } from 'react'

/** Closes modal on Escape when `isActive` is true. */
export function useModalEscape(isActive, onClose) {
  useEffect(() => {
    if (!isActive) return
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isActive, onClose])
}
