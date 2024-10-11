import { useState } from 'react';
import Image from 'next/image'
import Link from 'next/link';
import { FiCalendar } from "react-icons/fi";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { LuArrowRight } from "react-icons/lu";
import { LuArrowLeft } from "react-icons/lu";
import { minecraftEventsList } from './minecraftEventsList'
import upcomingEventsStyles from './../../upcoming-events/upcoming-events.module.css'
import allEventsStyles from './../all-events.module.css'

const MinecraftEvents = () => {
    const [showAll, setShowAll] = useState(false)

    const handleToggle = () => {
        setShowAll(!showAll)
    }

  return (
    <div className={allEventsStyles.fifaTournamentsContainer}>
        <div className={allEventsStyles.header}>
            <h3>Minecraft Events</h3>
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

            {minecraftEventsList.slice(0, showAll ? minecraftEventsList.length : 3).map((minecraftEvent, index) => (
            <div key={index} className={allEventsStyles.cardContainer}>
                <div className={allEventsStyles.imageContainer}>
                    <Image
                        src={minecraftEvent.src}
                        alt={minecraftEvent.alt}
                    />
                </div>
                            
                <div className={`${upcomingEventsStyles.descriptionContainer} ${allEventsStyles.descriptionContainer}`}>
                    <div className={upcomingEventsStyles.descriptionName}>
                        <p><span className={upcomingEventsStyles.descriptionName}>{minecraftEvent.name}</span></p>
                    </div>

                    <div className={upcomingEventsStyles.detailsContainer}>
                        <div className={upcomingEventsStyles.eventTypeAndLocationContainer}>
                            <p className={upcomingEventsStyles.eventTypeParagraph}>
                                <span className={upcomingEventsStyles.eventTypeSpan}>{minecraftEvent.eventType}</span>
                            </p>
                        </div>
            
                        <p className={upcomingEventsStyles.dateParagraph}>
                            <span className={upcomingEventsStyles.calendarIconSpan}><FiCalendar className={upcomingEventsStyles.calendarIcon} /></span>
                            <span className={upcomingEventsStyles.dateSpan}>{minecraftEvent.date}</span>
                        </p>
                            
                        <p className={upcomingEventsStyles.feeParagraph}>
                            <span className={upcomingEventsStyles.feeIconSpan}><PiMoneyWavy className={upcomingEventsStyles.feeIcon} /></span>
                            <span className={upcomingEventsStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={upcomingEventsStyles.coinIcon} /></span> {minecraftEvent.fee}</span>
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

export default MinecraftEvents