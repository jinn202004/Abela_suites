import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import { AuthRoleProvider, useAuthRole } from './context/AuthRoleContext'
import ForgotPasswordModal from './components/ForgotPasswordModal'
import LoginModal from './components/LoginModal'
import SetNewPasswordModal from './components/SetNewPasswordModal'
import VerificationCodeModal from './components/VerificationCodeModal'
import GuestLayout from './guest/GuestLayout'
import GuestHomePage from './guest/GuestHomePage'
import GuestPlaceholderPage from './guest/GuestPlaceholderPage'
import GuestRoomsPage from './guest/GuestRoomsPage'
import GuestEventVenuesPage from './guest/GuestEventVenuesPage'
import AdminLayout from './admin/AdminLayout'
import FrontDeskLayout from './admin/FrontDeskLayout'
import AdminIndexPage from './admin/AdminIndexPage'
import FrontDeskDashboardPage from './admin/FrontDeskDashboardPage'
import AdminPlaceholderPage from './admin/AdminPlaceholderPage'
import AdminRoomManagementPage from './admin/AdminRoomManagementPage'
import FrontDeskRoomReservationsPage from './admin/FrontDeskRoomReservationsPage'
import AdminBookingManagementPage from './admin/AdminBookingManagementPage'
import AdminStaffManagementPage from './admin/AdminStaffManagementPage'
import AdminEventVenuesPage from './admin/AdminEventVenuesPage'
import FrontDeskEventReservationsPage from './admin/FrontDeskEventReservationsPage'
import LandingPage from './pages/LandingPage'

function AppRoutes() {
  const navigate = useNavigate()
  const { setRole } = useAuthRole()
  const [loginOpen, setLoginOpen] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [newPasswordOpen, setNewPasswordOpen] = useState(false)

  useEffect(() => {
    if (!loginOpen && !forgotOpen && !verifyOpen && !newPasswordOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [loginOpen, forgotOpen, verifyOpen, newPasswordOpen])

  const closeModals = () => {
    setLoginOpen(false)
    setForgotOpen(false)
    setVerifyOpen(false)
    setNewPasswordOpen(false)
  }

  const openLogin = () => {
    setForgotOpen(false)
    setVerifyOpen(false)
    setNewPasswordOpen(false)
    setLoginOpen(true)
  }

  const openForgot = () => {
    setLoginOpen(false)
    setVerifyOpen(false)
    setNewPasswordOpen(false)
    setForgotOpen(true)
  }

  const openVerifyFromForgot = () => {
    setNewPasswordOpen(false)
    setForgotOpen(false)
    setVerifyOpen(true)
  }

  const openSetPasswordFromVerify = () => {
    setVerifyOpen(false)
    setNewPasswordOpen(true)
  }

  const handlePasswordSetComplete = () => {
    setNewPasswordOpen(false)
    setLoginOpen(true)
  }

  const handleLoginSuccess = (nextRole) => {
    setRole(nextRole)
    closeModals()
    if (nextRole === 'admin') {
      navigate('/admin')
    } else if (nextRole === 'frontdesk') {
      navigate('/frontdesk')
    } else {
      navigate('/guest')
    }
  }

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <div className="app">
              <LandingPage onLoginClick={openLogin} />
            </div>
          }
        />
        <Route path="/guest" element={<GuestLayout />}>
          <Route index element={<GuestHomePage />} />
          <Route path="rooms" element={<GuestRoomsPage />} />
          <Route path="events" element={<GuestEventVenuesPage />} />
          <Route path="settings" element={<GuestPlaceholderPage title="Settings" />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminIndexPage />} />
          <Route path="staff" element={<AdminStaffManagementPage />} />
          <Route path="bookings" element={<AdminBookingManagementPage />} />
          <Route path="rooms" element={<AdminRoomManagementPage />} />
          <Route path="events" element={<AdminEventVenuesPage />} />
          <Route path="inventory" element={<AdminPlaceholderPage />} />
          <Route path="restaurant" element={<AdminPlaceholderPage />} />
          <Route path="bills" element={<AdminPlaceholderPage />} />
          <Route path="settings" element={<AdminPlaceholderPage />} />
          <Route path="housekeeping" element={<AdminPlaceholderPage title="Housekeeping" />} />
          <Route path="reservation-history" element={<AdminPlaceholderPage title="Reservation History" />} />
        </Route>
        <Route path="/frontdesk" element={<FrontDeskLayout />}>
          <Route index element={<FrontDeskDashboardPage />} />
          <Route path="rooms" element={<FrontDeskRoomReservationsPage />} />
          <Route path="events" element={<FrontDeskEventReservationsPage />} />
          <Route path="bills" element={<AdminPlaceholderPage />} />
          <Route path="settings" element={<AdminPlaceholderPage />} />
          <Route path="housekeeping" element={<AdminPlaceholderPage title="Housekeeping" />} />
          <Route path="reservation-history" element={<AdminPlaceholderPage title="Reservation History" />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <LoginModal
        key={loginOpen ? 'login-open' : 'login-closed'}
        isOpen={loginOpen}
        onClose={closeModals}
        onForgotPassword={openForgot}
        onLoginSuccess={handleLoginSuccess}
      />
      <ForgotPasswordModal
        key={forgotOpen ? 'forgot-open' : 'forgot-closed'}
        isOpen={forgotOpen}
        onClose={closeModals}
        onBackToLogin={openLogin}
        onSubmitted={openVerifyFromForgot}
      />
      <VerificationCodeModal
        key={verifyOpen ? 'verify-open' : 'verify-closed'}
        isOpen={verifyOpen}
        onClose={closeModals}
        onValidCode={openSetPasswordFromVerify}
      />
      <SetNewPasswordModal
        key={newPasswordOpen ? 'setpw-open' : 'setpw-closed'}
        isOpen={newPasswordOpen}
        onClose={closeModals}
        onBackToLogin={openLogin}
        onPasswordSet={handlePasswordSetComplete}
      />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthRoleProvider>
        <AppRoutes />
      </AuthRoleProvider>
    </BrowserRouter>
  )
}
