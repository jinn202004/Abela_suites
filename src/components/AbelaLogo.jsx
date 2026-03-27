export default function AbelaLogo({ size = 28, className = '' }) {
  return (
    <span className={`abela-logo ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 32 32" width={size} height={size} fill="none">
        <path
          d="M16 4L6 12l4 14h12l4-14L16 4z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="currentColor"
          fillOpacity="0.15"
        />
        <path
          d="M16 8l-5 6h10l-5-6z"
          fill="currentColor"
          fillOpacity="0.5"
        />
      </svg>
    </span>
  )
}
