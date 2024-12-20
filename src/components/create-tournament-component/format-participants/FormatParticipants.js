import { IoMdArrowForward, IoMdArrowBack } from "react-icons/io";
import TournamentFormat from "./tournament-format/TournamentFormat";
import Participants from "./participants/Participants";
import TournamentRules from "./tournament-rules/TournamentRules";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'

const FormatParticipants = ({ setSelectedTab }) => {
  const handleProceed = () => {
    setSelectedTab((prevTab) => prevTab + 1);
  }

  const handleBack = () => {
    setSelectedTab((prevTab) => prevTab - 1);
  }

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
          
          <div className={createTournamentStyles.backAndProceedContainer}>
            <button
              className={`${createTournamentStyles.btn} ${createTournamentStyles.backBTN}`}
              onClick={handleBack}
            >
              <IoMdArrowBack className={createTournamentStyles.backArrowIcon} />
              Back
            </button>

            <button
              className={`${createTournamentStyles.btn} ${createTournamentStyles.proceedBTN}`}
              onClick={handleProceed}
            >
              Proceed
              <IoMdArrowForward className={createTournamentStyles.forwardArrowIcon} />
            </button>
          </div>
        </div>
    </div>
  )
}

export default FormatParticipants