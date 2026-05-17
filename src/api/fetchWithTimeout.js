/**
 * Browser fetch with a deadline so hung API calls do not block the UI for minutes.
 * Does not change request URLs, bodies, or server behavior.
 */
export async function fetchWithTimeout(input, init = {}, timeoutMs = 15000) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  const userSignal = init.signal
  if (userSignal) {
    if (userSignal.aborted) ctrl.abort()
    else userSignal.addEventListener('abort', () => ctrl.abort(), { once: true })
  }
  try {
    return await fetch(input, { ...init, signal: ctrl.signal })
  } catch (e) {
    if (e?.name === 'AbortError') {
      const err = new Error(
        'Request timed out. Check that the API is running (port 5000) and try again.',
      )
      err.code = 'TIMEOUT'
      err.name = 'TimeoutError'
      throw err
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}
