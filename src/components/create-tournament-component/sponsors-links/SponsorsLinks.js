import { IoMdArrowForward  } from "react-icons/io";
import Sponsor from "./sponsors/Sponsors";
import WebSocialLink from "./web-social-links/WebSocialLink";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'

const SponsorsLinks = () => {
  return (
    <div className={createTournamentStyles.generalTabContainer}>
        <header>
            <h1>Sponsors & Links</h1>
        </header>

        <Sponsor />
        
        <WebSocialLink />

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

export default SponsorsLinks