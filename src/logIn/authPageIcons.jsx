/** Icons for full-page auth routes (enter code, forgot password). */

export function EnterCodeIcon({ className, ...rest }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      width="48"
      height="48"
      {...rest}
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M9 11V7a3 3 0 0 1 6 0v4" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ForgotPasswordIcon({ className, ...rest }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      width="48"
      height="48"
      {...rest}
    >
      <rect x="5" y="11" width="14" height="11" rx="2" />
      <path d="M9 11V8a3 3 0 0 1 6 0v3" strokeLinecap="round" />
      <path d="M12 16v-2" strokeLinecap="round" />
    </svg>
  );
}
