import { ImStatsDots } from "react-icons/im"
import profileStyles from "@/styles/profile/profile-page.module.css"

const UserProfileStats = () => {
  return (
    <div className={`${profileStyles.statsContainer} ${profileStyles.middleLayerColor}`}>
        
        <h4 className={profileStyles.profileH4Header}>
            <ImStatsDots className={profileStyles.profileH4Icons} />Stats
        </h4>
        
        <div className={profileStyles.statsDetailsContainer}>
            
            <div className={`${profileStyles.globalRanking} ${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <div className={profileStyles.rankingViewTable}>
                    <h5 className={profileStyles.profileH5Header}>Ranking</h5>
                    <p className={profileStyles.viewTable}>View Table</p>
                </div>
                <p className={profileStyles.profileDetailValue}>#0</p>
            </div>

            <div className={`${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <h5 className={profileStyles.profileH5Header}>Tournament played</h5>
                <p className={profileStyles.profileDetailValue}>0</p>
            </div>

            <div className={`${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <h5 className={profileStyles.profileH5Header}>Wins</h5>
                <p className={profileStyles.profileDetailValue}>0</p>
            </div>

            <div className={`${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <h5 className={profileStyles.profileH5Header}>Losses</h5>
                <p className={profileStyles.profileDetailValue}>0</p>
            </div>

        </div>

    </div>
  )
}

export default UserProfileStats