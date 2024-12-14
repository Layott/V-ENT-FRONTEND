import TournamentDetailsRulesLeft from './tournament-details-rules-left/TournamentDetailsRulesLeft'
import TournamentDetailsOverviewRight from '../tournament-details-overview/tournament-details-overview-right/TournamentDetailsOverviewRight'
import styles from './../tournament-details-overview/tournament-details-overview.module.css'

const TournamentDetailsRules = () => {
  return (
    <div className={styles.tournamentDetailsOverviewContainer}>
        <TournamentDetailsRulesLeft />
        <TournamentDetailsOverviewRight />
    </div>
  )
}

export default TournamentDetailsRules