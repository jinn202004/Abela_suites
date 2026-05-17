/** Shared contact / map settings for the public Contact Us page. */

export const ABELA_CONTACT = {
  businessName: "Abela Suites",
  /** Display address (single line for map popup; multiline in sidebar). */
  addressLine: "Barangay Linggangao, Balingasag, Misamis Oriental 9005",
  addressDetail:
    "Near Balingasag bus terminal, fronting Balingasag pasalubong center",
  phone: "09123456789",
  email: "info@abelasuites.com",
  /** Linggangao / Balingasag — used for map pin when no Google API key is set. */
  latitude: 8.7472,
  longitude: 124.7831,
};

const MAP_QUERY = encodeURIComponent(
  "Abela Suites, Barangay Linggangao, Balingasag, Misamis Oriental, Philippines 9005"
);

export const GOOGLE_MAPS_DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${MAP_QUERY}`;

export const FACEBOOK_PAGES = [
  {
    label: "Abela Suites — Official Page",
    href: "https://www.facebook.com/abelasuitesofficialpage",
  },
];

/**
 * Google Maps embed — uses Embed API when `VITE_GOOGLE_MAPS_API_KEY` is set,
 * otherwise a no-key iframe centered on the hotel coordinates.
 */
export function buildMapEmbedSrc() {
  const apiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();
  const { latitude, longitude } = ABELA_CONTACT;

  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${MAP_QUERY}&zoom=17`;
  }

  return `https://maps.google.com/maps?q=${latitude},${longitude}&hl=en&z=17&output=embed`;
}
