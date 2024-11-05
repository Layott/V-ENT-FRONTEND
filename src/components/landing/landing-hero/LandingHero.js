import topLeftImage from '@/images/top_left.jpeg'
import topRightImage from '@/images/top_right.jpg'
import bottomRightImage from '@/images/bottom_right.jpg'
import bottomLeftImage from '@/images/bottom_left.jpg'

import landingStyles from '@/styles/landing/landing.module.css'
import profileStyles from '@/styles/profile/profile-page.module.css'
import Link from 'next/link'
import logoRed from "@/images/logo_mark_red.svg"
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

        <div className={styles.innerLandingHeroContainer}>

          <header className={styles.headerContainer}>
            <div className={styles.headerLogoContainer}>
              <Link className={styles.logoLink} href={'/'}>
                <div className={styles.innerLogoContainer}>
                    <Image
                        src={logoRed}
                        alt='Logo'
                        className={styles.logo}
                    />
                </div>
                <h1>v-ent</h1>
              </Link>
            </div>

            <div className={styles.headerJoinTournamentsBTNContainer}>
              <button className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN} ${styles.waitlistBTN}`}>Join the waitlist</button>
            </div>
          </header>

          <div className={styles.heroContent}>
            <div className={styles.heroContentTop}>
              <div className={styles.gamingAnimeTribeContainer}>
                <h1>Gaming</h1>
                <h1 className={styles.h1Anime}>Anime</h1>
                <h1 className={styles.h1Tribe}>Tribe</h1>
              </div>
              <div className={styles.heroWelcomeTextContainer}>
                <p>Welcome to V-ENT, the ultimate platform where gaming, anime, and community converge. Whether you&#39;re a competitive esports player, a casual gamer, or an anime enthusiast, V-ENT offers tournaments, a vibrant marketplace, and unique features to help you immerse yourself in what you love most. Connect, compete, and engage in a community built for fans by fans.</p>
                <div className={styles.formContainer}>
                  <form action="" className={styles.form}>
                    <input type="text" placeholder="Enter your email address" className={styles.inputText} />
                    <button className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN} ${styles.waitlistBTN}`}>Join the waitlist</button>
                  </form>
                </div>
              </div>
            </div>

            <div className={styles.heroContentBottom}>
              <div className={styles.topImageContainer}>
                <div className={styles.topLeftImageContainer}>
                  <Image src={topLeftImage} alt="Top Left Image" />
                </div>

                <div className={styles.topRightImageContainer}>
                  <Image src={topRightImage} alt="Top Right Image" />
                </div>
              </div>

              <div className={styles.bottomImageContainer}>
                <div className={styles.bottomLeftImageContainer}>
                  <Image src={bottomLeftImage} alt="Bottom Left Image" />
                </div>

                <div className={styles.bottomRightImageContainer}>
                  <Image src={bottomRightImage} alt="Bottom Right Image" />
                </div>
              </div>

              </div>

          </div>


        </div>
    </div>
  )
}

export default LandingHero