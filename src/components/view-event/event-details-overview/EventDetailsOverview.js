import EventDetailsOverviewLeft from './event-details-overview-left/EventDetailsOverviewLeft'
import EventDetailsOverviewRight from './event-details-overview-right/EventDetailsOverviewRight'
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'

const EventDetailsOverview = ({ event }) => {
  // Debug logging to see what data is being passed
  console.log('EventDetailsOverview received event:', event);
  console.log('Event keys:', event ? Object.keys(event) : 'Event is null/undefined');
  
  // Check specific fields that the overview components are using
  console.log('Event details for overview:');
  console.log('- name:', event?.name);
  console.log('- description:', event?.description);
  console.log('- event_type:', event?.event_type);
  console.log('- entry_fee:', event?.entry_fee);
  console.log('- game:', event?.game);
  console.log('- event_date:', event?.event_date);
  console.log('- end_date:', event?.end_date);
  console.log('- start_time:', event?.start_time);
  console.log('- end_time:', event?.end_time);
  console.log('- location:', event?.location);
  console.log('- address:', event?.address);
  console.log('- event_link:', event?.event_link);
  console.log('- whatsapp_link:', event?.whatsapp_link);
  console.log('- organizer:', event?.organizer);
  console.log('- organizer_name:', event?.organizer_name);
  console.log('- created_at:', event?.created_at);
  console.log('- updated_at:', event?.updated_at);
  console.log('- social_links:', event?.social_links);

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

  console.log('Social links being passed:', socialLinks);

  // If event is null or undefined, show a loading or error state
  if (!event) {
    return (
      <div className={overviewLtStyles.tournamentDetailsOverviewContainer}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h3>Loading event overview...</h3>
          <p>Event data is not available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={overviewLtStyles.tournamentDetailsOverviewContainer}>
      <EventDetailsOverviewLeft event={event} />
      <EventDetailsOverviewRight event={event} socialLinks={socialLinks} />
    </div>
  )
}

export default EventDetailsOverview