import BelowHero from '@/components/landing/below-hero/BelowHero'
import LandingHero from '@/components/landing/landing-hero/LandingHero'
import styles from './landing.module.css'

const LandingPage = () => {
  return (
    <div className={styles.pageContainer}>

        <div className={styles.heroContainer}>
            <LandingHero />
        </div>

        <BelowHero />

    </div>
  )
}

export default LandingPage