import Image from 'next/image'
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { GoDotFill } from "react-icons/go";
import { upcomingEventsList } from './upcomingEventsList'
import newTournamentStyles from './../../tournaments/new-tournaments/new-tournaments.module.css'
import styles from './upcoming-events.module.css'

const UpcomingEvents = () => {
  return (
    <div className={newTournamentStyles.newTournamentsContainer}>
        <h3>Upcoming Events</h3>
        
        <div className={newTournamentStyles.cardsContainer}>
            
            {upcomingEventsList.map((event, index) => (
                <div key={index} className={newTournamentStyles.cardContainer}>
                    <div className={newTournamentStyles.imageContainer}>
                        <Image
                            src={event.image}
                            alt={event.alt}
                        />
                    </div>
            
                    <div className={styles.descriptionContainer}>
                        <div className={styles.descriptionName}>
                            <p><span className={styles.descriptionName}>{event.name}</span></p>
                        </div>
            
                        <div className={styles.detailsContainer}>
                            <div className={styles.eventTypeAndLocationContainer}>
                                <p className={styles.eventTypeParagraph}>
                                    <span className={styles.eventTypeSpan}>{event.eventType}</span>
                                </p>
                                <span className={styles.dotSpan}>
                                    <GoDotFill className={styles.dotIcon} />
                                </span>
                                <span className={styles.locationSpan}> {event.location}</span>
                            </div>
                
                            <p className={styles.dateParagraph}>
                                <span className={styles.calendarIconSpan}><FiCalendar className={styles.calendarIcon} /></span>
                                <span className={styles.dateSpan}>{event.date}</span>
                            </p>
                                
                            <p className={styles.feeParagraph}>
                                <span className={styles.feeIconSpan}><PiMoneyWavy className={styles.feeIcon} /></span>
                                <span className={styles.feeSpan}>Fee: <span><RiCopperCoinFill className={styles.coinIcon} /></span> {event.fee}</span>
                            </p>

                        </div>
                        
                        <div className={newTournamentStyles.buttonContainer}>
                            <Link href={'/tournament-details'} className={newTournamentStyles.viewDetailsBTN}>View Details</Link>
                            <Link href={'/tournament-register'} className={newTournamentStyles.registerBTN}>Register</Link>
                        </div>
                    </div>
            
                </div>
            
            ))}

        </div>

    </div>
  )
}

export default UpcomingEvents