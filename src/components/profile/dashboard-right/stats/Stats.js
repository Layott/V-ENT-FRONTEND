import { ImStatsDots } from "react-icons/im"
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './stats.module.css'

const Stats = () => {
  return (
    <div className={`${styles.statsContainer} ${profileStyles.middleLayerColor}`}>
        
        <h4 className={styles.statsHeader}>
            <ImStatsDots className={styles.statsIcon} />Stats
        </h4>
        
        <div className={styles.statsDetailsContainer}>

            <div className={`${styles.tournamentPlayed} ${styles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <p className={styles.statsDetailHeader}>Tournament played</p>
                <p className={styles.statsDetailValue}>24</p>
            </div>

            <div className={`${styles.wins} ${styles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <p className={styles.statsDetailHeader}>Wins</p>
                <p className={styles.statsDetailValue}>22</p>
            </div>

            <div className={`${styles.losses} ${styles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <p className={styles.statsDetailHeader}>Losses</p>
                <p className={styles.statsDetailValue}>4</p>
            </div>

            <div className={`${styles.globalRanking} ${styles.statsDetails} ${profileStyles.topMostLayerColor}`}>
                <p className={styles.statsDetailHeader}>Global Ranking</p>
                <p className={styles.statsDetailValue}>1123</p>
            </div>
        
        </div>

    </div>
  )
}

export default Stats