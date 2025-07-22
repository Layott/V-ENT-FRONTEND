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
    // Check for required Basic Info fields (matching the validation in BasicInfo component)
    const requiredFields = [
      'tournament_title',
      'game',
      'game_mode',
      'tournament_description',
      'tournament_type',
      'start_date_and_time',
      'end_date_and_time',
      'reg_start_date_and_time',
      'reg_end_date_and_time',
      'scheduleType',
      'tournament_visibility',
      'entry_type'
    ];
    
    console.log('Basic Info check:', formData);
    return requiredFields.every(field => 
      formData[field] && formData[field].toString().trim() !== ''
    );
  };

  const isFormatParticipantsCompleted = () => {
    // Check for required Format & Participants fields (matching the validation in FormatParticipants component)
    console.log('Format Participants check:', formData);
    
    // Check basic required fields
    if (!formData.bracket_type) return false;
    if (!formData.tournament_access) return false;
    if (!formData.tournament_rules || formData.tournament_rules.trim() === '') return false;

    // Additional validation based on tournament access type
    if (formData.tournament_access === 'teams' || formData.tournament_access === 'both') {
      if (!formData.team_size || formData.team_size === '') return false;
    }

    if (formData.tournament_access === 'individuals' || formData.tournament_access === 'both') {
      if (!formData.min_number_of_participants || formData.min_number_of_participants === '') return false;
      if (!formData.max_number_of_participants || formData.max_number_of_participants === '') return false;
    }

    return true;
  };

  const isPrizeDistributionCompleted = () => {
    // Check if prize distribution has been configured
    console.log('Prize Distribution check - Full formData:', formData);
    console.log('Prize Distribution check - All keys:', Object.keys(formData));
    
    // Log all fields that might be prize-related
    const prizeFields = Object.keys(formData).filter(key => 
      key.toLowerCase().includes('prize') || 
      key.toLowerCase().includes('reward') ||
      key.toLowerCase().includes('distribution') ||
      key.toLowerCase().includes('pool')
    );
    console.log('Prize-related fields found:', prizeFields);
    prizeFields.forEach(field => {
      console.log(`${field}:`, formData[field]);
    });
    
    // For now, return true if ANY prize-related field exists and has content
    // This is a temporary fix - replace with actual field names once identified
    return prizeFields.some(field => {
      const value = formData[field];
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object' && value !== null) return Object.keys(value).length > 0;
      if (typeof value === 'string') return value.trim() !== '';
      return value !== null && value !== undefined && value !== '';
    });
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
            onClick={() => handleSubmit(true)} // Pass true for draft
            disabled={isSavingDraft || isPublishing}
          >
            {isSavingDraft ? 'Saving...' : 'Save Draft'}
          </button>


          <div className={createTournamentStyles.backAndProceedContainer}>
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