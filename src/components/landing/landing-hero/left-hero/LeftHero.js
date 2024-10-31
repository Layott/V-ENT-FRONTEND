import profileStyles from '@/styles/profile/profile-page.module.css'
import styles from './left-hero.module.css'


const LeftHero = () => {
  return (
    <div className={styles.leftHeroContainer}>
        <div className={styles.leftHeroInnerContainer}>
            <div className={styles.h1Container}>
                <h1 className={styles.gaming}>Gaming</h1>
                <h1 className={styles.anime}>Anime</h1>
                <h1 className={styles.tribe}>Tribe</h1>
            </div>

            <div className={styles.belowH1Container}>
                <div>
                    <p className={styles.landingPageParagraph}>
                        Welcome to V-ENT, the ultimate platform where gaming, anime and community converge. Whether you&#39;re a competitive esports player, a casual gamer, or an anime enthusiast, V-ENT offers tournaments, a vibrant marketplace and unique features to help you immerse yourself in what you love most. Connect, compete and engage in a community built for fans by fans. 
                    </p>
                </div>
                <div className={styles.joinWaitListContainer}>
                    <input
                        type='text'
                        placeholder='Enter your email address'
                        className={styles.enterEmailInput}
                    />
                    <button type='submit' className={`${profileStyles.waitlistBTN} ${styles.waitlistBTN}`}>Join the waitlist</button>
                </div>
            </div>

        </div>
    </div>
  )
}

export default LeftHero