import '../guest/GuestHeader.css'

/**
 * Chevron in the top bar: collapses/expands the shell sidebar (guest or admin).
 * Styles reuse `.guest-header__crumb-toggle` from GuestHeader.css.
 */
export default function SidebarCollapseToggle({ sidebarCollapsed, onToggle, sidebarId }) {
  return (
    <button
      type="button"
      className={`guest-header__crumb-toggle ${sidebarCollapsed ? 'guest-header__crumb-toggle--collapsed' : ''}`.trim()}
      onClick={onToggle}
      aria-controls={sidebarId}
      aria-expanded={!sidebarCollapsed}
      aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <IconChevronRight />
    </button>
  )
}

function IconChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
