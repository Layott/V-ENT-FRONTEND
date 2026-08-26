'use client';

import { useT } from '@/i18n/LanguageProvider';
import { TbUsers } from "react-icons/tb";
import { LiaWalletSolid } from "react-icons/lia";
import { IoAnalyticsSharp } from "react-icons/io5";
import landingStyles from '@/styles/landing/landing.module.css'
import styles from './other-features.module.css'

const OtherFeatures = () => {
  const tt = useT();

  return (
    <div className={`${landingStyles.otherFeaturesContainer} ${styles.otherFeaturesContainer}`}>
        <div className={`${landingStyles.innerOtherFeaturesContainer} ${styles.innerOtherFeaturesContainer}`}>
            <div className={styles.headingTextContainer}>
                <h2>{tt('landing.otherFeatures', 'Other features')}</h2>
            </div>

            <div className={styles.cardsContainer}>
                <div className={`${styles.cardContainer}`}>
                    <div className={styles.iconContainer}>
                        <LiaWalletSolid className={styles.walletIcon} />
                    </div>

                    <h2>{tt('landing.walletSystem', 'Wallet')}</h2>

                    <div className={styles.paragraphContainer}>
                        <p>
                            {tt("landing.feature.wallet", "Secure, multi-functional wallets for teams, users, and organizations.")}
                        </p>
                    </div>

                </div>

                <div className={`${styles.cardContainer}`}>
                    <div className={styles.iconContainer}>
                        <TbUsers className={styles.communityIcon} />
                    </div>

                    <h2>{tt('landing.community', 'Community')}</h2>

                    <div className={styles.paragraphContainer}>
                        <p>
                            {tt("landing.feature.community", "Join thriving communities based on your favorite games and anime genres.")}
                        </p>
                    </div>

                </div>
                
                <div className={`${styles.cardContainer}`}>
                    <div className={styles.iconContainer}>
                        <IoAnalyticsSharp className={styles.analyticIcon} />
                    </div>

                    <h2>{tt('landing.analytics', 'Analytics')}</h2>

                    <div className={styles.paragraphContainer}>
                        <p>
                            {tt("landing.feature.analytics", "Track team and individual performance metrics in real-time.")}
                        </p>
                    </div>

                </div>

            </div>
        </div>
    </div>
  )
}

export default OtherFeatures