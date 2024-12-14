import { IoMdArrowForward  } from "react-icons/io";
import TournamentFormat from "./tournament-format/TournamentFormat";
import Participants from "./participants/Participants";
import TournamentRules from "./tournament-rules/TournamentRules";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'

const FormatParticipants = () => {
  return (
    <div className={createTournamentStyles.generalTabContainer}>
        <header className={createTournamentStyles.createTournamentHeader}>
            <h1>Format & Participants</h1>
        </header>

        <TournamentFormat />

        <Participants />
        
        <TournamentRules />

        <div className={createTournamentStyles.buttonContainer}>
          <button
            className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`}
          >
            Save Draft
          </button>
          
          <button
            className={`${createTournamentStyles.btn} ${createTournamentStyles.proceedBTN}`}
          >
            Proceed
            <IoMdArrowForward className={createTournamentStyles.forwardArrowIcon} />
          </button>
        </div>
    </div>
  )
}

export default FormatParticipants