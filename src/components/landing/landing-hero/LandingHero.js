import LeftHero from './left-hero/LeftHero'
import RightHero from './right-hero/RightHero'
import tunnelPattern from '@/images/tunnel_pattern.svg'
import Image from "next/image"
import styles from './landing-hero.module.css'


const LandingHero = () => {
  return (
    <div className={styles.landingHeroContainer}>
        <Image
            src={tunnelPattern}
            alt='Tunnel Pattern'
        />
        <LeftHero />
        <RightHero />
    </div>
  )
}

export default LandingHero