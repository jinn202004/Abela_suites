/** Canonical labels stored in `room.features` for preset checkboxes */
export const FEATURE_PRESETS = {
  freeBreakfast: 'Free Breakfast',
  wifi: 'WiFi',
  tv: 'TV',
  bathroomAmenities: 'Bathroom Amenities',
}

const NORM = (s) => String(s).trim().toLowerCase()

/** Map preset keys to booleans + leftover strings for "Other" */
export function parseFeaturesArray(features) {
  if (!Array.isArray(features)) {
    return {
      featFreeBreakfast: false,
      featWifi: false,
      featTv: false,
      featBathroom: false,
      otherFeatureText: '',
      featOther: false,
    }
  }
  const flags = {
    featFreeBreakfast: false,
    featWifi: false,
    featTv: false,
    featBathroom: false,
  }
  const leftovers = []
  for (const raw of features) {
    const f = String(raw).trim()
    if (!f) continue
    const n = NORM(f)
    if (n === NORM(FEATURE_PRESETS.freeBreakfast)) {
      flags.featFreeBreakfast = true
    } else if (n === NORM(FEATURE_PRESETS.wifi)) {
      flags.featWifi = true
    } else if (n === NORM(FEATURE_PRESETS.tv)) {
      flags.featTv = true
    } else if (n === NORM(FEATURE_PRESETS.bathroomAmenities) || n === 'bathroom ameneties') {
      flags.featBathroom = true
    } else {
      leftovers.push(f)
    }
  }
  const otherText = leftovers.join(', ')
  return {
    ...flags,
    featOther: leftovers.length > 0,
    otherFeatureText: otherText,
  }
}

/** Build features array from checkbox state */
export function buildFeaturesFromForm({
  featFreeBreakfast,
  featWifi,
  featTv,
  featBathroom,
  featOther,
  otherFeatureText,
}) {
  const out = []
  if (featFreeBreakfast) out.push(FEATURE_PRESETS.freeBreakfast)
  if (featWifi) out.push(FEATURE_PRESETS.wifi)
  if (featTv) out.push(FEATURE_PRESETS.tv)
  if (featBathroom) out.push(FEATURE_PRESETS.bathroomAmenities)
  if (featOther && otherFeatureText.trim()) {
    out.push(otherFeatureText.trim())
  }
  return out
}
