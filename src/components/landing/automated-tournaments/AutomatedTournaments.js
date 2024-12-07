"use client"

import Image from 'next/image'
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import counterStrikeCard from '@/images/counter_strike_card.webp'
import fifaCard from '@/images/fifa_card.webp'
import observerStyle from '@/styles/intersection/intersection.module.css'
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './automated-tournaments.module.css'

const AutomatedTournaments = ({ scrollToForm }) => {
    const [ref, isVisible] = useIntersectionObserver({ threshold: 0.01 })
    const [refText, isTextVisible] = useIntersectionObserver({ threshold: 0.2 })

  return (
    <div className={landingStyles.automatedTournamentsContainer}>
        <div className={`${landingStyles.innerAutomatedTournamentsContainer} ${styles.innerAutomatedTournamentsContainer}`}>
            <div className={styles.leftAutomatedTournaments}>
                <div
                    ref={refText}
                    className={`${styles.innerLeftAutomatedTournaments} ${observerStyle.innerLeftAutomatedTournaments} ${isTextVisible ? observerStyle.fadeInDissolve : ''}`}
                >
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

                        <button
                            className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN}`}
                            onClick={scrollToForm}
                        >
                            Join the waitlist</button>
                    </div>
                </div>
            </div>

            <div className={styles.rightAutomatedTournaments}>
                <div className={styles.innerRightAutomatedTournaments}>
                    <div
                        ref={ref}
                        className={`${styles.counterStrikeCardContainer} ${observerStyle.counterStrikeCardContainer} ${isVisible ? observerStyle.fadeInFromLeft : ''}`}
                    >
                        <Image
                            src={counterStrikeCard}
                            alt='Counter Strike Card'
                        />
                    </div>

                    <div
                        ref={ref}
                        className={`${styles.fifaCardContainer}  ${observerStyle.counterStrikeCardContainer} ${isVisible ? observerStyle.fadeInFromRight : ''}`}
                    >
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