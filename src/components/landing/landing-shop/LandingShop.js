import Image from 'next/image'
import Link from 'next/link'
import useIntersectionObserver from '@/hooks/useIntersectionObserver'
import circledShirt from '@/images/circled_shirt.png';
import observerStyle from '@/styles/intersection/intersection.module.css'
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './landing-shop.module.css'


const LandingShop = ({ scrollToForm }) => {
    const [ref, isVisible] = useIntersectionObserver({ threshold: 0.01 })
    const [refText, isTextVisible] = useIntersectionObserver({ threshold: 0.2 })

  return (
    <div className={`${landingStyles.landingShopContainer} ${styles.landingShopContainer}`}>
        <div className={`${landingStyles.innerLandingShopContainer} ${styles.innerLandingShopContainer}`}>
            <div
                ref={refText}
                className={`${styles.landingShopLeftContainer} ${observerStyle.landingShopLeftContainer} ${isTextVisible ? observerStyle.fadeInDissolve : ''}`}
            >
                <div className={`${landingStyles.headingContainer} ${styles.headingContainer}`}>
                    <h4 className={`${landingStyles.subHeadingText} ${styles.subHeadingText}`}>
                        V-ENT Shop
                    </h4>
                    <h1 className={`${landingStyles.headingText} ${styles.headingText}`}>
                        Shop Exclusive Gaming and Anime Merch
                    </h1>
                </div>

                <div className={`${landingStyles.descriptionContainer} ${styles.descriptionContainer}`}>
                    <p className={`${landingStyles.descriptionParagraph} ${styles.descriptionParagraph}`}>
                        Find everything from gaming equipment to anime merchandise in our V-ENT shop. Enjoy exclusive deals, digital items, and fast shipping so you never miss out on the latest gear.
                    </p>

                    <Link
                        href={'/login'}
                        className={`${profileStyles.waitlistBTN} ${profileStyles.loginBTN}`}
                        >
                        Login
                    </Link>
                </div>

            </div>

            <div className={styles.landingShopRightContainer}>
                <div
                    ref={ref}
                    className={`${styles.circledShirtImageContainer} ${observerStyle.circledShirtImageContainer} ${isVisible ? observerStyle.fadeInFromRight : ''}`}
                >
                    <Image
                        src={circledShirt}
                        alt="Circled Shirt"
                    />
                </div>
            </div>

        </div>
    </div>
  )
}

export default LandingShop