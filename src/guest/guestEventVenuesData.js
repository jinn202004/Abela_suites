/**
 * Fallback when JSON Server is offline. Live data: `eventVenues` in `db.json` (see `npm run api`).
 */
export const GUEST_EVENT_VENUES = [
  {
    id: 'fallback-1',
    name: 'Grand Ballroom',
    capacity: 200,
    price: '₱15,000',
    location: 'Main building, ground floor',
    description: 'Spacious hall for weddings, debuts, and corporate galas. Includes basic lighting.',
    amenities: ['Stage', 'AV hookups', 'Bridal suite access'],
    image: 'https://images.unsplash.com/photo-1519167758481-83f29da3d0b6?w=640&q=80',
  },
  {
    id: 'fallback-2',
    name: 'Garden Pavilion',
    capacity: 80,
    price: '₱8,500',
    location: 'Outdoor garden area',
    description: 'Open-air venue with covered option — ideal for receptions and parties.',
    amenities: ['Garden lighting', 'Tent option', 'Parking nearby'],
    image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=640&q=80',
  },
]
