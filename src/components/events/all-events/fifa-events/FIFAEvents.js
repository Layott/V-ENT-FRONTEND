import { useState } from 'react';
import Image from 'next/image'
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { LuArrowRight } from "react-icons/lu";
import { LuArrowLeft } from "react-icons/lu";
import { fifaEventsList } from './fifaEventsList'
import menuContentStyles from '@/styles/menu/menu-content.module.css'
import newTournamentStyles from './../../../tournaments/new-tournaments/new-tournaments.module.css'
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
                            
                <div className={menuContentStyles.descriptionContainer}>
                    <div className={menuContentStyles.descriptionNameLocationContainer}>
                        <p><span className={menuContentStyles.descriptionNameSpan}>{fifaEvent.name}</span></p>
                    </div>

                    <div className={menuContentStyles.detailsContainer}>
                        <div className={menuContentStyles.eventOrParticipantTypeContainer}>
                            <p className={menuContentStyles.eventTypeParagraph}>
                                <span className={menuContentStyles.eventTypeSpan}>{fifaEvent.eventType}</span>
                            </p>
                        </div>
            
                        <p className={menuContentStyles.dateParagraph}>
                            <span className={menuContentStyles.calendarIconSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                            <span className={menuContentStyles.dateSpan}>{fifaEvent.date}</span>
                        </p>
                            
                        <p className={menuContentStyles.feeParagraph}>
                            <span className={menuContentStyles.feeIconSpan}><PiMoneyWavy className={menuContentStyles.feeIcon} /></span>
                            <span className={menuContentStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> {fifaEvent.fee}</span>
                        </p>

                    </div>
                
                    <div className={`${newTournamentStyles.buttonContainer} ${allEventsStyles.buttonContainer}`}>
                        <Link href={'/events/view-event'} className={newTournamentStyles.viewDetailsBTN}>View Details</Link>
                        <Link href={'/events/event-register'} className={newTournamentStyles.registerBTN}>Register</Link>
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