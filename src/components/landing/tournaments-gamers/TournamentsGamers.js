import Image from 'next/image'
import counterStrikeCard from '@/images/counter_strike_card.webp'
import fifaCard from '@/images/fifa_card.webp'
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './tournaments_gamers.module.css'

const TournamentsGamers = () => {
  return (
    <div className={landingStyles.tournamentsGamersContainer}>
        <div className={landingStyles.innerTournamentsGamersContainer}>
            <div className={styles.leftTournamentsGamers}>
                <div className={landingStyles.innerLeftTournamentsGamers}>
                    <div className={landingStyles.headingContainer}>
                        <h4 className={landingStyles.subHeadingText}>
                            Automated Tournaments
                        </h4>
                        <h1 className={landingStyles.headingText}>
                            AI-Powered Tournaments &nbsp;for Gamers
                        </h1>
                    </div>
                    
                    <div className={landingStyles.descriptionContainer}>
                        <p className={landingStyles.descriptionParagraph}>
                            Compete in exciting, automated tournaments for your favorite games. From registration to scoring, our AI-driven system ensures smooth management and real-time updates so you can focus on winning.
                        </p>

                        <button className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN}`}>Join the waitlist</button>
                    </div>
                </div>
            </div>

            <div className={styles.rightTournamentsGamers}>
                <div className={styles.innerRightTournamentsGamers}>
                    <div className={styles.counterStrikeCardContainer}>
                        <Image
                            src={counterStrikeCard}
                            alt='Counter Strike Card'
                        />
                    </div>

                    <div className={styles.fifaCardContainer}>
                        <Image
                            src={fifaCard}
                            alt='FIFA Card'
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default TournamentsGamers