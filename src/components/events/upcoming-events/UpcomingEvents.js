import Image from 'next/image'
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { GoDotFill } from "react-icons/go";
import { upcomingEventsList } from './upcomingEventsList'
import newTournamentStyles from './../../tournaments/new-tournaments/new-tournaments.module.css'
import menuContentStyles from '@/styles/menu/menu-content.module.css'
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
                                    <span className={menuContentStyles.eventTypeSpan}>{event.eventType}</span>
                                </p>
                                <span className={menuContentStyles.dotSpan}>
                                    <GoDotFill className={menuContentStyles.dotIcon} />
                                </span>
                                <span className={menuContentStyles.locationSpan}> {event.location}</span>
                            </div>
                
                            <p className={styles.dateParagraph}>
                                <span className={styles.calendarIconSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                                <span className={menuContentStyles.dateSpan}>{event.date}</span>
                            </p>
                                
                            <p className={styles.feeParagraph}>
                                <span className={styles.feeIconSpan}><PiMoneyWavy className={menuContentStyles.feeIcon} /></span>
                                <span className={menuContentStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> {event.fee}</span>
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