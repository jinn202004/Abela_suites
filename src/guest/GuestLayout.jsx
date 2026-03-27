import { Outlet } from 'react-router-dom'
import GuestSidebar from './GuestSidebar'
import { GuestLayoutProvider } from './GuestLayoutContext'
import './GuestLayout.css'

export default function GuestLayout() {
  return (
    <GuestLayoutProvider>
      <div className="guest-layout">
        <GuestSidebar />
        <div className="guest-layout__content">
          <Outlet />
        </div>
      </div>
    </GuestLayoutProvider>
  )
}
