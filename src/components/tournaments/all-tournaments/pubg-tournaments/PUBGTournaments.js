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
import { pubgTournamentsList } from './pubgTournamentsList'
import menuContentStyles from '@/styles/menu/menu-content.module.css'
import newTournamentsStyles from './../../new-tournaments/new-tournaments.module.css';
import allTournamentsStyles from './../all-tournaments.module.css'

const PUBGTournaments = () => {
    const [showAll, setShowAll] = useState(false)

    const handleToggle = () => {
        setShowAll(!showAll)
    }

  return (
    <div className={allTournamentsStyles.fifaTournamentsContainer}>
        <div className={allTournamentsStyles.header}>
            <h3>PUBG Tournaments</h3>
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

            {pubgTournamentsList.slice(0, showAll ? pubgTournamentsList.length : 3).map((pubgTournament, index) => (
            <div key={index} className={allTournamentsStyles.cardContainer}>
                <div className={allTournamentsStyles.imageContainer}>
                    <Image
                        src={pubgTournament.image.src}
                        alt={pubgTournament.image.alt}
                    />
                </div>
                            
                <div className={menuContentStyles.descriptionContainer}>
                    <div className={menuContentStyles.descriptionNameLocationParagraph}>
                        <p><span className={menuContentStyles.descriptionNameSpan}>{pubgTournament.details.name}</span> - <span className={menuContentStyles.descriptionLocationSpan}>{pubgTournament.details.location}</span></p>
                    </div>
            
                    <div className={menuContentStyles.eventOrParticipantTypeContainer}>
                        <p className={menuContentStyles.participantTypeParagraph}>
                            <span className={menuContentStyles.participantIconSpan}><AiOutlineTeam className={menuContentStyles.teamsIcon} /></span>
                            <span className={menuContentStyles.participantTypeSpan}>{pubgTournament.details.teamType}</span>
                        </p>
                        <span className={menuContentStyles.playerSpan}># {pubgTournament.details.players}</span>
                    </div>
            
                    <div className={menuContentStyles.nameDateContainer}>
                        <p className={menuContentStyles.nameParagraphHalf}>
                            <span className={menuContentStyles.padIconSpan}><LuGamepad2 className={menuContentStyles.padIcon} /></span>
                            <span className={menuContentStyles.nameSpan}>{pubgTournament.details.game}</span>
                        </p>
                        <p className={menuContentStyles.dateParagraphHalf}>
                            <span className={menuContentStyles.calendarIconSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                            <span className={menuContentStyles.dateSpan}>{pubgTournament.details.date}</span>
                        </p>
                    </div>
                                        
                    <div className={menuContentStyles.prizeFeeContainer}>
                        <p className={menuContentStyles.nameParagraphHalf}>
                            <span className={menuContentStyles.prizeIconSpan}><GrTrophy className={menuContentStyles.prizeIcon} /></span>
                            <span className={menuContentStyles.prizeSpan}>Prize: N {pubgTournament.details.prize}</span>
                        </p>
                        <p className={menuContentStyles.feeParagraphHalf}>
                            <span className={menuContentStyles.feeIconSpan}><PiMoneyWavy className={menuContentStyles.feeIcon} /></span>
                            <span className={menuContentStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> {pubgTournament.details.fee}</span>
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

export default PUBGTournaments