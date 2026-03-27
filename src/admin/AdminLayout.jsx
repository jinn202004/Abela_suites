import { Navigate, Outlet } from 'react-router-dom'
import { useAuthRole } from '../context/AuthRoleContext'
import { SidebarLayoutProvider } from '../layout/SidebarLayoutContext'
import AdminSidebar from './AdminSidebar'
import './AdminLayout.css'

export default function AdminLayout() {
  const { role } = useAuthRole()
  if (role === 'frontdesk') {
    return <Navigate to="/frontdesk" replace />
  }

  return (
    <SidebarLayoutProvider>
      <div className="admin-layout">
        <AdminSidebar />
        <div className="admin-layout__content">
          <Outlet />
        </div>
      </div>
    </SidebarLayoutProvider>
  )
}
