import { useState } from 'react';
import Image from 'next/image'
import Link from 'next/link'
import { AiOutlineTeam } from "react-icons/ai";
import { LuGamepad2 } from "react-icons/lu";
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { LuArrowRight } from "react-icons/lu";
import { LuArrowLeft } from "react-icons/lu";
import { fortniteEventsList } from './fortniteEventsList'
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

            {fortniteEventsList.slice(0, showAll ? fortniteEventsList.length : 3).map((fifaTournament, index) => (
            <div key={index} className={allEventsStyles.cardContainer}>
                <div className={allEventsStyles.imageContainer}>
                    <Image
                        src={fifaTournament.image.src}
                        alt={fifaTournament.image.alt}
                    />
                </div>
                            
                <div className={`${allEventsStyles.descriptionContainer} ${allEventsStyles.descriptionContainer}`}>
                    <div className={allEventsStyles.descriptionNameLocation}>
                        <p><span className={allEventsStyles.descriptionName}>{fifaTournament.details.name}</span> - <span className={allEventsStyles.descriptionLocation}>{fifaTournament.details.location}</span></p>
                    </div>
            
                    <div className={allEventsStyles.teamsIndividualsContainer}>
                        <p className={allEventsStyles.teamsIndividualsParagraph}>
                            <span className={allEventsStyles.teamsIndividualsIconSpan}><AiOutlineTeam className={allEventsStyles.teamsIcon} /></span>
                            <span className={allEventsStyles.teamsIndividualsSpan}>{fifaTournament.details.teamType}</span>
                        </p>
                        <span className={allEventsStyles.playerNumber}># {fifaTournament.details.players}</span>
                    </div>
            
                    <div className={`${allEventsStyles.nameDateContainer} ${allEventsStyles.nameDateContainer}`}>
                        <p className={`${allEventsStyles.nameParagraph}`}>
                            <span className={allEventsStyles.padIconSpan}><LuGamepad2 className={allEventsStyles.padIcon} /></span>
                            <span className={allEventsStyles.nameSpan}>{fifaTournament.details.game}</span>
                        </p>
                        <p className={`${allEventsStyles.dateParagraph}`}>
                            <span className={allEventsStyles.calendarIconSpan}><FiCalendar className={allEventsStyles.calendarIcon} /></span>
                            <span className={allEventsStyles.dateSpan}>{fifaTournament.details.date}</span>
                        </p>
                    </div>
                                        
                    <div className={`${allEventsStyles.prizeFeeContainer} ${allEventsStyles.prizeFeeContainer}`}>
                        <p className={`${allEventsStyles.prizeParagraph}`}>
                            <span className={allEventsStyles.prizeIconSpan}><GrTrophy className={allEventsStyles.prizeIcon} /></span>
                            <span className={allEventsStyles.prizeSpan}>Prize: {fifaTournament.details.prize}</span>
                        </p>
                        <p className={`${allEventsStyles.feeParagraph}`}>
                            <span className={allEventsStyles.feeIconSpan}><PiMoneyWavy className={allEventsStyles.feeIcon} /></span>
                            <span className={allEventsStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={allEventsStyles.coinIcon} /></span> {fifaTournament.details.fee}</span>
                        </p>
                    </div>
                
                    <div className={`${allEventsStyles.buttonContainer} ${allEventsStyles.buttonContainer}`}>
                        <Link href={'/tournament-details'} className={allEventsStyles.viewDetailsBTN}>View Details</Link>
                        <Link href={'/tournament-register'} className={allEventsStyles.registerBTN}>Register</Link>
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