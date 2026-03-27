import './WhyChooseUs.css'

function IconHouse() {
  return (
    <svg
      className="whychoose__icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z" />
      <path d="M9 21V12h6v9" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg
      className="whychoose__icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3.5 2" />
    </svg>
  )
}

function IconGift() {
  return (
    <svg
      className="whychoose__icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <path d="M12 8V21M4 12h16M4 8h16v4H4V8Z" />
      <path d="M8 8c0-2 1.5-4 4-4s4 2 4 4" />
    </svg>
  )
}

function IconCard() {
  return (
    <svg
      className="whychoose__icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18" />
    </svg>
  )
}

function IconPeople() {
  return (
    <svg
      className="whychoose__icon-svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={true}
    >
      <circle cx="8" cy="8.5" r="2.2" />
      <path d="M4.5 18.5c0-2.2 1.6-3.8 3.5-3.8s3.5 1.6 3.5 3.8" />
      <circle cx="16" cy="8.5" r="2.2" />
      <path d="M12.5 18.5c0-2.2 1.6-3.8 3.5-3.8s3.5 1.6 3.5 3.8" />
    </svg>
  )
}

const FEATURES = [
  {
    title: 'Modern Facilities',
    description:
      'Well-maintained rooms with air conditioning, WiFi, and more',
    Icon: IconHouse,
  },
  {
    title: 'Flexible Booking',
    description: '6-hour and 12-hour room options available',
    Icon: IconClock,
  },
  {
    title: 'Event Venue',
    description: 'Perfect Venue for weddings, birthdays, and more',
    Icon: IconGift,
  },
  {
    title: 'Affordable Rates',
    description: 'Competitive pricing for both rooms and events',
    Icon: IconCard,
  },
  {
    title: 'Friendly Staff',
    description: 'Kind and helpful staff ready to assist guests.',
    Icon: IconPeople,
  },
]

export default function WhyChooseUs() {
  return (
    <section className="whychoose" id="why-choose-us" aria-labelledby="whychoose-heading">
      <div className="whychoose__inner">
        <h2 id="whychoose-heading" className="whychoose__title">
          Why Choose Us?
        </h2>
        <ul className="whychoose__grid">
          {FEATURES.map(({ title, description, Icon }) => (
            <li key={title} className="whychoose__item">
              <div className="whychoose__icon-wrap">
                <Icon />
              </div>
              <h3 className="whychoose__item-title">{title}</h3>
              <p className="whychoose__item-desc">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
