/** Mock dashboard metrics — can be replaced with JSON Server later */
export const DASHBOARD_STATS = {
  todayBookings: 23,
  upcomingBookings: 10,
  availableRooms: 0,
  todayRevenue: '₱24,999',
}

/** Last 7 days — booking overview line chart */
export const BOOKING_OVERVIEW_SERIES = [
  { day: 'Wed', approved: 12, pending: 8, cancelled: 3 },
  { day: 'Thu', approved: 15, pending: 6, cancelled: 2 },
  { day: 'Fri', approved: 18, pending: 5, cancelled: 4 },
  { day: 'Sat', approved: 22, pending: 7, cancelled: 1 },
  { day: 'Sun', approved: 16, pending: 9, cancelled: 3 },
  { day: 'Mon', approved: 20, pending: 4, cancelled: 2 },
  { day: 'Tue', approved: 19, pending: 6, cancelled: 2 },
]

export const RECENT_BOOKINGS = [
  { id: 'rb-1', name: 'Janah Cultura', status: 'approved' },
  { id: 'rb-2', name: 'Joanah Cultura', status: 'rejected' },
  { id: 'rb-3', name: 'Jujenn Nabo', status: 'pending' },
]

export const SALES_REPORT_DATA = [
  { period: 'Jan', roomRevenue: 22000, posSales: 18000, totalSales: 40000 },
  { period: 'Feb', roomRevenue: 95000, posSales: 40000, totalSales: 135000 },
  { period: 'Mar', roomRevenue: 380000, posSales: 190000, totalSales: 570000 },
]

export const PAYMENT_METHODS = [
  { id: 'gcash', label: 'GCash', amount: '₱400,000' },
  { id: 'cash', label: 'Cash', amount: '₱95,000' },
]
