import Image from 'next/image'
import circledShirt from '@/images/circled_shirt.png';
import profileStyles from '@/styles/profile/profile-page.module.css'
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './landing-shop.module.css'

const LandingShop = () => {
  return (
    <div className={`${landingStyles.landingShopContainer} ${styles.landingShopContainer}`}>
        <div className={`${landingStyles.innerLandingShopContainer} ${styles.innerLandingShopContainer}`}>
            <div className={styles.landingShopLeftContainer}>
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

                    <button className={`${profileStyles.waitlistBTN} ${landingStyles.waitlistBTN}`}>Join the waitlist</button>
                </div>

            </div>

            <div className={styles.landingShopRightContainer}>
                <div className={styles.circledShirtImageContainer}>
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