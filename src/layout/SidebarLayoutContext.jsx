import { createContext, useContext, useMemo, useState } from 'react'

const SidebarLayoutContext = createContext(null)

export function useSidebarLayout() {
  const ctx = useContext(SidebarLayoutContext)
  if (!ctx) {
    throw new Error('useSidebarLayout must be used within SidebarLayoutProvider')
  }
  return ctx
}

export function SidebarLayoutProvider({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const value = useMemo(
    () => ({
      sidebarCollapsed,
      toggleSidebar: () => setSidebarCollapsed((c) => !c),
    }),
    [sidebarCollapsed],
  )

  return <SidebarLayoutContext.Provider value={value}>{children}</SidebarLayoutContext.Provider>
}
