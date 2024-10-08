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
import { fortniteTournamentsList } from './fortniteTournamentsList'
import newTournamentsStyles from './../../new-tournaments/new-tournaments.module.css';
import allTournamentsStyles from './../all-tournaments.module.css'

const FortniteTournaments = () => {
    const [showAll, setShowAll] = useState(false)

    const handleToggle = () => {
        setShowAll(!showAll)
    }

  return (
    <div className={allTournamentsStyles.fifaTournamentsContainer}>
        <div className={allTournamentsStyles.header}>
            <h3>Fortnite Tournaments</h3>
            {!showAll && (
            <button
                className={allTournamentsStyles.seeMoreBTN}
                onClick={handleToggle}
            >
                See more<LuArrowRight />
            </button>
            )}
        </div>

        <div className={allTournamentsStyles.cardsContainer}>

            {fortniteTournamentsList.slice(0, showAll ? fortniteTournamentsList.length : 3).map((fifaTournament, index) => (
            <div key={index} className={allTournamentsStyles.cardContainer}>
                <div className={allTournamentsStyles.imageContainer}>
                    <Image
                        src={fifaTournament.image.src}
                        alt={fifaTournament.image.alt}
                    />
                </div>
                            
                <div className={`${newTournamentsStyles.descriptionContainer} ${allTournamentsStyles.descriptionContainer}`}>
                    <div className={newTournamentsStyles.descriptionNameLocation}>
                        <p><span className={newTournamentsStyles.descriptionName}>{fifaTournament.details.name}</span> - <span className={newTournamentsStyles.descriptionLocation}>{fifaTournament.details.location}</span></p>
                    </div>
            
                    <div className={newTournamentsStyles.teamsIndividualsContainer}>
                        <p className={newTournamentsStyles.teamsIndividualsParagraph}>
                            <span className={newTournamentsStyles.teamsIndividualsIconSpan}><AiOutlineTeam className={newTournamentsStyles.teamsIcon} /></span>
                            <span className={newTournamentsStyles.teamsIndividualsSpan}>{fifaTournament.details.teamType}</span>
                        </p>
                        <span className={newTournamentsStyles.playerNumber}># {fifaTournament.details.players}</span>
                    </div>
            
                    <div className={`${newTournamentsStyles.nameDateContainer} ${allTournamentsStyles.nameDateContainer}`}>
                        <p className={`${newTournamentsStyles.nameParagraph}`}>
                            <span className={newTournamentsStyles.padIconSpan}><LuGamepad2 className={newTournamentsStyles.padIcon} /></span>
                            <span className={newTournamentsStyles.nameSpan}>{fifaTournament.details.game}</span>
                        </p>
                        <p className={`${newTournamentsStyles.dateParagraph}`}>
                            <span className={newTournamentsStyles.calendarIconSpan}><FiCalendar className={newTournamentsStyles.calendarIcon} /></span>
                            <span className={newTournamentsStyles.dateSpan}>{fifaTournament.details.date}</span>
                        </p>
                    </div>
                                        
                    <div className={`${newTournamentsStyles.prizeFeeContainer} ${allTournamentsStyles.prizeFeeContainer}`}>
                        <p className={`${newTournamentsStyles.prizeParagraph}`}>
                            <span className={newTournamentsStyles.prizeIconSpan}><GrTrophy className={newTournamentsStyles.prizeIcon} /></span>
                            <span className={newTournamentsStyles.prizeSpan}>Prize: {fifaTournament.details.prize}</span>
                        </p>
                        <p className={`${newTournamentsStyles.feeParagraph}`}>
                            <span className={newTournamentsStyles.feeIconSpan}><PiMoneyWavy className={newTournamentsStyles.feeIcon} /></span>
                            <span className={newTournamentsStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={newTournamentsStyles.coinIcon} /></span> {fifaTournament.details.fee}</span>
                        </p>
                    </div>
                
                    <div className={`${newTournamentsStyles.buttonContainer} ${allTournamentsStyles.buttonContainer}`}>
                        <Link href={'/tournament-details'} className={newTournamentsStyles.viewDetailsBTN}>View Details</Link>
                        <Link href={'/tournament-register'} className={newTournamentsStyles.registerBTN}>Register</Link>
                    </div>
                </div>
                    
            </div>
            ))}
            {showAll && (
                <button
                    className={`${allTournamentsStyles.seeMoreBTN} ${allTournamentsStyles.seeLessBTN}`}
                    onClick={handleToggle}
                >
                    <LuArrowLeft />See less
                </button>
            )}
        </div>

    </div>

  )
}

export default FortniteTournaments