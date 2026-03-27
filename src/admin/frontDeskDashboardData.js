/** Demo / fallback when API rooms are empty or unavailable */
export const FRONTDESK_DEMO_ROOMS = [
  { id: 'fd-1', roomLabel: '1', title: 'Single Cozy', price: 719, status: 'available' },
  { id: 'fd-2', roomLabel: '2', title: 'Twin Bed', price: 1148, status: 'needs_cleaning' },
  { id: 'fd-3', roomLabel: '3', title: 'Double Standard', price: 1226, status: 'occupied' },
  { id: 'fd-4', roomLabel: '4', title: 'Deluxe Suite', price: 2100, status: 'under_maintenance' },
  { id: 'fd-5', roomLabel: '5', title: 'Family Room', price: 1850, status: 'unavailable' },
]

export const FRONTDESK_RESERVED_SNAPSHOT = [
  { id: 'r1', day: 27, label: 'Room 11 — Jay', detail: 'Status: Approved', month: 2, year: 2026 },
]

export const FRONTDESK_STATS_DEFAULT = {
  reservationsToday: 0,
  totalReservations: 0,
  toCollect: 0,
}
