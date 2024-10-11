import { useState } from 'react';
import Image from 'next/image'
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { LuArrowRight } from "react-icons/lu";
import { LuArrowLeft } from "react-icons/lu";
import { pubgEventsList } from './pubgEventsList'
import upcomingEventsStyles from './../../upcoming-events/upcoming-events.module.css'
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
                            
                <div className={`${upcomingEventsStyles.descriptionContainer} ${allEventsStyles.descriptionContainer}`}>
                    <div className={upcomingEventsStyles.descriptionName}>
                        <p><span className={upcomingEventsStyles.descriptionName}>{pubgEvent.name}</span></p>
                    </div>

                    <div className={upcomingEventsStyles.detailsContainer}>
                        <div className={upcomingEventsStyles.eventTypeAndLocationContainer}>
                            <p className={upcomingEventsStyles.eventTypeParagraph}>
                                <span className={upcomingEventsStyles.eventTypeSpan}>{pubgEvent.eventType}</span>
                            </p>
                        </div>
            
                        <p className={upcomingEventsStyles.dateParagraph}>
                            <span className={upcomingEventsStyles.calendarIconSpan}><FiCalendar className={upcomingEventsStyles.calendarIcon} /></span>
                            <span className={upcomingEventsStyles.dateSpan}>{pubgEvent.date}</span>
                        </p>
                            
                        <p className={upcomingEventsStyles.feeParagraph}>
                            <span className={upcomingEventsStyles.feeIconSpan}><PiMoneyWavy className={upcomingEventsStyles.feeIcon} /></span>
                            <span className={upcomingEventsStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={upcomingEventsStyles.coinIcon} /></span> {pubgEvent.fee}</span>
                        </p>

                    </div>
                
                    <div className={`${upcomingEventsStyles.buttonContainer} ${allEventsStyles.buttonContainer}`}>
                        <Link href={'/event-details'} className={upcomingEventsStyles.viewDetailsBTN}>View Details</Link>
                        <Link href={'/event-register'} className={upcomingEventsStyles.registerBTN}>Register</Link>
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