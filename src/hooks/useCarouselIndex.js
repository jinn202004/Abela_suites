import { useMemo, useState } from 'react'

/**
 * @param {number} slideCount
 * @param {number} [initialIndex]
 */
export function useCarouselIndex(slideCount, initialIndex = 0) {
  const [index, setIndex] = useState(initialIndex)

  const go = (delta) => {
    setIndex((i) => (i + delta + slideCount) % slideCount)
  }

  const trackStyle = useMemo(() => {
    const pct = slideCount > 0 ? 100 / slideCount : 0
    return { transform: `translateX(-${index * pct}%)` }
  }, [index, slideCount])

  return { index, setIndex, go, trackStyle, slideCount }
}
