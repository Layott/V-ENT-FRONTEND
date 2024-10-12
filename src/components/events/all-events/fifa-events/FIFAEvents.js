import { useState } from 'react';
import Image from 'next/image'
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { LuArrowRight } from "react-icons/lu";
import { LuArrowLeft } from "react-icons/lu";
import { fifaEventsList } from './fifaEventsList'
import newTournamentStyles from './../../../tournaments/new-tournaments/new-tournaments.module.css'
import upcomingEventStyles from './../../upcoming-events/upcoming-events.module.css'
import allEventsStyles from './../all-events.module.css'

const FIFAEvents = () => {
    const [showAll, setShowAll] = useState(false)

    const handleToggle = () => {
        setShowAll(!showAll)
    }

  return (
    <div className={allEventsStyles.fifaTournamentsContainer}>
        <div className={allEventsStyles.header}>
            <h3>FIFA Events</h3>
            {!showAll && (
            <button
                className={allEventsStyles.seeMoreBTN}
                onClick={handleToggle}
            >
                See more<LuArrowRight />
            </button>
            )}
        </div>

        <div className={allEventsStyles.cardsContainer}>

            {fifaEventsList.slice(0, showAll ? fifaEventsList.length : 3).map((fifaEvent, index) => (
            <div key={index} className={allEventsStyles.cardContainer}>
                <div className={allEventsStyles.imageContainer}>
                    <Image
                        src={fifaEvent.src}
                        alt={fifaEvent.alt}
                    />
                </div>
                            
                <div className={`${newTournamentStyles.descriptionContainer} ${allEventsStyles.descriptionContainer}`}>
                    <div className={newTournamentStyles.descriptionName}>
                        <p><span className={newTournamentStyles.descriptionName}>{fifaEvent.name}</span></p>
                    </div>

                    <div className={newTournamentStyles.detailsContainer}>
                        <div className={newTournamentStyles.eventTypeAndLocationContainer}>
                            <p className={newTournamentStyles.eventTypeParagraph}>
                                <span className={upcomingEventStyles.eventTypeSpan}>{fifaEvent.eventType}</span>
                            </p>
                        </div>
            
                        <p className={newTournamentStyles.dateParagraph}>
                            <span className={newTournamentStyles.calendarIconSpan}><FiCalendar className={upcomingEventStyles.calendarIcon} /></span>
                            <span className={upcomingEventStyles.dateSpan}>{fifaEvent.date}</span>
                        </p>
                            
                        <p className={newTournamentStyles.feeParagraph}>
                            <span className={newTournamentStyles.feeIconSpan}><PiMoneyWavy className={upcomingEventStyles.feeIcon} /></span>
                            <span className={upcomingEventStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={newTournamentStyles.coinIcon} /></span> {fifaEvent.fee}</span>
                        </p>

                    </div>
                
                    <div className={`${newTournamentStyles.buttonContainer} ${allEventsStyles.buttonContainer}`}>
                        <Link href={'/event-details'} className={newTournamentStyles.viewDetailsBTN}>View Details</Link>
                        <Link href={'/event-register'} className={newTournamentStyles.registerBTN}>Register</Link>
                    </div>
                </div>
                    
            </div>
            ))}
            {showAll && (
                <button
                    className={`${allEventsStyles.seeMoreBTN} ${allEventsStyles.seeLessBTN}`}
                    onClick={handleToggle}
                >
                    <LuArrowLeft />See less
                </button>
            )}
        </div>

    </div>

  )
}

export default FIFAEvents