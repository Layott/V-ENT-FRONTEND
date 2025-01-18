import { useState } from 'react';
import Image from 'next/image'
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { LuArrowRight } from "react-icons/lu";
import { LuArrowLeft } from "react-icons/lu";
import { pubgEventsList } from './pubgEventsList'
import menuContentStyles from '@/styles/menu/menu-content.module.css'
import newTournamentStyles from './../../../tournaments/new-tournaments/new-tournaments.module.css'
import allEventsStyles from './../all-events.module.css'

const PUBGEvents = () => {
    const [showAll, setShowAll] = useState(false)

    const handleToggle = () => {
        setShowAll(!showAll)
    }

  return (
    <div className={allEventsStyles.fifaTournamentsContainer}>
        <div className={allEventsStyles.header}>
            <h3>PUBG Events</h3>
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

            {pubgEventsList.slice(0, showAll ? pubgEventsList.length : 3).map((pubgEvent, index) => (
            <div key={index} className={allEventsStyles.cardContainer}>
                <div className={allEventsStyles.imageContainer}>
                    <Image
                        src={pubgEvent.src}
                        alt={pubgEvent.alt}
                    />
                </div>
                            
                <div className={menuContentStyles.descriptionContainer}>
                    <div className={menuContentStyles.descriptionNameLocationContainer}>
                        <p><span className={menuContentStyles.descriptionNameSpan}>{pubgEvent.name}</span></p>
                    </div>

                    <div className={menuContentStyles.detailsContainer}>
                        <div className={newTournamentStyles.eventTypeAndLocationContainer}>
                            <p className={newTournamentStyles.eventTypeParagraph}>
                                <span className={menuContentStyles.eventTypeSpan}>{pubgEvent.eventType}</span>
                            </p>
                        </div>
            
                        <p className={menuContentStyles.dateParagraph}>
                            <span className={menuContentStyles.calendarIconSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                            <span className={menuContentStyles.dateSpan}>{pubgEvent.date}</span>
                        </p>
                            
                        <p className={menuContentStyles.feeParagraph}>
                            <span className={newTournamentStyles.feeIconSpan}><PiMoneyWavy className={menuContentStyles.feeIcon} /></span>
                            <span className={menuContentStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> {pubgEvent.fee}</span>
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

export default PUBGEvents