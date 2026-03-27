import { createContext, useContext, useMemo, useState } from 'react'

const STORAGE_KEY = 'joanah_app_role'

const AuthRoleContext = createContext(null)

export function AuthRoleProvider({ children }) {
  const [role, setRoleState] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) || null
    } catch {
      return null
    }
  })

  const setRole = (r) => {
    setRoleState(r)
    try {
      if (r) sessionStorage.setItem(STORAGE_KEY, r)
      else sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }

  const value = useMemo(() => ({ role, setRole }), [role])

  return <AuthRoleContext.Provider value={value}>{children}</AuthRoleContext.Provider>
}

export function useAuthRole() {
  const ctx = useContext(AuthRoleContext)
  if (!ctx) throw new Error('useAuthRole must be used within AuthRoleProvider')
  return ctx
}
