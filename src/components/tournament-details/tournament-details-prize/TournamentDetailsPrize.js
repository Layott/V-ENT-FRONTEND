import { useState } from 'react'
import TournamentsDetails from './TournamentsDetails'
import { tournamentResults } from './tournamentResults'
import profileStyles from "@/styles/profile/profile-page.module.css"
import styles from './tournament-details-prize.module.css'

const TournamentDetailsPrize = () => {
    const [selectedTournament, setSelectedTournament] = useState(null)

  return (
    <div className={styles.prizeContainer}>
        <div className={profileStyles.tournamentsEventsFilterSearchContainer}>
            <div className={profileStyles.tournamentsEventsFilterContainer}>
                <p className={styles.tournamentNumber}>Price Distribution</p>
            </div>
      </div>

      <div className={`${styles.tournamentsEventsTable}`}>
        <div className={styles.gridHeader}>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Position</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Prize</div>
          <div className={`${styles.gridItem} ${styles.gridItemHeader}`}>Bonuses</div>
        </div>

        {tournamentResults.map((tournamentResult, index) => (
          <div key={index} className={`${styles.gridRow} ${profileStyles.middleLayerColor}`}>
            <div className={styles.gridItem}>{tournamentResult.position}</div>
            <div className={styles.gridItem}>{tournamentResult.prize}</div>
            <div className={styles.gridItem}>{tournamentResult.bonus}</div>
          </div>
        ))}

      </div>

      
      <TournamentsDetails selectedTournament={selectedTournament} setSelectedTournament={setSelectedTournament} />
    </div>
  )
}

export default TournamentDetailsPrize