import { useState, useEffect } from "react";
import { IoMdArrowBack } from "react-icons/io";
import ReviewHeaderComponent from "@/components/create-tournament-component/review/review-header-component/ReviewHeaderComponent";
import ReviewBasicInfo from "@/components/create-tournament-component/review/review-basic-info/ReviewBasicInfo";
import ReviewFormatParticipants from "@/components/create-tournament-component/review/review-format-participants/ReviewFormatParticipants";
import ReviewPrizeDistribution from "@/components/create-tournament-component/review/review-prize-distribution/ReviewPrizeDistribution";
import ReviewSponsorLinks from "./review-sponsor-links/ReviewSponsorLinks";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import styles from './review.module.css'

const Review = ({ setSelectedTab, handleSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({});
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    // Load form data from localStorage
    const savedData = localStorage.getItem('createTournamentData');
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  const handleBack = () => {
    setSelectedTab((prevTab) => prevTab - 1);
  };

  return (
    <div className={`${createTournamentStyles.generalTabContainer} ${styles.generalTabContainer}`}>
      <header>
        <h1>Review</h1>
      </header>

      <ReviewHeaderComponent
        title="Basic Info"
        isCompleted={true}
        editTabIndex={1}
        setSelectedTab={setSelectedTab}
      >
        <ReviewBasicInfo />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title="Format & Participants"
        isCompleted={true}
        editTabIndex={2}
        setSelectedTab={setSelectedTab}
      >
        <ReviewFormatParticipants />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title="Prize Distribution"
        isCompleted={true}
        editTabIndex={3}
        setSelectedTab={setSelectedTab}
      >
        <ReviewPrizeDistribution />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title="Sponsors & Links"
        isCompleted={true}
        editTabIndex={4}
        setSelectedTab={setSelectedTab}
      >
        <ReviewSponsorLinks />
      </ReviewHeaderComponent>

      {submitError && (
        <div className={styles.errorMessage}>
          Error: {submitError}
        </div>
      )}

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
            disabled={isSubmitting}
          >
            <IoMdArrowBack className={createTournamentStyles.backArrowIcon} />
            Back
          </button>

          <button
            className={`${createTournamentStyles.btn} ${createTournamentStyles.publishBTN}`}
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Review;