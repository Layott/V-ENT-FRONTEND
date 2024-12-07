import Image from 'next/image'
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import topLeftAnimeHub from '@/images/top_left_2.jpg'
import topRightAnimeHub from '@/images/top_right_2.jpg'
import bottomLeftAnimeHub from '@/images/bottom_left_2.webp'
import bottomRightAnimeHub from '@/images/bottom_right.jpg'
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import observerStyle from '@/styles/intersection/intersection.module.css'
import styles from './landing-anime-hub.module.css'

const LandingAnimeHub = ({ scrollToForm }) => {
    const [ref, isVisible] = useIntersectionObserver({ threshold: 0.01 })
    const [refText, isTextVisible] = useIntersectionObserver({ threshold: 0.2 })

  return (
    <div className={`${landingStyles.landingAnimeHubContainer} ${styles.landingAnimeHubContainer}`}>
        <div className={`${landingStyles.innerLandingAnimeHubContainer} ${styles.innerLandingAnimeHubContainer}`}>

            <div className={styles.landingAnimeHubLeftContainer}>
                <div className={styles.topRowAnimeHubImageContainer}>
                    <div className={`${styles.topLeftImageContainer}`}>
                        <Image
                            src={topLeftAnimeHub}
                            alt="Top Left Anime Hub"
                        />
                    </div>

                    <div className={`${styles.topRightImageContainer}`}>
                        <Image
                            src={topRightAnimeHub}
                            alt="Top Right Anime Hub"
                        />
                    </div>
                </div>

                <div className={styles.bottomRowAnimeHubImageContainer}>
                    <div className={`${styles.bottomLeftImageContainer}`}>
                        <Image
                            src={bottomLeftAnimeHub}
                            alt="Bottom Left Anime Hub"
                        />
                    </div>

                    <div className={`${styles.bottomRightImageContainer}`}>
                        <Image
                            src={bottomRightAnimeHub}
                            alt="bottom Right Anime Hub"
                        />
                    </div>
                </div>
            </div>

            <div
                ref={refText}
                className={`${styles.landingAnimeHubRightContainer} ${observerStyle.landingAnimeHubRightContainer} ${isTextVisible ? observerStyle.fadeInDissolve : ''}`}
            >
                <div className={`${landingStyles.headingContainer} ${styles.headingContainer}`}>
                    <h4 className={`${landingStyles.subHeadingText} ${styles.subHeadingText}`}>
                        Anime Hub
                    </h4>
                    <h1 className={`${landingStyles.headingText} ${styles.headingText}`}>
                        Immerse Yourself in the World of Anime
                    </h1>
                </div>

                <div className={`${landingStyles.descriptionContainer} ${styles.descriptionContainer}`}>
                    <p className={`${landingStyles.descriptionParagraph} ${styles.descriptionParagraph}`}>
                    V-ENT isn&#39;t just about gaming. Explore anime features like manga uploads, collaborative viewing, and even official anime character battles. Engage with other fans, upload your own work, or vote on fan-favorite AMVs—there&#39;s something for every anime lover.
                    </p>

                    <button
                        className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN}`}
                        onClick={scrollToForm}
                    >
                        Join the waitlist</button>
                </div>

            </div>

        </div>
    </div>

  )
}

export default LandingAnimeHub