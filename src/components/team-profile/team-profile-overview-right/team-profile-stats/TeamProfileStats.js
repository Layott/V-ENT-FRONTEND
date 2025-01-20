import { ImStatsDots } from "react-icons/im"
import profileStyles from "@/styles/profile/profile-page.module.css"

const TeamProfileStats = () => {
  return (
    <div className={`${profileStyles.statsContainer} ${profileStyles.middleLayerColor}`}>
        
        <h4 className={profileStyles.profileH4Header}>
            <ImStatsDots className={profileStyles.profileH4Icons} />Stats
        </h4>
        
        <div className={profileStyles.statsDetailsContainer}>
            
            <div className={`${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <div className={profileStyles.rankingViewTable}>
                    <h5 className={profileStyles.profileH5Header}>Ranking</h5>
                    <button className={profileStyles.viewBTN}>View</button>
                </div>
                <p className={profileStyles.statsDetailValue}>#1123</p>
            </div>

            <div className={`${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <h5 className={profileStyles.profileH5Header}>Tournaments</h5>
                <p className={profileStyles.statsDetailValue}>24</p>
            </div>

            <div className={`${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <h5 className={profileStyles.profileH5Header}>Wins</h5>
                <p className={profileStyles.statsDetailValue}>22</p>
            </div>

            <div className={`${profileStyles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <h5 className={profileStyles.profileH5Header}>Losses</h5>
                <p className={profileStyles.statsDetailValue}>4</p>
            </div>

        </div>

    </div>
  )
}

export default TeamProfileStats