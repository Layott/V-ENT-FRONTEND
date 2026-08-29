import EventDetailsOverviewLeft from './event-details-overview-left/EventDetailsOverviewLeft'
import EventDetailsOverviewRight from './event-details-overview-right/EventDetailsOverviewRight'
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'

// The social links are whatever the organiser saved, and nothing when they saved
// nothing.
//
// This used to fall back to a list of seven invented accounts -
// facebook.com/username, x.com/username and so on - so an event with no socials
// rendered a full row of links that went nowhere. Placeholder content shipped
// as if it were real is the thing a reader spots first, and clicking one of
// those and landing on a 404 is worse than seeing no row at all.
const EventDetailsOverview = ({ event }) => {
  if (!event) {
    return (
      <div className={overviewLtStyles.tournamentDetailsOverviewContainer}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h3>Loading event overview...</h3>
        </div>
      </div>
    );
  }

  const socialLinks = event.social_links || [];

  return (
    <div className={overviewLtStyles.tournamentDetailsOverviewContainer}>
      <EventDetailsOverviewLeft event={event} />
      <EventDetailsOverviewRight event={event} socialLinks={socialLinks} />
    </div>
  )
}

export default EventDetailsOverview
