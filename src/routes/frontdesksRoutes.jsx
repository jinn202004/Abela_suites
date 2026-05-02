/* Demo front desk login: `src/frontdesks/frontdesksDemoAuth.js` */
import { Navigate, Route } from 'react-router-dom'
import FrontDeskDashboard from '../frontdesks/frontdesk-dashboard'
import FrontDeskRooms from '../frontdesks/frontdesk-rooms'
import FrontDeskEvents from '../frontdesks/frontdesk-events'
import FrontDeskHousekeeping from '../frontdesks/frontdesk-housekeeping'
import FrontDeskBills from '../frontdesks/frontdesk-bills'
import FrontDeskHistory from '../frontdesks/frontdesk-history'
import FrontDeskSettings from '../frontdesks/frontdesk-settings'

/** Nested `/frontdesk/*` URLs redirect to legacy `/frontdesk-*` pages. */
export const FRONTDESK_APP_ROUTES = [
  <Route key="frontdesk-root" path="/frontdesk" element={<Navigate to="/frontdesk-dashboard" replace />} />,
  <Route key="frontdesk-rooms-nested" path="/frontdesk/rooms" element={<Navigate to="/frontdesk-rooms" replace />} />,
  <Route key="frontdesk-events-nested" path="/frontdesk/events" element={<Navigate to="/frontdesk-events" replace />} />,
  <Route key="frontdesk-bills-nested" path="/frontdesk/bills" element={<Navigate to="/frontdesk-bills" replace />} />,
  <Route key="frontdesk-settings-nested" path="/frontdesk/settings" element={<Navigate to="/frontdesk-settings" replace />} />,
  <Route key="frontdesk-hk-nested" path="/frontdesk/housekeeping" element={<Navigate to="/frontdesk-housekeeping" replace />} />,
  <Route key="frontdesk-hist-nested" path="/frontdesk/reservation-history" element={<Navigate to="/frontdesk-history" replace />} />,
  <Route key="frontdesk-dashboard-legacy" path="/frontdesk-dashboard" element={<FrontDeskDashboard />} />,
  <Route key="frontdesk-rooms-legacy" path="/frontdesk-rooms" element={<FrontDeskRooms />} />,
  <Route key="frontdesk-events-legacy" path="/frontdesk-events" element={<FrontDeskEvents />} />,
  <Route key="frontdesk-housekeeping-legacy" path="/frontdesk-housekeeping" element={<FrontDeskHousekeeping />} />,
  <Route key="frontdesk-bills-legacy" path="/frontdesk-bills" element={<FrontDeskBills />} />,
  <Route key="frontdesk-history-legacy" path="/frontdesk-history" element={<FrontDeskHistory />} />,
  <Route key="frontdesk-settings-legacy" path="/frontdesk-settings" element={<FrontDeskSettings />} />,
]
