import EventsFeatured from './events-featured/EventsFeatured'
import UpcomingEvents from './upcoming-events/UpcomingEvents'
import AllEvents from './all-events/AllEvents'
import styles from './events.module.css'

const EventsComponent = () => {
  return (
    <div className={styles.eventsComponentContainer}>
      <EventsFeatured />
      <UpcomingEvents />
      <AllEvents />
    </div>
  )
}

export default EventsComponent