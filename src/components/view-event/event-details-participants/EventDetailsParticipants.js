import { IoMdInformationCircleOutline } from "react-icons/io";
import tableStyles from "@/styles/modules/tables/tables.module.css"
import styles from './event-details-participants.module.css'

/**
 * Event attendee list.
 *
 * This tab used to render a hardcoded list of twenty people, which looked like
 * real registrations. Events have no attendee model on the backend yet - only
 * ticket tiers - so until event registration ships (Phase 2) the tab says so
 * rather than inventing attendees.
 */
const EventDetailsParticipants = () => (
  <div className={tableStyles.tournamentDetailsParticipantsContainer}>
    <div className={tableStyles.informationArea}>
      <p><IoMdInformationCircleOutline /></p>
      <p>Attendee lists arrive with event ticketing in Phase 2.</p>
    </div>

    <div className={styles.emptyStateBox}>
      <p className={styles.emptyStateTitle}>No attendees to show yet</p>
      <p className={styles.emptyStateBody}>
        Once ticketing is live, everyone who registers for this event will appear here with
        their ticket tier and check-in status.
      </p>
    </div>
  </div>
);

export default EventDetailsParticipants
