import Hero from '../components/Hero'
import Navbar from '../components/Navbar'
import QuestionsCTA from '../components/QuestionsCTA'
import RestaurantSection from '../components/RestaurantSection'
import SiteFooter from '../components/SiteFooter'
import WhyChooseUs from '../components/WhyChooseUs'
import TestimonialsSection from '../components/TestimonialsSection'

export default function LandingPage({ onLoginClick }) {
  return (
    <>
      <Navbar onLoginClick={onLoginClick} />
      <Hero />
      <TestimonialsSection />
      <WhyChooseUs />
      <RestaurantSection />
      <QuestionsCTA />
      <SiteFooter />
    </>
  )
}
