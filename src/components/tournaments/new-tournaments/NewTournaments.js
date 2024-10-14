import Image from 'next/image'
import Link from 'next/link';
import { AiOutlineTeam } from "react-icons/ai";
import { LuGamepad2 } from "react-icons/lu";
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { newTournamentsList } from './newTournamentsList'
import menuContentStyles from '@/styles/menu/menu-content.module.css'
import styles from './new-tournaments.module.css'

const NewTournaments = () => {
  return (
    <div className={styles.newTournamentsContainer}>
        <h3>New Tournaments</h3>
        
        <div className={styles.cardsContainer}>
            
            {newTournamentsList.map((tournament, index) => (
                <div key={index} className={styles.cardContainer}>
                    <div className={styles.imageContainer}>
                        <Image
                            src={tournament.image}
                            alt={tournament.alt}
                        />
                    </div>
            
                    <div className={menuContentStyles.descriptionContainer}>
                        <div className={menuContentStyles.descriptionNameOrLocation}>
                            <p><span className={menuContentStyles.descriptionNameSpan}>{tournament.name}</span> - <span className={menuContentStyles.descriptionLocationSpan}>{tournament.location}</span></p>
                        </div>
            
                        <div className={menuContentStyles.detailsContainer}>
                            <div className={menuContentStyles.eventOrParticipantTypeContainer}>
                                <p className={menuContentStyles.participantTypeParagraph}>
                                    <span className={menuContentStyles.participantIconSpan}><AiOutlineTeam className={menuContentStyles.teamsIcon} /></span>
                                    <span className={menuContentStyles.participantTypeSpan}>{tournament.participants.type}</span>
                                </p>
                                <span className={menuContentStyles.playerSpan}># {tournament.participants.number} Players</span>
                            </div>
                
                            <div className={menuContentStyles.nameDateContainer}>
                                <p className={menuContentStyles.nameParagraphHalf}>
                                    <span className={menuContentStyles.padIconSpan}><LuGamepad2 className={menuContentStyles.padIcon} /></span>
                                    <span className={menuContentStyles.nameSpan}>{tournament.game}</span>
                                </p>
                                <p className={menuContentStyles.dateParagraphHalf}>
                                    <span className={menuContentStyles.calendarIconSpan}><FiCalendar className={menuContentStyles.calendarIcon} /></span>
                                    <span className={menuContentStyles.dateSpan}>{tournament.date}</span>
                                </p>
                            </div>
                                
                            <div className={menuContentStyles.prizeFeeContainer}>
                                <p className={menuContentStyles.prizeParagraphHalf}>
                                    <span className={menuContentStyles.prizeIconSpan}><GrTrophy className={menuContentStyles.trophyIcon} /></span>
                                    <span className={menuContentStyles.prizeSpan}>Prize: {tournament.prize}</span>
                                </p>
                                <p className={menuContentStyles.feeParagraphHalf}>
                                    <span className={menuContentStyles.feeIconSpan}><PiMoneyWavy className={menuContentStyles.feeIcon} /></span>
                                    <span className={menuContentStyles.feeSpan}>Fee: <span><RiCopperCoinFill className={menuContentStyles.coinIcon} /></span> {tournament.fee}</span>
                                </p>
                            </div>
                        </div>
            
                        <div className={styles.buttonContainer}>
                            <Link href={'/tournament-details'} className={styles.viewDetailsBTN}>View Details</Link>
                            <Link href={'/tournament-register'} className={styles.registerBTN}>Register</Link>
                        </div>
                    </div>
            
                </div>
            
            ))}

        </div>

    </div>
  )
}

export default NewTournaments