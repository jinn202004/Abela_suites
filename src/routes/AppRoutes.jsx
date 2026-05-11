import { useCallback, useEffect, useState } from 'react'

import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'

import HomeDashboard from '../guests/homedashboard'

import { useAuthRole } from '../context/AuthRoleContext'

import LandingAuthModals from '../logIn/LandingAuthModals'

import { getHomePathForRole } from '../logIn/rolePaths'

import {
  clearPasswordResetFlow,
  getPasswordResetEmail,
  getPasswordResetToken,
  requestPasswordReset,
  resetPasswordWithToken,
  setPasswordResetEmail,
  setPasswordResetToken,
  verifyPasswordResetOtp,
} from '../api/authApi'

import { FRONTDESK_APP_ROUTES } from './frontdesksRoutes'



/* Admin: demo login `src/logIn/adminsDemoAuth.js` (merged in `logIn/tryCredentials.js`) */

import AdminDashboard from '../admin_1/admin-dashboard'

import AdminStaffManagement from '../admin_1/staff'

import AdminBookingManagement from '../admin_1/booking-management'

import AdminRoomManagement from '../admin_1/room-management'

import AdminEventManagement from '../admin_1/event-management'

import AdminInventoryManagement from '../admin_1/inventory'

import AdminRestaurantManagement from '../admin_1/resto'

import AdminSettings from '../admin_1/admin-settings'

import ExportSettings from '../admin_1/export'

import AdminGeneral from '../admin_1/general'

import AdminPersonalInfo from '../admin_1/personal-info'

import AdminBills from '../admin_1/bills'

import AdminAttendanceManagement from '../admin_1/attendance-management'



/* Guest portal + related: demo logins guests → `guest/guestsDemoAuth.js`, housekeeping → `housekeeping/housekeepingDemoAuth.js`, cashier → `cashier/cashierDemoAuth.js` */

import Guests from '../guests/home'

import GuestRoom from '../guests/guest-room'

import GuestEvents from '../guests/guest-events'

import GuestSettings from '../guests/guest-settings'

import MyProfile from '../guests/myprofile'

import BookingHistory from '../guests/booking-history'

import TermsCondition from '../guests/terms-condition'

import TermsConditionStay from '../guests/terms-condtionstay'

import DataPrivacy from '../guests/data-privacy'

import AboutUs from '../guests/about-us'

import Homedashboard from '../guests/homedashboard'

import ContactUs from '../guests/contact-us'

import Testimonials from '../guests/testimonials'

import HousekeepingDashboard from '../housekeeping/housekeepingdashboard'

import HousekeepingRooms from '../housekeeping/rooms'

import HousekeepingEvents from '../housekeeping/events'

import HousekeepingSettings from '../housekeeping/settings'

import Cashier from '../cashier/pos'

import OrderHistory from '../cashier/orderhis'

import CashierSettings from '../cashier/cashier-settings'

import Login from '../logIn/login'

import SignUp from '../logIn/signUp'

import ForgotPassword from '../logIn/forgotPass'

import SetPassword from '../logIn/setPass'

import EnterCode from '../logIn/enterCode'

/** Loads after route modules so scoped guest sidebar logo wins over global admin/frontdesk `.sidebar-logo-img`. */
import '../guests/guest-portal-layout.css'



