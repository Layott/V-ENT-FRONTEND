import { ImStatsDots } from "react-icons/im"
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './user-profile-stats.module.css'

const UserProfileStats = () => {
  return (
    <div className={`${styles.statsContainer} ${profileStyles.middleLayerColor}`}>
        
        <h4 className={styles.statsHeader}>
            <ImStatsDots className={styles.statsIcon} />Stats
        </h4>
        
        <div className={styles.statsDetailsContainer}>
            
            <div className={`${styles.globalRanking} ${styles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <div className={styles.rankingViewTable}>
                    <h4 className={styles.statsDetailHeader}>Ranking</h4>
                    <p className={styles.viewTable}>View Table</p>
                </div>
                <p className={styles.statsDetailValue}>#1123</p>
            </div>

            <div className={`${styles.tournamentPlayed} ${styles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <h4 className={styles.statsDetailHeader}>Tournament played</h4>
                <p className={styles.statsDetailValue}>24</p>
            </div>

            <div className={`${styles.wins} ${styles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <h4 className={styles.statsDetailHeader}>Wins</h4>
                <p className={styles.statsDetailValue}>22</p>
            </div>

            <div className={`${styles.losses} ${styles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <h4 className={styles.statsDetailHeader}>Losses</h4>
                <p className={styles.statsDetailValue}>4</p>
            </div>

        </div>

    </div>
  )
}

export default UserProfileStats