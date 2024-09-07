import { RiCopperCoinLine } from 'react-icons/ri'
import { IoIosInformationCircleOutline } from 'react-icons/io'
import { FiFlag } from 'react-icons/fi'
import profileStyles from "@/styles/user-profile/profile-page.module.css"
import styles from './wallet-penalty.module.css'

const WalletPenalty = () => {
  return (
    <div className={styles.walletPenaltyContainer}>
        
        <div className={`${styles.walletContainer} ${profileStyles.middleLayerColor}`}>
            <h4>Wallet Balance</h4>
            <p className={styles.coinNumber}>
                <span className={styles.coinSpan}><RiCopperCoinLine className={styles.coinIcon} /></span>
                <span className={styles.coinNumberSpan}>526</span>
            </p>

        </div>
        
        <div className={`${styles.penaltyContainer} ${profileStyles.middleLayerColor}`}>
            <h4 className={styles.penaltyHeader}>Penalty Points
                <span className={styles.infoIconSpan}>
                <IoIosInformationCircleOutline className={styles.infoIcon} />
                </span>
            </h4>
            <p className={styles.penaltyPointNumber}>
                <span className={styles.flagSpan}><FiFlag /></span>
                <span className={styles.penaltyPointNumberSpan}>15</span>
            </p>
        </div>
    </div>

  )
}

export default WalletPenalty