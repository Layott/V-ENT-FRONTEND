import { IoMdArrowForward, IoMdArrowBack } from "react-icons/io";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'

const Review = ({ setSelectedTab }) => {
  const handleBack = () => {
    setSelectedTab((prevTab) => prevTab - 1);
  }

  const handlePublish = () => {
    // setSelectedTab((prevTab) => prevTab - 1);
  }

  return (
    <div className={createTournamentStyles.generalTabContainer}>
      <header>
          <h1>Review</h1>
      </header>

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
            className={`${createTournamentStyles.btn} ${createTournamentStyles.publishBTN}`}
            onClick={handlePublish}
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  )
}

export default Review