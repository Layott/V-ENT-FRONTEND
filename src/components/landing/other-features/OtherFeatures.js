import { TbUsers } from "react-icons/tb";
import { LiaWalletSolid } from "react-icons/lia";
// import { IoWalletOutline  } from "react-icons/io5";
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './other-features.module.css'

const OtherFeatures = () => {
  return (
    <div className={`${landingStyles.otherFeaturesContainer} ${styles.otherFeaturesContainer}`}>
        <div className={`${landingStyles.innerOtherFeaturesContainer} ${styles.innerOtherFeaturesContainer}`}>
            <div className={styles.headingTextContainer}>
                <h1>Other Features</h1>
            </div>

            <div className={styles.cardsContainer}>
                <div className={styles.cardContainer}>
                    <div className={styles.iconContainer}>
                        <LiaWalletSolid className={styles.walletIcon} />
                        {/* <IoWalletOutline className={styles.walletIcon} /> */}
                    </div>

                    <h2>Wallet System</h2>

                    <div className={styles.paragraphContainer}>
                        <p>
                            Secure, multi-functional wallets for teams, users, and organizations.
                        </p>
                    </div>

                </div>

                <div className={styles.cardContainer}>
                    <div className={styles.iconContainer}>
                        {/* <LiaWalletSolid className={styles.walletIcon} /> */}
                        <TbUsers className={styles.walletIcon} />
                    </div>

                    <h2>Wallet System</h2>

                    <div className={styles.paragraphContainer}>
                        <p>
                            Secure, multi-functional wallets for teams, users, and organizations.
                        </p>
                    </div>

                </div>
                
                <div className={styles.cardContainer}>
                    <div className={styles.iconContainer}>
                        <LiaWalletSolid className={styles.walletIcon} />
                        {/* <IoWalletOutline className={styles.walletIcon} /> */}
                    </div>

                    <h2>Wallet System</h2>

                    <div className={styles.paragraphContainer}>
                        <p>
                            Secure, multi-functional wallets for teams, users, and organizations.
                        </p>
                    </div>

                </div>

            </div>
        </div>
    </div>
  )
}

export default OtherFeatures