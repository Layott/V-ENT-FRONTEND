import EventDetailsOverviewLeft from './event-details-overview-left/EventDetailsOverviewLeft'
import EventDetailsOverviewRight from './event-details-overview-right/EventDetailsOverviewRight'
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'

const EventDetailsOverview = ({ event }) => {
  // Extract social links from event data or use defaults
  const socialLinks = event?.social_links || [
    { title: "Facebook", url: "https://facebook.com/username" },
    { title: "X", url: "https://x.com/username" },
    { title: "Instagram", url: "https://instagram.com/username" },
    { title: "LinkedIn", url: "https://linkedin.com/username" },
    { title: "YouTube", url: "https://youtube.com/username" },
    { title: "GitHub", url: "https://github.com/username" },
    { title: "Discord", url: "https://discord.com/username" }
  ];

  return (
    <div className={overviewLtStyles.tournamentDetailsOverviewContainer}>
      <EventDetailsOverviewLeft event={event} />
      <EventDetailsOverviewRight event={event} socialLinks={socialLinks} />
    </div>
  )
}

export default EventDetailsOverview