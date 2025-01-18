import Image from 'next/image'
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { GoDotFill } from "react-icons/go";
import { upcomingEventsList } from './upcomingEventsList'
import newTournamentStyles from './../../tournaments/new-tournaments/new-tournaments.module.css'
import menuContentStyles from '@/styles/menu/menu-content.module.css'

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
            
                    <div className={menuContentStyles.descriptionContainer}>
                        <div className={menuContentStyles.descriptionNameOrLocation}>
                            <p><span className={menuContentStyles.descriptionNameSpan}>{event.name}</span></p>
                        </div>
            
                        <div className={menuContentStyles.detailsContainer}>
                            <div className={menuContentStyles.eventOrParticipantTypeContainer}>
                                <p className={menuContentStyles.eventTypeParagraph}>
                                    <span className={menuContentStyles.eventTypeSpan}>{event.eventType}</span>
                                </p>
                                <span className={menuContentStyles.dotSpan}>
                                    <GoDotFill className={menuContentStyles.dotIcon} />
                                </span>
                                <span className={menuContentStyles.locationSpan}> {event.location}</span>
                            </div>
                
                            <p className={menuContentStyles.dateParagraph}>
                                <span className={menuContentStyles.calendarIconSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                                <span className={menuContentStyles.dateSpan}>{event.date}</span>
                            </p>
                                
                            <p className={menuContentStyles.feeParagraph}>
                                <span className={menuContentStyles.feeIconSpan}><PiMoneyWavy className={menuContentStyles.feeIcon} /></span>
                                <span className={menuContentStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> {event.fee}</span>
                            </p>

                        </div>
                        
                        <div className={newTournamentStyles.buttonContainer}>
                            <Link href={'/events/view-event'} className={newTournamentStyles.viewDetailsBTN}>View Details</Link>
                            <Link href={'/events/register-event'} className={newTournamentStyles.registerBTN}>Register</Link>
                        </div>
                    </div>
            
                </div>
            
            ))}

        </div>

    </div>
  )
}

export default UpcomingEvents