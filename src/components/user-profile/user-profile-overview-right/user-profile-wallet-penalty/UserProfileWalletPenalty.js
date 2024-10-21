import { RiCopperCoinLine } from 'react-icons/ri'
import { IoIosInformationCircleOutline } from 'react-icons/io'
import { FiFlag } from 'react-icons/fi'
import profileStyles from "@/styles/profile/profile-page.module.css"

const UserProfileWalletPenalty = () => {
  return (
    <div className={profileStyles.walletPenaltyContainer}>
        
        <div className={`${profileStyles.walletContainer} ${profileStyles.middleLayerColor}`}>
            <h4 className={profileStyles.profileH4Header}>Wallet Balance</h4>
            <p className={profileStyles.coinNumber}>
                <span className={profileStyles.coinSpan}><RiCopperCoinLine className={profileStyles.coinIcon} /></span>
                <span className={profileStyles.coinNumberSpan}>526</span>
            </p>

        </div>
        
        <div className={`${profileStyles.penaltyContainer} ${profileStyles.middleLayerColor}`}>
            <h4 className={profileStyles.profileH4Header}>Penalty Points
                <span className={profileStyles.infoIconSpan}>
                <IoIosInformationCircleOutline className={profileStyles.infoIcon} />
                </span>
            </h4>
            <p className={profileStyles.penaltyPointNumber}>
                <span className={profileStyles.flagSpan}><FiFlag /></span>
                <span className={profileStyles.penaltyPointNumberSpan}>15</span>
            </p>
        </div>
    </div>

  )
}

export default UserProfileWalletPenalty