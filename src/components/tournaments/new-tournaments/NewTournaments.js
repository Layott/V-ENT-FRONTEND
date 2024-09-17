import Image from 'next/image'
import { AiOutlineTeam } from "react-icons/ai";
import { LuGamepad2 } from "react-icons/lu";
import { FiCalendar } from "react-icons/fi";
import { GrTrophy } from "react-icons/gr";
import { PiMoneyWavy } from "react-icons/pi";
import { RiCopperCoinFill } from "react-icons/ri";
import tournamentOne from "@/images/new_tournament_1.jpg"
import styles from './new-tournaments.module.css'

const NewTournaments = () => {
  return (
    <div className={styles.newTournamentsContainer}>

        <div className={styles.cardContainer}>
            <div className={styles.imageContainer}>
                <Image
                    src={tournamentOne}
                    alt='Tournament One'
                />
            </div>

            <div className={styles.descriptionContainer}>
                <div className={styles.descriptionNameLocation}>
                    <p><span className={styles.descriptionName}>PUBG</span> - <span className={styles.descriptionLocation}>Unilag</span></p>
                </div>

                <div className={styles.teamsIndividualsContainer}>
                    <p className={styles.teamsIndividualsParagraph}>
                        <span className={styles.teamsIndividualsIconSpan}><AiOutlineTeam className={styles.teamsIcon} /></span>
                        <span className={styles.teamsIndividualsSpan}>Teams, Individuals</span>
                    </p>
                    <span className={styles.playerNumber}># 20 Players</span>
                </div>

                <div className={styles.nameDateContainer}>
                    <p className={styles.nameParagraph}>
                        <span className={styles.padIconSpan}><LuGamepad2 className={styles.padIcon} /></span>
                        <span className={styles.nameSpan}>Counter Strike</span>
                    </p>
                    <p className={styles.dateParagraph}>
                        <span className={styles.calendarIconSpan}><FiCalendar className={styles.calendarIcon} /></span>
                        <span className={styles.dateSpan}>Oct. 1st - 21st 2024</span>
                    </p>
                </div>
                
                <div className={styles.priceFeeContainer}>
                    <p className={styles.priceParagraph}>
                        <span className={styles.priceIconSpan}><GrTrophy className={styles.priceIcon} /></span>
                        <span className={styles.priceSpan}>Price: N500,000</span>
                    </p>
                    <p className={styles.feeParagraph}>
                        <span className={styles.feeIconSpan}><PiMoneyWavy className={styles.feeIcon} /></span>
                        <span className={styles.feeSpan}>Fee: <span><RiCopperCoinFill className={styles.coinIcon} /></span> 40</span>
                    </p>
                </div>

                <div className={styles.buttonContainer}>
                    <button className={styles.viewDetailsBTN}>View Details</button>
                    <button className={styles.registerBTN}>Register</button>
                </div>
            </div>

        </div>
        
    </div>
  )
}

export default NewTournaments