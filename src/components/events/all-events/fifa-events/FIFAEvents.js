import { useState } from 'react';
import Image from 'next/image'
import Link from 'next/link';
import { AiOutlineTeam } from "react-icons/ai";
import { LuGamepad2 } from "react-icons/lu";
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { LuArrowRight } from "react-icons/lu";
import { LuArrowLeft } from "react-icons/lu";
import { fifaEventsList } from './fifaEventsList'
import upcomingEventsStyles from './../../upcoming-events/upcoming-events.module.css'
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

            {fifaEventsList.slice(0, showAll ? fifaEventsList.length : 3).map((fifaTournament, index) => (
            <div key={index} className={allEventsStyles.cardContainer}>
                <div className={allEventsStyles.imageContainer}>
                    <Image
                        src={fifaTournament.image.src}
                        alt={fifaTournament.image.alt}
                    />
                </div>
                            
                <div className={`${upcomingEventsStyles.descriptionContainer} ${allEventsStyles.descriptionContainer}`}>
                    <div className={upcomingEventsStyles.descriptionNameLocation}>
                        <p><span className={upcomingEventsStyles.descriptionName}>{fifaTournament.details.name}</span> - <span className={upcomingEventsStyles.descriptionLocation}>{fifaTournament.details.location}</span></p>
                    </div>
            
                    <div className={upcomingEventsStyles.teamsIndividualsContainer}>
                        <p className={upcomingEventsStyles.teamsIndividualsParagraph}>
                            <span className={upcomingEventsStyles.teamsIndividualsIconSpan}><AiOutlineTeam className={upcomingEventsStyles.teamsIcon} /></span>
                            <span className={upcomingEventsStyles.teamsIndividualsSpan}>{fifaTournament.details.teamType}</span>
                        </p>
                        <span className={upcomingEventsStyles.playerNumber}># {fifaTournament.details.players}</span>
                    </div>
            
                    <div className={`${upcomingEventsStyles.nameDateContainer} ${allEventsStyles.nameDateContainer}`}>
                        <p className={`${upcomingEventsStyles.nameParagraph}`}>
                            <span className={upcomingEventsStyles.padIconSpan}><LuGamepad2 className={upcomingEventsStyles.padIcon} /></span>
                            <span className={upcomingEventsStyles.nameSpan}>{fifaTournament.details.game}</span>
                        </p>
                        <p className={`${upcomingEventsStyles.dateParagraph}`}>
                            <span className={upcomingEventsStyles.calendarIconSpan}><FiCalendar className={upcomingEventsStyles.calendarIcon} /></span>
                            <span className={upcomingEventsStyles.dateSpan}>{fifaTournament.details.date}</span>
                        </p>
                    </div>
                                        
                    <div className={`${upcomingEventsStyles.prizeFeeContainer} ${allEventsStyles.prizeFeeContainer}`}>
                        <p className={`${upcomingEventsStyles.prizeParagraph}`}>
                            <span className={upcomingEventsStyles.prizeIconSpan}><GrTrophy className={upcomingEventsStyles.prizeIcon} /></span>
                            <span className={upcomingEventsStyles.prizeSpan}>Prize: {fifaTournament.details.prize}</span>
                        </p>
                        <p className={`${upcomingEventsStyles.feeParagraph}`}>
                            <span className={upcomingEventsStyles.feeIconSpan}><PiMoneyWavy className={upcomingEventsStyles.feeIcon} /></span>
                            <span className={upcomingEventsStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={upcomingEventsStyles.coinIcon} /></span> {fifaTournament.details.fee}</span>
                        </p>
                    </div>
                
                    <div className={`${upcomingEventsStyles.buttonContainer} ${allEventsStyles.buttonContainer}`}>
                        <Link href={'/tournament-details'} className={upcomingEventsStyles.viewDetailsBTN}>View Details</Link>
                        <Link href={'/tournament-register'} className={upcomingEventsStyles.registerBTN}>Register</Link>
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