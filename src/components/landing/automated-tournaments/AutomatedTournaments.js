import Image from 'next/image'
import counterStrikeCard from '@/images/counter_strike_card.webp'
import fifaCard from '@/images/fifa_card.webp'
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './automated-tournaments.module.css'


const AutomatedTournaments = () => {
  return (
    <div className={landingStyles.automatedTournamentsContainer}>
        <div className={`${landingStyles.innerAutomatedTournamentsContainer} ${styles.innerAutomatedTournamentsContainer}`}>
            <div className={styles.leftAutomatedTournaments}>
                <div className={styles.innerLeftAutomatedTournaments}>
                    <div className={`${landingStyles.headingContainer} ${styles.headingContainer}`}>
                        <h4 className={landingStyles.subHeadingText}>
                            Automated Tournaments
                        </h4>
                        <h1 className={landingStyles.headingText}>
                            AI-Powered Tournaments &nbsp;for Gamers
                        </h1>
                    </div>
                    
                    <div className={`${landingStyles.descriptionContainer} ${styles.descriptionContainer}`}>
                        <p className={landingStyles.descriptionParagraph}>
                            Compete in exciting, automated tournaments for your favorite games. From registration to scoring, our AI-driven system ensures smooth management and real-time updates so you can focus on winning.
                        </p>

                        <button className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN}`}>Join the waitlist</button>
                    </div>
                </div>
            </div>

            <div className={styles.rightAutomatedTournaments}>
                <div className={styles.innerRightAutomatedTournaments}>
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

export default AutomatedTournaments