import { VscTypeHierarchySub } from "react-icons/vsc";
import { GrGamepad, GrTrophy } from "react-icons/gr";
import { PiMoneyWavy } from "react-icons/pi";
import { FiCalendar } from "react-icons/fi";
import { IoLocationOutline } from "react-icons/io5";
import { AiOutlineTeam } from "react-icons/ai";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { IoMdArrowForward } from "react-icons/io";
import tournamentDetailsOverviewStyles from './../tournament-details-overview.module.css'
import styles from './tournament-details-overview-right.module.css'

const TournamentDetailsOverviewRight = () => {
  return (
    <div className={tournamentDetailsOverviewStyles.overviewRight}>
      <div className={styles.formatContainer}>
        <div className={styles.format}>
          <p><VscTypeHierarchySub className={styles.formatIcon} /> Format</p>
          <p>Single Elimination</p>
        </div>
        <div className={styles.game}>
          <p><GrGamepad className={styles.gamePadIcon} /> Game</p>
          <p>Counter Strike</p>
        </div>
        <div className={styles.entryFee}>
          <p><PiMoneyWavy /> Entry Fee</p>
          <p>No fee required</p>
        </div>
        <div className={styles.date}>
          <p><FiCalendar /> Date</p>
          <p>1st Oct - 21st Oct 2024</p>
        </div>
        <div className={styles.location}>
          <p><IoLocationOutline /> Location </p>
          <p>Landmark Beach, Water Corporation Drive, Lagos, Nigeria.</p>
        </div>
      </div>

      <div className={styles.totalPrizeContainer}>
        <h3 className={styles.headerH3}><GrTrophy className={styles.priceIcon} /> Prize</h3>
        <p>N2,500,000</p>
        <p>
          <IoMdInformationCircleOutline /> Winner takes all
        </p>
      </div>

      <div className={styles.prizeDistributionContainer}>
        <div className={styles.prizeDistributionHeader}>
          <h3 className={styles.headerH3}><GrTrophy className={styles.priceIcon} /> Prize</h3>
          <button className={styles.viewFullDistributionBTN}>View full distribution <IoMdArrowForward className={styles.forwardArrowIcon} /></button>
        </div>
        <div className={styles.winnerContainer}>
          <p className={styles.winnerText}>Winner</p>
          <p>N1,000,000</p>
        </div>
        <div className={styles.secondThirdContainer}>
          <div className={styles.secondPlaceContainer}>
            <p className={styles.secondPlaceText}>Second</p>
            <p>N600,000</p>
          </div>
          <div className={styles.thirdPlaceContainer}>
            <p className={styles.thirdPlaceText}>Third</p>
            <p>N300,000</p>
          </div>
        </div>
      </div>

      <div className={styles.participantsContainer}>
        <div className={styles.participantsHeader}>
          <h3 className={styles.headerH3}><AiOutlineTeam className={styles.participantsIcon} /> Participants</h3>
          <button className={styles.viewAllBTN}>View All <IoMdArrowForward className={styles.forwardArrowIcon} /></button>
        </div>
        <p className={styles.participantsParagraph}>
          Teams and Individuals can register for this tournament.
        </p>
        <div className={styles.requirementContainer}>
          <div className={styles.minRequiredContainer}>
            <p className={styles.minRequiredText}>Minimum Required</p>
            <p className={styles.minRequiredValue}>4</p>
          </div>

          <div className={styles.maxRequiredContainer}>
            <p className={styles.maxRequiredText}>Minimum Required</p>
            <p className={styles.maxRequiredValue}>20</p>
          </div>
          
          <div className={styles.registeredContainer}>
            <p className={styles.registeredText}>Registered</p>
            <p className={styles.minRequiredValue}>16</p>
          </div>
        </div>
        
      </div>
    </div>
  )
}

export default TournamentDetailsOverviewRight