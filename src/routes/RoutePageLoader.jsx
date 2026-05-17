/** Shown while a lazy-loaded route chunk is downloading. */
export default function RoutePageLoader() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="route-page-loader"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'min(40vh, 320px)',
        padding: 24,
        color: '#9a8060',
        fontFamily: 'Roboto, sans-serif',
        fontSize: 14,
      }}
    >
      Loading…
    </div>
  )
}