const ADMIN_APP_ROUTES = [

  <Route key="admin-redirect-root" path="/admin" element={<Navigate to="/admin-dashboard" replace />} />,

  <Route key="admin-redirect-staff" path="/admin/staff" element={<Navigate to="/admin-staff" replace />} />,

  <Route key="admin-redirect-attendance" path="/admin/attendance" element={<Navigate to="/admin-attendance" replace />} />,

  <Route key="admin-redirect-attendances" path="/admin/attendances" element={<Navigate to="/admin-attendance" replace />} />,

  <Route key="admin-redirect-bookings" path="/admin/bookings" element={<Navigate to="/admin-booking-management" replace />} />,

  <Route key="admin-redirect-rooms" path="/admin/rooms" element={<Navigate to="/admin-room-management" replace />} />,

  <Route key="admin-redirect-events" path="/admin/events" element={<Navigate to="/admin-event-management" replace />} />,

  <Route key="admin-redirect-inventory" path="/admin/inventory" element={<Navigate to="/admin-inventory" replace />} />,

  <Route key="admin-redirect-restaurant" path="/admin/restaurant" element={<Navigate to="/admin-restaurant" replace />} />,

  <Route key="admin-redirect-bills" path="/admin/bills" element={<Navigate to="/admin-bills" replace />} />,

  <Route key="admin-redirect-settings" path="/admin/settings" element={<Navigate to="/admin-settings" replace />} />,

  <Route key="admin-redirect-housekeeping" path="/admin/housekeeping" element={<Navigate to="/admin-dashboard" replace />} />,

  <Route key="admin-redirect-reservation-history" path="/admin/reservation-history" element={<Navigate to="/admin-booking-management" replace />} />,

  <Route key="admin-dashboard" path="/admin-dashboard" element={<AdminDashboard />} />,

  <Route key="admin-staff" path="/admin-staff" element={<AdminStaffManagement />} />,

  <Route key="admin-attendance" path="/admin-attendance" element={<AdminAttendanceManagement />} />,

  <Route key="admin-booking-management" path="/admin-booking-management" element={<AdminBookingManagement />} />,

  <Route key="admin-booking" path="/admin-booking" element={<Navigate to="/admin-booking-management" replace />} />,

  <Route key="admin-room-management" path="/admin-room-management" element={<AdminRoomManagement />} />,

  <Route key="admin-event-management" path="/admin-event-management" element={<AdminEventManagement />} />,

  <Route key="admin-inventory" path="/admin-inventory" element={<AdminInventoryManagement />} />,

  <Route key="admin-restaurant" path="/admin-restaurant" element={<AdminRestaurantManagement />} />,

  <Route key="admin-settings" path="/admin-settings" element={<AdminSettings />} />,

  <Route key="admin-export" path="/admin-export" element={<ExportSettings />} />,

  <Route key="admin-general" path="/admin-general" element={<AdminGeneral />} />,

  <Route key="admin-personal-info" path="/admin-personal-info" element={<AdminPersonalInfo />} />,

  <Route key="admin-bills" path="/admin-bills" element={<AdminBills />} />,

  <Route key="admin-rooms" path="/admin-rooms" element={<Navigate to="/admin-room-management" replace />} />,

]



const GUEST_PORTAL_ROUTES = [

  <Route key="guest-redirect-root" path="/guest" element={<Navigate to="/guests" replace />} />,

  <Route key="guest-redirect-rooms" path="/guest/rooms" element={<Navigate to="/guest-room" replace />} />,

  <Route key="guest-redirect-events" path="/guest/events" element={<Navigate to="/guest-events" replace />} />,

  <Route key="guest-redirect-settings" path="/guest/settings" element={<Navigate to="/guest-settings" replace />} />,

  <Route key="guests" path="/guests" element={<Guests />} />,

  <Route key="home-legacy" path="/home" element={<Guests />} />,

  <Route key="guest-room" path="/guest-room" element={<GuestRoom />} />,

  <Route key="guest-events" path="/guest-events" element={<GuestEvents />} />,

  <Route key="rooms-alt" path="/rooms" element={<GuestRoom />} />,

  <Route key="event-venues" path="/event-venues" element={<GuestEvents />} />,

  <Route key="settings-legacy" path="/settings" element={<GuestSettings />} />,

  <Route key="guest-settings" path="/guest-settings" element={<GuestSettings />} />,

  <Route key="myprofile" path="/myprofile" element={<MyProfile />} />,

  <Route key="booking-history" path="/booking-history" element={<BookingHistory />} />,

  <Route key="my-bookings-by-id" path="/my-bookings/:bookingId" element={<BookingHistory />} />,

  <Route key="terms-condition" path="/terms-condition" element={<TermsCondition />} />,

  <Route key="terms-conditionstay" path="/terms-conditionstay" element={<TermsConditionStay />} />,

  <Route key="data-privacy" path="/data-privacy" element={<DataPrivacy />} />,

  <Route key="about-us" path="/about-us" element={<AboutUs />} />,

  <Route key="home-dashboard" path="/home-dashboard" element={<Homedashboard />} />,

  <Route key="testimonials" path="/testimonials" element={<Testimonials />} />,

  <Route key="housekeeping" path="/housekeeping" element={<HousekeepingDashboard />} />,

  <Route key="housekeeping-wild" path="/housekeeping/*" element={<HousekeepingDashboard />} />,

  <Route key="housekeeping-rooms" path="/housekeeping-rooms" element={<HousekeepingRooms />} />,

  <Route key="housekeeping-events" path="/housekeeping-events" element={<HousekeepingEvents />} />,

  <Route key="housekeeping-settings" path="/housekeeping-settings" element={<HousekeepingSettings />} />,

  <Route key="cashier-billing-redirect" path="/cashier-billing" element={<Navigate to="/cashier" replace />} />,

  <Route key="cashier" path="/cashier" element={<Cashier />} />,

  <Route key="order-history" path="/order-history" element={<OrderHistory />} />,

  <Route key="cashier-settings" path="/cashier-settings" element={<CashierSettings />} />,

  <Route key="login" path="/login" element={<Login />} />,

  <Route key="signup" path="/signup" element={<SignUp />} />,

  <Route key="forgot-password" path="/forgot-password" element={<ForgotPassword />} />,

  <Route key="set-password" path="/set-password" element={<SetPassword />} />,

  <Route key="enter-code" path="/enter-code" element={<EnterCode />} />,

  <Route key="staff-dashboard" path="/staff-dashboard" element={<Navigate to="/admin-dashboard" replace />} />,

  <Route key="create-skill-to-frontdesk" path="/create-skill" element={<Navigate to="/frontdesk" replace />} />,

]



