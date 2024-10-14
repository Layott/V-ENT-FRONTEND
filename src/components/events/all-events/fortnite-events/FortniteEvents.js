import { useState } from 'react';
import Image from 'next/image'
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { LuArrowRight } from "react-icons/lu";
import { LuArrowLeft } from "react-icons/lu";
import { fortniteEventsList } from './fortniteEventsList'
import menuContentStyles from '@/styles/menu/menu-content.module.css'
import newTournamentStyles from './../../../tournaments/new-tournaments/new-tournaments.module.css'
import allEventsStyles from './../all-events.module.css'

const FortniteEvents = () => {
    const [showAll, setShowAll] = useState(false)

    const handleToggle = () => {
        setShowAll(!showAll)
    }

  return (
    <div className={allEventsStyles.fifaTournamentsContainer}>
        <div className={allEventsStyles.header}>
            <h3>Fortnite Events</h3>
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

            {fortniteEventsList.slice(0, showAll ? fortniteEventsList.length : 3).map((fortniteEvent, index) => (
            <div key={index} className={allEventsStyles.cardContainer}>
                <div className={allEventsStyles.imageContainer}>
                    <Image
                        src={fortniteEvent.src}
                        alt={fortniteEvent.alt}
                    />
                </div>
                            
                <div className={menuContentStyles.descriptionContainer}>
                    <div className={menuContentStyles.descriptionNameLocationContainer}>
                        <p><span className={menuContentStyles.descriptionNameSpan}>{fortniteEvent.name}</span></p>
                    </div>

                    <div className={menuContentStyles.detailsContainer}>
                        <div className={menuContentStyles.eventOrParticipantTypeContainer}>
                            <p className={menuContentStyles.eventTypeParagraph}>
                                <span className={menuContentStyles.eventTypeSpan}>{fortniteEvent.eventType}</span>
                            </p>
                        </div>
            
                        <p className={menuContentStyles.dateParagraph}>
                            <span className={menuContentStyles.calendarIconSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                            <span className={menuContentStyles.dateSpan}>{fortniteEvent.date}</span>
                        </p>
                            
                        <p className={menuContentStyles.feeParagraph}>
                            <span className={menuContentStyles.feeIconSpan}><PiMoneyWavy className={menuContentStyles.feeIcon} /></span>
                            <span className={menuContentStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> {fortniteEvent.fee}</span>
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

export default FortniteEvents