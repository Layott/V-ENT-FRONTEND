import Image from 'next/image'
import Link from 'next/link';
import { AiOutlineTeam } from "react-icons/ai";
import { LuGamepad2 } from "react-icons/lu";
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import { newTournamentsList } from './newTournamentsList'
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
            
                    <div className={styles.descriptionContainer}>
                        <div className={styles.descriptionNameLocation}>
                            <p><span className={styles.descriptionName}>{tournament.name}</span> - <span className={styles.descriptionLocation}>{tournament.location}</span></p>
                        </div>
            
                        <div className={styles.teamsIndividualsContainer}>
                            <p className={styles.teamsIndividualsParagraph}>
                                <span className={styles.teamsIndividualsIconSpan}><AiOutlineTeam className={styles.teamsIcon} /></span>
                                <span className={styles.teamsIndividualsSpan}>{tournament.participants.type}</span>
                            </p>
                            <span className={styles.playerNumber}># {tournament.participants.number} Players</span>
                        </div>
            
                        <div className={styles.nameDateContainer}>
                            <p className={styles.nameParagraph}>
                                <span className={styles.padIconSpan}><LuGamepad2 className={styles.padIcon} /></span>
                                <span className={styles.nameSpan}>{tournament.game}</span>
                            </p>
                            <p className={styles.dateParagraph}>
                                <span className={styles.calendarIconSpan}><FiCalendar className={styles.calendarIcon} /></span>
                                <span className={styles.dateSpan}>{tournament.date}</span>
                            </p>
                        </div>
                            
                        <div className={styles.prizeFeeContainer}>
                            <p className={styles.prizeParagraph}>
                                <span className={styles.prizeIconSpan}><GrTrophy className={styles.prizeIcon} /></span>
                                <span className={styles.prizeSpan}>Prize: {tournament.prize}</span>
                            </p>
                            <p className={styles.feeParagraph}>
                                <span className={styles.feeIconSpan}><PiMoneyWavy className={styles.feeIcon} /></span>
                                <span className={styles.feeSpan}>Fee: <span><RiCopperCoinFill className={styles.coinIcon} /></span> {tournament.fee}</span>
                            </p>
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