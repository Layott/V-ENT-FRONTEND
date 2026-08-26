'use client';

import { useT } from '@/i18n/LanguageProvider';
import Image from 'next/image'
import Link from 'next/link'
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import marketPlaceLeft from '@/images/market_place_left.png'
import marketPlaceRight from '@/images/market_place_right.png'
import observerStyle from '@/styles/intersection/intersection.module.css'
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './../automated-tournaments/automated-tournaments.module.css'


const LandingMarketplace = ({ scrollToForm }) => {
  const tt = useT();
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
                        <p className={landingStyles.subHeadingText}>
                            {tt("landing.marketplace.eyebrow", "Marketplace")}
                        </p>
                        <h2 className={landingStyles.headingText}>
                            {tt("landing.marketplace.heading", "Buy, Sell, and Trade Virtual Goods")}
                        </h2>
                    </div>
                    
                    <div className={`${landingStyles.descriptionContainer} ${styles.descriptionContainer}`}>
                        <p className={landingStyles.descriptionParagraph}>
                            {tt("landing.marketplace.body", "Explore Vermillion City, our exclusive marketplace for buying, selling, or trading game accounts, virtual items, and anime merchandise. Whether it’s rare in-game gear or collectibles, you’ll find it here.")}
                        </p>

                        <Link
                            href={'/signup'}
                            className={`${profileStyles.waitlistBTN} ${profileStyles.loginBTN}`}
                            >
                            {tt("landing.signup", "Signup")}
                        </Link>
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
                            src={marketPlaceLeft}
                            alt='Market Place Left'
                        />
                    </div>

                    <div
                        ref={ref}
                        className={`${styles.fifaCardContainer}  ${observerStyle.counterStrikeCardContainer} ${isVisible ? observerStyle.fadeInFromRight : ''}`}
                    >
                        <Image
                            src={marketPlaceRight}
                            alt='Market Place Right'
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default LandingMarketplace