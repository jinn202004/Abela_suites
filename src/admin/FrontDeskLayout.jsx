import { Navigate, Outlet } from 'react-router-dom'
import { useAuthRole } from '../context/AuthRoleContext'
import { SidebarLayoutProvider } from '../layout/SidebarLayoutContext'
import FrontDeskSidebar from './FrontDeskSidebar'
import './AdminLayout.css'

export default function FrontDeskLayout() {
  const { role } = useAuthRole()
  if (role === 'admin') {
    return <Navigate to="/admin" replace />
  }
  if (role !== 'frontdesk') {
    return <Navigate to="/" replace />
  }

  return (
    <SidebarLayoutProvider>
      <div className="admin-layout">
        <FrontDeskSidebar />
        <div className="admin-layout__content">
          <Outlet />
        </div>
      </div>
    </SidebarLayoutProvider>
  )
}
