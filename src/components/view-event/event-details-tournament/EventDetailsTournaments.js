import TournamentDetailsRulesLeft from './event-details-rules-left/EventDetailsTournamentsLeft'
import TournamentDetailsOverviewRight from '../event-details-overview/event-details-overview-right/EventDetailsOverviewRight'
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'

const EventDetailsTournaments = () => {
  return (
    <div className={overviewLtStyles.tournamentDetailsOverviewContainer}>
        <TournamentDetailsRulesLeft />
        <TournamentDetailsOverviewRight />
    </div>
  )
}

export default EventDetailsTournaments