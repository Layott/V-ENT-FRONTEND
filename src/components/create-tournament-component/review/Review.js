import { useState, useEffect } from "react";
import { IoMdArrowBack } from "react-icons/io";
import ReviewHeaderComponent from "@/components/create-tournament-component/review/review-header-component/ReviewHeaderComponent";
import ReviewBasicInfo from "@/components/create-tournament-component/review/review-basic-info/ReviewBasicInfo";
import ReviewFormatParticipants from "@/components/create-tournament-component/review/review-format-participants/ReviewFormatParticipants";
import ReviewPrizeDistribution from "@/components/create-tournament-component/review/review-prize-distribution/ReviewPrizeDistribution";
import ReviewSponsorLinks from "./review-sponsor-links/ReviewSponsorLinks";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import styles from './review.module.css'

const Review = ({ setSelectedTab, handleSubmit, isSavingDraft, isPublishing, }) => {
  const [formData, setFormData] = useState({});
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    // Load form data from localStorage
    const savedData = localStorage.getItem('createTournamentData');
    console.log("Saved data in Review:", savedData);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      setFormData(parsedData);
      // Debug: Log the form data structure
      console.log('Form data loaded:', parsedData);
    }
  }, []);

  // Validation functions to check if each section is completed
  const isBasicInfoCompleted = () => {
    // Add your basic info validation logic here
    // Check if formData has any properties (adjust field names as needed)
    console.log('Basic Info check:', formData);
    return Object.keys(formData).length > 0; // Temporary - returns true if ANY data exists
  };

  const isFormatParticipantsCompleted = () => {
    // Add your format & participants validation logic here
    console.log('Format Participants check:', formData);
    return Object.keys(formData).length > 0; // Temporary - returns true if ANY data exists
  };

  const isPrizeDistributionCompleted = () => {
    // Add your prize distribution validation logic here
    console.log('Prize Distribution check:', formData);
    return Object.keys(formData).length > 0; // Temporary - returns true if ANY data exists
  };

  const isSponsorsLinksCompleted = () => {
    // Check if sponsors and links are actually filled
    const hasSponsors = formData.sponsors && formData.sponsors.length > 0;
    const hasLinks = formData.links && formData.links.length > 0;
    
    // Return true only if at least one sponsor or link is added
    return hasSponsors || hasLinks;
  };

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
        isCompleted={isBasicInfoCompleted()}
        editTabIndex={1}
        setSelectedTab={setSelectedTab}
      >
        <ReviewBasicInfo />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title="Format & Participants"
        isCompleted={isFormatParticipantsCompleted()}
        editTabIndex={2}
        setSelectedTab={setSelectedTab}
      >
        <ReviewFormatParticipants />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title="Prize Distribution"
        isCompleted={isPrizeDistributionCompleted()}
        editTabIndex={3}
        setSelectedTab={setSelectedTab}
      >
        <ReviewPrizeDistribution />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title="Sponsors & Links"
        isCompleted={isSponsorsLinksCompleted()}
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
          onClick={() => handleSubmit(true)}
          disabled={isSavingDraft || isPublishing}
        >
          {isSavingDraft ? 'Saving...' : 'Save Draft'}
        </button>


        <div div className={createTournamentStyles.backAndProceedContainer}>
          <button
            className={`${createTournamentStyles.btn} ${createTournamentStyles.backBTN}`}
            onClick={handleBack}
            disabled={isSavingDraft || isPublishing}
          >
            <IoMdArrowBack className={createTournamentStyles.backArrowIcon} />
            Back
          </button>

          <button
            className={`${createTournamentStyles.btn} ${createTournamentStyles.publishBTN}`}
            onClick={() => handleSubmit(false)} // Pass false for publish
            disabled={isSavingDraft || isPublishing}
          >
            {isPublishing  ? 'Publishing...' : 'Publish'}
          </button>
        </div>
        </div>
      </div>
  );
}

export default Review;