import { IoMdArrowForward  } from "react-icons/io";
import PrizeDistributionInside from "./prize-distribution-inside/PrizeDistributionInside";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'

const PrizeDistribution = () => {
  return (
    <div className={createTournamentStyles.generalTabContainer}>
        <header className={createTournamentStyles.createTournamentHeader}>
            <h1>Prize Distribution</h1>
        </header>

        <PrizeDistributionInside />

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

export default PrizeDistribution