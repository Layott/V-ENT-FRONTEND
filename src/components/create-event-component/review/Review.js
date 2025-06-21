import { IoMdArrowBack } from "react-icons/io";
import ReviewHeaderComponent from "@/components/create-tournament-component/review/review-header-component/ReviewHeaderComponent";
import ReviewBasicInfo from "@/components/create-tournament-component/review/review-basic-info/ReviewBasicInfo";
import ReviewFormatParticipants from "@/components/create-tournament-component/review/review-format-participants/ReviewFormatParticipants";
import ReviewPrizeDistribution from "@/components/create-tournament-component/review/review-prize-distribution/ReviewPrizeDistribution";
import ReviewSponsorLinks from "./review-sponsor-links/ReviewSponsorLinks";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import styles from './review.module.css'

const Review = ({ formData, setFormData, handleSubmit, setSelectedTab }) => {
  const handleBack = () => {
    setSelectedTab((prevTab) => prevTab - 1);
  }

  const handlePublish = () => {
    handleSubmit(); 
  };

  // Function to check if Basic Info section is complete
  const isBasicInfoComplete = () => {
    return !!(
      formData.tournament_title &&
      formData.tournament_type &&
      formData.start_date_and_time &&
      formData.end_date_and_time
    );
  };

  // Function to check if Format & Participants section is complete
  const isFormatParticipantsComplete = () => {
    return !!(
      formData.tournament_format ||
      formData.bracket_type ||
      formData.team_size ||
      formData.min_number_of_participants ||
      formData.max_number_of_participants
    );
  };

  // Function to check if Prize Distribution section is complete
  // Updated isPrizeDistributionComplete function for Review component
const isPrizeDistributionComplete = () => {
  // Debug: Log the formData to see what fields are actually being used
  console.log('Prize Distribution formData:', {
    prize_distribution_type: formData.prize_distribution_type,
    winner_prize: formData.winner_prize,
    prize_distribution: formData.prize_distribution,
    entry_fee: formData.entry_fee,
    entry_type: formData.entry_type, // Often used instead of entry_fee
    // Add any other potential field names your PrizeDistributionInside component might be using
  });
  
  // Check for non-empty string values, not just truthy values
  const hasEntryFee = formData.entry_fee && formData.entry_fee.toString().trim() !== '' && formData.entry_fee !== '0';
  const hasEntryType = formData.entry_type && formData.entry_type.toString().trim() !== '';
  const hasPrizeType = formData.prize_distribution_type && formData.prize_distribution_type.toString().trim() !== '';
  const hasWinnerPrize = formData.winner_prize && formData.winner_prize.toString().trim() !== '';
  const hasPrizeDistribution = formData.prize_distribution && 
                              Array.isArray(formData.prize_distribution) && 
                              formData.prize_distribution.length > 0 &&
                              formData.prize_distribution.some(prize => 
                                prize && 
                                typeof prize === 'object' && 
                                Object.keys(prize).length > 0
                              );
  
  console.log('Prize Distribution checks:', {
    hasEntryFee,
    hasEntryType,
    hasPrizeType,
    hasWinnerPrize,
    hasPrizeDistribution
  });
  
  return hasEntryFee || hasEntryType || hasPrizeType || hasWinnerPrize || hasPrizeDistribution;
};

  // Function to check if Sponsors & Links section is complete
  const isSponsorsLinksComplete = () => {
  // Debug: Log the formData to see what fields are actually being used
  console.log('Sponsors & Links formData:', formData);
  
  // Check if any sponsors are added - looking for both possible structures
  const hasSponsors = (formData.sponsors && formData.sponsors.length > 0) || 
                     (formData.sponsor_names && formData.sponsor_names.length > 0) ||
                     (formData.sponsor_ids && formData.sponsor_ids.length > 0);
  
  // Check social links in webSocialLinks object first, then fallback to direct properties
  const socialLinks = formData.webSocialLinks || formData;
  
  // Check if any social media links are filled (not empty strings)
  const hasSocialLinks = Boolean(
    (socialLinks.facebook_link && socialLinks.facebook_link.toString().trim()) ||
    (socialLinks.twitter_link && socialLinks.twitter_link.toString().trim()) ||
    (socialLinks.instagram_link && socialLinks.instagram_link.toString().trim()) ||
    (socialLinks.youtube_link && socialLinks.youtube_link.toString().trim()) ||
    (socialLinks.twitch_link && socialLinks.twitch_link.toString().trim()) ||
    (socialLinks.kick_link && socialLinks.kick_link.toString().trim()) ||
    (socialLinks.tiktok_link && socialLinks.tiktok_link.toString().trim()) ||
    (socialLinks.bigolive_link && socialLinks.bigolive_link.toString().trim())
  );
  
  console.log('Sponsors check:', { hasSponsors, hasSocialLinks, socialLinks });
  
  return hasSponsors || hasSocialLinks;
};

  return (
    <div className={`${createTournamentStyles.generalTabContainer} ${styles.generalTabContainer}`}>
      <header>
          <h1>Review</h1>
      </header>

      <ReviewHeaderComponent
        title="Basic Info"
        isCompleted={isBasicInfoComplete()}
        editTabIndex={1}
        setSelectedTab={setSelectedTab}
      >
        <ReviewBasicInfo formData={formData} />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title="Format & Participants"
        isCompleted={isFormatParticipantsComplete()}
        editTabIndex={2}
        setSelectedTab={setSelectedTab}
      >
        <ReviewFormatParticipants formData={formData} />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title="Prize Distribution"
        isCompleted={isPrizeDistributionComplete()}
        editTabIndex={3}
        setSelectedTab={setSelectedTab}
      >
        <ReviewPrizeDistribution formData={formData} />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title="Sponsors & Links"
        isCompleted={isSponsorsLinksComplete()}
        editTabIndex={4}
        setSelectedTab={setSelectedTab}
      >
        <ReviewSponsorLinks formData={formData} />
      </ReviewHeaderComponent>

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

export default Review;