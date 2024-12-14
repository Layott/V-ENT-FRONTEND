import TournamentDetailsOverviewLeft from './tournament-details-overview-left/TournamentDetailsOverviewLeft'
import TournamentDetailsOverviewRight from './tournament-details-overview-right/TournamentDetailsOverviewRight'
import styles from './tournament-details-overview.module.css'

const TournamentDetailsOverview = () => {
  return (
    <div className={styles.tournamentDetailsOverviewContainer}>
        <TournamentDetailsOverviewLeft />
        <TournamentDetailsOverviewRight />
    </div>
  )
}

export default TournamentDetailsOverview