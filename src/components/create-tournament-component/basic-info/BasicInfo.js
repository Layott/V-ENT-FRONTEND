import { IoMdArrowForward  } from "react-icons/io";
import CreateTournamentTitle from './create-tournament-title/CreateTournamentTitle'
import CreateTournamentType from './create-tournament-type/CreateTournamentType'
import CreateTournamentSchedule from './create-tournament-schedule/CreateTournamentSchedule'
import CreateTournamentVisibility from './create-tournament-visibility/CreateTournamentVisibility'
import CreateTournamentLogo from './create-tournament-logo/CreateTournamentLogo'
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'

const BasicInfo = ({ setSelectedTab }) => {
  const handleProceed = () => {
    setSelectedTab((prevTab) => prevTab + 1);
  }

  return (
    <div className={createTournamentStyles.generalTabContainer}>
        <header>
            <h1>Basic Info</h1>
        </header>

        <CreateTournamentTitle />

        <CreateTournamentType />

        <CreateTournamentSchedule />

        <CreateTournamentVisibility />
        
        <CreateTournamentLogo />

        <div className={createTournamentStyles.buttonContainer}>
          <button
            className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`}
          >
            Save Draft
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
  )
}

export default BasicInfo