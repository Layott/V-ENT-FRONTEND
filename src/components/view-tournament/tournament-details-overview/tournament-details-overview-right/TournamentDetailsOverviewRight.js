import { VscTypeHierarchySub } from "react-icons/vsc";
import { GrGamepad, GrTrophy } from "react-icons/gr";
import { PiMoneyWavy } from "react-icons/pi";
import { FiCalendar } from "react-icons/fi";
import { IoLocationOutline } from "react-icons/io5";
import { AiOutlineTeam } from "react-icons/ai";
import { IoMdInformationCircleOutline } from "react-icons/io";
import { IoMdArrowForward } from "react-icons/io";
import tournamentStyles from '@/styles/tournament/tournament.module.css'
import overviewLtStyles from '@/view-/tournament-left/overview-lt.module.css'
import overviewRtStyles from '@/view-/overview-right/overview-rt.module.css'

const TournamentDetailsOverviewRight = () => {
  return (
    <div className={overviewLtStyles.overviewRight}>
      <div className={overviewRtStyles.rightBox}>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}><VscTypeHierarchySub className={overviewRtStyles.icons} /> Format</p>
          <p className={overviewRtStyles.paragraphValue}>Single Elimination</p>
        </div>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}><GrGamepad className={overviewRtStyles.icons} /> Game</p>
          <p className={overviewRtStyles.paragraphValue}>Counter Strike</p>
        </div>

        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}><PiMoneyWavy className={overviewRtStyles.icons} /> Entry Fee</p>
          <p className={overviewRtStyles.paragraphValue}>No fee required</p>
        </div>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}><FiCalendar className={overviewRtStyles.icons} /> Date</p>
          <p className={overviewRtStyles.paragraphValue}>1st Oct - 21st Oct 2024</p>
        </div>
        <div className={overviewRtStyles.paragraphDiv}>
          <p className={overviewRtStyles.paragraphTitle}><IoLocationOutline className={overviewRtStyles.icons} /> Location </p>
          <p className={overviewRtStyles.paragraphValue}>Landmark Beach, Water Corporation Drive, Lagos, Nigeria.</p>
        </div>

      </div>

      <div className={overviewRtStyles.rightBox}>
        <h3 className={`${overviewRtStyles.headerH3} ${tournamentStyles.headerH3}`}><GrTrophy className={overviewRtStyles.priceIcon} /> Prize</h3>
        <p>N2,500,000</p>
        <p>
          <IoMdInformationCircleOutline /> Winner takes all
        </p>
      </div>

      <div className={overviewRtStyles.rightBox}>
        <div className={overviewRtStyles.rightBoxHeaderContainer}>
          <h3 className={`${overviewRtStyles.headerH3} ${tournamentStyles.headerH3}`}><GrTrophy className={overviewRtStyles.priceIcon} /> Prize</h3>
          <button className={overviewRtStyles.viewFullDistributionBTN}>View full distribution <IoMdArrowForward className={overviewRtStyles.forwardArrowIcon} /></button>
        </div>
        <div className={overviewRtStyles.winnerContainer}>
          <p className={overviewRtStyles.winnerText}>Winner</p>
          <p>N1,000,000</p>
        </div>
        <div className={overviewRtStyles.secondThirdContainer}>
          <div className={overviewRtStyles.secondPlaceContainer}>
            <p className={overviewRtStyles.secondPlaceText}>Second</p>
            <p>N600,000</p>
          </div>
          <div className={overviewRtStyles.thirdPlaceContainer}>
            <p className={overviewRtStyles.thirdPlaceText}>Third</p>
            <p>N300,000</p>
          </div>
        </div>
      </div>

      <div className={overviewRtStyles.rightBox}>
        <div className={overviewRtStyles.rightBoxHeaderContainer}>
          <h3 className={`${overviewRtStyles.headerH3} ${tournamentStyles.headerH3}`}><AiOutlineTeam className={overviewRtStyles.participantsIcon} /> Participants</h3>
          <button className={overviewRtStyles.viewAllBTN}>View All <IoMdArrowForward className={overviewRtStyles.forwardArrowIcon} /></button>
        </div>
        <p className={overviewRtStyles.participantsParagraph}>
          Teams and Individuals can register for this tournament.
        </p>
        <div className={overviewRtStyles.requirementContainer}>
          <div className={overviewRtStyles.minRequiredContainer}>
            <p className={overviewRtStyles.minRequiredText}>Minimum Required</p>
            <p className={overviewRtStyles.minRequiredValue}>4</p>
          </div>

          <div className={overviewRtStyles.maxRequiredContainer}>
            <p className={overviewRtStyles.maxRequiredText}>Minimum Required</p>
            <p className={overviewRtStyles.maxRequiredValue}>20</p>
          </div>
          
          <div className={overviewRtStyles.registeredContainer}>
            <p className={overviewRtStyles.registeredText}>Registered</p>
            <p className={overviewRtStyles.minRequiredValue}>16</p>
          </div>
        </div>
        
      </div>
    </div>
  )
}

export default TournamentDetailsOverviewRight