export default function AppRoutes() {

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

    clearPasswordResetFlow()

  }



  const openLogin = () => {

    clearPasswordResetFlow()

    setForgotOpen(false)

    setVerifyOpen(false)

    setNewPasswordOpen(false)

    setLoginOpen(true)

  }



  const openForgot = () => {

    clearPasswordResetFlow()

    setLoginOpen(false)

    setVerifyOpen(false)

    setNewPasswordOpen(false)

    setForgotOpen(true)

  }



  const onRequestPasswordReset = useCallback(async (email) => {

    await requestPasswordReset(email)

    setPasswordResetEmail(email)

    setNewPasswordOpen(false)

    setForgotOpen(false)

    setVerifyOpen(true)

  }, [])



  const onResendResetCode = useCallback(async () => {

    const em = getPasswordResetEmail()

    if (!em) {

      throw new Error('Session expired. Start again from Forgot password.')

    }

    await requestPasswordReset(em)

  }, [])



  const onVerifyResetCode = useCallback(async (code) => {

    const em = getPasswordResetEmail()

    if (!em) {

      throw new Error('Session expired. Start again from Forgot password.')

    }

    const token = await verifyPasswordResetOtp(em, code)

    setPasswordResetToken(token)

    setVerifyOpen(false)

    setNewPasswordOpen(true)

  }, [])



  const onSetNewPassword = useCallback(async (password) => {

    const token = getPasswordResetToken()

    if (!token) {

      throw new Error('Session expired. Start again from Forgot password.')

    }

    await resetPasswordWithToken(token, password)

    clearPasswordResetFlow()

    setNewPasswordOpen(false)

    setLoginOpen(true)

  }, [])



  const handleLoginSuccess = (nextRole) => {

    setRole(nextRole)

    closeModals()

    navigate(getHomePathForRole(nextRole))

  }



  return (

    <>

      <Routes>

        <Route

          path="/"

          element={

            <div className="app">

              <HomeDashboard />

            </div>

          }

        />

        <Route

          path="/contact"

          element={

            <div className="app">

              <ContactUs />

            </div>

          }

        />

        {ADMIN_APP_ROUTES}

        {FRONTDESK_APP_ROUTES}

        {GUEST_PORTAL_ROUTES}

        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>



      <LandingAuthModals

        loginOpen={loginOpen}

        forgotOpen={forgotOpen}

        verifyOpen={verifyOpen}

        newPasswordOpen={newPasswordOpen}

        closeModals={closeModals}

        openLogin={openLogin}

        openForgot={openForgot}

        onRequestPasswordReset={onRequestPasswordReset}

        onResendResetCode={onResendResetCode}

        onVerifyResetCode={onVerifyResetCode}

        onSetNewPassword={onSetNewPassword}

        handleLoginSuccess={handleLoginSuccess}

      />

    </>

  )

}

