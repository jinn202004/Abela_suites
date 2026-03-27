import { useCarouselIndex } from '../hooks/useCarouselIndex'
import { ChevronLeftIcon, ChevronRightIcon } from './icons/ChevronIcons'
import './RestaurantSection.css'

const PLACEHOLDER = '/restaurant-placeholder.jpg'
const SLIDE_COUNT = 3

export default function RestaurantSection() {
  const { index, setIndex, go, trackStyle } = useCarouselIndex(SLIDE_COUNT)

  return (
    <section className="restaurant" id="restaurant" aria-labelledby="restaurant-heading">
      <div className="restaurant__inner">
        <div className="restaurant__carousel" aria-roledescription="carousel" aria-label="Restaurant photos">
          <div className="restaurant__viewport">
            <div className="restaurant__track" style={trackStyle}>
              {Array.from({ length: SLIDE_COUNT }, (_, i) => (
                <div key={i} className="restaurant__slide">
                  <img
                    className="restaurant__img"
                    src={PLACEHOLDER}
                    alt=""
                    width={900}
                    height={600}
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="restaurant__arrow restaurant__arrow--prev"
            onClick={() => go(-1)}
            aria-label="Previous slide"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className="restaurant__arrow restaurant__arrow--next"
            onClick={() => go(1)}
            aria-label="Next slide"
          >
            <ChevronRightIcon />
          </button>
          <div className="restaurant__dots" role="tablist" aria-label="Slides">
            {Array.from({ length: SLIDE_COUNT }, (_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Slide ${i + 1}`}
                className={`restaurant__dot ${i === index ? 'restaurant__dot--active' : ''}`}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        </div>

        <div className="restaurant__copy">
          <h2 id="restaurant-heading" className="restaurant__title">
            Abela&apos;s Restaurant Food
          </h2>
          <p className="restaurant__text">
            Enjoy a relaxing stay paired with delicious meals at our on-site restaurant. Abela
            Hotel and Restaurant offers cozy accommodations, tasty dishes, and a welcoming
            atmosphere—perfect for both rest and memorable dining.
          </p>
        </div>
      </div>
    </section>
  )
}
