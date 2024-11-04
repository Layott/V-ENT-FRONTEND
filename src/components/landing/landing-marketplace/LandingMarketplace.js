import Image from 'next/image'
import marketPlaceLeft from '@/images/market_place_left.png'
import marketPlaceRight from '@/images/market_place_right.png'
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './../automated-tournaments/automated-tournaments.module.css'


const LandingMarketplace = () => {
  return (
    <div className={landingStyles.automatedTournamentsContainer}>
        <div className={`${landingStyles.innerAutomatedTournamentsContainer} ${styles.innerAutomatedTournamentsContainer}`}>
            <div className={styles.leftAutomatedTournaments}>
                <div className={styles.innerLeftAutomatedTournaments}>
                    <div className={`${landingStyles.headingContainer} ${styles.headingContainer}`}>
                        <h4 className={landingStyles.subHeadingText}>
                            Marketplace
                        </h4>
                        <h1 className={landingStyles.headingText}>
                            Buy, Sell, and Trade Virtual Goods
                        </h1>
                    </div>
                    
                    <div className={`${landingStyles.descriptionContainer} ${styles.descriptionContainer}`}>
                        <p className={landingStyles.descriptionParagraph}>
                            Explore Vermillion City, our exclusive marketplace for buying, selling, or trading game accounts, virtual items, and anime merchandise. Whether it’s rare in-game gear or collectibles, you’ll find it here.
                        </p>

                        <button className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN}`}>Join the waitlist</button>
                    </div>
                </div>
            </div>

            <div className={styles.rightAutomatedTournaments}>
                <div className={styles.innerRightAutomatedTournaments}>
                    <div className={styles.counterStrikeCardContainer}>
                        <Image
                            src={marketPlaceLeft}
                            alt='Market Place Left'
                        />
                    </div>

                    <div className={styles.fifaCardContainer}>
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