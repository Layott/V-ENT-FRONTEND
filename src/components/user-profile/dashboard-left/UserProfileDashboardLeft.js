import Link from 'next/link'
import { FaFacebook, FaInstagram, FaYoutube  } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { SiEslgaming, SiPcgamingwiki, SiYoutubegaming  } from "react-icons/si";
import styles from './dashboard-left.module.css'

const UserProfileDashboardLeft = () => {
  return (
    <div className={`${styles.profileDashboardLeft} ${styles.middleLayerColor}`}>
        <div className={`${styles.interestsContainer} ${styles.sectionContainer}`}>
            <h4 className={styles.sectionHeader}>Interests</h4>
            <div className={`${styles.interestsListContainer} ${styles.contentListContainer}`}>
                <span className={`${styles.interest} ${styles.topMostLayerColor}`}>Anime</span>
                <span className={`${styles.interest} ${styles.topMostLayerColor}`}>Uncharted</span>
                <span className={`${styles.interest} ${styles.topMostLayerColor}`}>FIFA</span>
                <span className={`${styles.interest} ${styles.topMostLayerColor}`}>Elden Ring</span>
                <span className={`${styles.interest} ${styles.topMostLayerColor}`}>Mortal Kombat</span>
                <span className={`${styles.interest} ${styles.topMostLayerColor}`}>God of War</span>
                <span className={`${styles.interest} ${styles.topMostLayerColor}`}>Manga</span>
                <span className={`${styles.interest} ${styles.topMostLayerColor}`}>Black Myth Wukong</span>
                <span className={`${styles.interest} ${styles.topMostLayerColor}`}>Battle Royale</span>
            </div>
        </div>

        <hr className={styles.sectionHr} />

        <div className={`${styles.gamingAccountsContainer} ${styles.sectionContainer}`}>
            <h4 className={styles.sectionHeader}>Gaming Accounts</h4>
            <div className={`${styles.gamingAccountsListContainer} ${styles.contentListContainer}`}>
                <p className={styles.gamingAccount}>
                    <span className={styles.gameIconSpan}>
                        <SiEslgaming className={styles.gameIcon} />
                    </span>
                    <span>@frostbite</span>
                </p>
                <p className={styles.gamingAccount}>
                    <span className={styles.gameIconSpan}>
                        <SiPcgamingwiki className={styles.gameIcon} />
                    </span>
                    <span>@frostbite</span>
                </p>
                <p className={styles.gamingAccount}>
                    <span className={styles.gameIconSpan}>
                        <SiYoutubegaming className={styles.gameIcon} />
                    </span>
                    <span>@frostbite</span>
                </p>
            </div>
        </div>

        <hr className={styles.sectionHr} />

        <div className={`${styles.socialLinksContainer} ${styles.sectionContainer}`}>
            <h4 className={styles.sectionHeader}>Social Links</h4>
            <div className={`${styles.socialLinksListContainer} ${styles.contentListContainer}`}>
                <Link href={'./'} className={`${styles.socialLink} ${styles.topMostLayerColor}`}>
                    <FaFacebook className={styles.socialIcon} /> Facebook
                </Link>
                <Link href={'./'} className={`${styles.socialLink} ${styles.topMostLayerColor}`}>
                    <FaInstagram className={styles.socialIcon} /> Instagram
                </Link>
                <Link href={'./'} className={`${styles.socialLink} ${styles.topMostLayerColor}`}>
                    <FaXTwitter className={styles.socialIcon} /> X (Twitter)
                </Link>
                <Link href={'./'} className={`${styles.socialLink} ${styles.topMostLayerColor}`}>
                    <FaYoutube  className={styles.socialIcon} /> YouTube
                </Link>
            </div>
        </div>

  </div>
  )
}

export default UserProfileDashboardLeft