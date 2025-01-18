import TournamentDetailsRulesLeft from './tournament-details-rules-left/TournamentDetailsRulesLeft'
import TournamentDetailsOverviewRight from '../tournament-details-overview/tournament-details-overview-right/TournamentDetailsOverviewRight'
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'

const TournamentDetailsRules = () => {
  return (
    <div className={overviewLtStyles.tournamentDetailsOverviewContainer}>
      <TournamentDetailsRulesLeft />
      <TournamentDetailsOverviewRight />
    </div>
  )
}

export default TournamentDetailsRules