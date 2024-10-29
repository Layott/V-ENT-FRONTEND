import LandingHero from '@/components/landing/landing-hero/LandingHero'
import BelowHero from '@/components/landing/below-hero/BelowHero'
import TournamentsGamers from '@/components/landing/tournaments-gamers/TournamentsGamers'
import ManageEvents from '@/components/landing/manage-events/ManageEvents'
import styles from './landing.module.css'

const LandingPage = () => {
  return (
    <div className={styles.pageContainer}>

        <div className={styles.heroContainer}>
            <LandingHero />
        </div>

        <BelowHero />
        <TournamentsGamers />
        <ManageEvents />

    </div>
  )
}

export default LandingPage