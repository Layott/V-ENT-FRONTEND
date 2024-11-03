import LandingHero from '@/components/landing/landing-hero/LandingHero'
import BelowHero from '@/components/landing/below-hero/BelowHero'
import TournamentsGamers from '@/components/landing/tournaments-gamers/TournamentsGamers'
import ManageEvents from '@/components/landing/manage-events/ManageEvents'
import LandingShop from '@/components/landing/landing-shop/LandingShop'
import LandingBrands from '@/components/landing/landing-brands/LandingBrands'
import OtherFeatures from '@/components/landing/other-features/OtherFeatures'
import JoinThousandsGamers from '@/components/landing/join-thousands-gamers/JoinThousandsGamers'
import FooterLanding from '@/components/landing/footer-landing/FooterLanding'
import styles from './page.module.css'

const LandingPage = () => {
  return (
    <div className={styles.pageContainer}>

        <div className={styles.heroContainer}>
            <LandingHero />
        </div>

        <BelowHero />
        <TournamentsGamers />
        <ManageEvents />
        <LandingShop />
        <LandingBrands />
        <OtherFeatures />
        <JoinThousandsGamers />
        <FooterLanding />

    </div>
  )
}

export default LandingPage