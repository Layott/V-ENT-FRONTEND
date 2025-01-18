import TournamentDetailsOverviewLeft from './tournament-details-overview-left/TournamentDetailsOverviewLeft'
import TournamentDetailsOverviewRight from './tournament-details-overview-right/TournamentDetailsOverviewRight'
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'

const TournamentDetailsOverview = () => {
  return (
    <div className={overviewLtStyles.tournamentDetailsOverviewContainer}>
      <TournamentDetailsOverviewLeft />
      <TournamentDetailsOverviewRight />
    </div>
  )
}

export default TournamentDetailsOverview