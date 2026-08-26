'use client';

import { useT } from '@/i18n/LanguageProvider';
import { useLanguage } from '@/i18n/LanguageProvider';
import { IoMdArrowBack } from "react-icons/io";
import ReviewHeaderComponent from "@/components/create-tournament-component/review/review-header-component/ReviewHeaderComponent";
import ReviewBasicInfo from "@/components/create-tournament-component/review/review-basic-info/ReviewBasicInfo";
import ReviewFormatParticipants from "@/components/create-tournament-component/review/review-format-participants/ReviewFormatParticipants";
import ReviewPrizeDistribution from "@/components/create-tournament-component/review/review-prize-distribution/ReviewPrizeDistribution";
import ReviewSponsorLinks from "./review-sponsor-links/ReviewSponsorLinks";
import {
  validateBasicInfo,
  validateFormatParticipants,
  validatePrizeDistribution,
  validateSponsorsLinks,
  validateAll,
} from "../tournamentWizardValidation";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import styles from './review.module.css'

// Uses the parent's live formData prop directly - same reasoning as
// FormatParticipants.js/PrizeDistribution.js: keeping a separate
// localStorage-loaded copy here caused this step's completion badges to
// flash "incomplete" on mount (stale until its own effect fired) instead of
// reflecting the always-current parent state immediately.
const Review = ({ formData = {}, setSelectedTab, handleSubmit, isSavingDraft, isPublishing }) => {
  const tt = useT();
  const { t } = useLanguage();
  const basicInfoResult = validateBasicInfo(formData);
  const formatParticipantsResult = validateFormatParticipants(formData);
  const prizeDistributionResult = validatePrizeDistribution(formData);
  const sponsorsLinksResult = validateSponsorsLinks(formData);
  const { isValid: allValid, stepErrors } = validateAll(formData);

  const handleBack = () => {
    setSelectedTab((prevTab) => prevTab - 1);
  };

  return (
    <div className={`${createTournamentStyles.generalTabContainer} ${styles.generalTabContainer}`}>
      <header>
        <h2>{t("review.heading", "Review")}</h2>
      </header>

      <ReviewHeaderComponent
        title={t("review.step.basic", "Basic info")}
        isCompleted={basicInfoResult.isValid}
        editTabIndex={1}
        setSelectedTab={setSelectedTab}
      >
        <ReviewBasicInfo formData={formData} />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title={t("review.step.format", "Format and participants")}
        isCompleted={formatParticipantsResult.isValid}
        editTabIndex={2}
        setSelectedTab={setSelectedTab}
      >
        <ReviewFormatParticipants formData={formData} />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title={t("review.step.prize", "Prize distribution")}
        isCompleted={prizeDistributionResult.isValid}
        editTabIndex={3}
        setSelectedTab={setSelectedTab}
      >
        <ReviewPrizeDistribution formData={formData} />
      </ReviewHeaderComponent>

      <ReviewHeaderComponent
        title={t("review.step.sponsors", "Sponsors and links")}
        isCompleted={sponsorsLinksResult.isValid}
        editTabIndex={4}
        setSelectedTab={setSelectedTab}
      >
        <ReviewSponsorLinks formData={formData} />
      </ReviewHeaderComponent>

      {!allValid && (
        <div className={styles.errorMessage} role="alert">
          <p>{t("review.fixFirst", "Fix these before publishing:")}</p>
          <ul>
            {Object.entries(stepErrors).map(([step, stepInfo]) => (
              <li key={step}>
                <button
                  type="button"
                  onClick={() => setSelectedTab(Number(step))}
                  className={styles.jumpToStepBTN}
                >
                  {stepInfo.label}
                </button>
                : {Object.values(stepInfo.errors)[0]}
              </li>
            ))}
          </ul>
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
            {tt("review.back", "Back")}
          </button>

          <button
            className={`${createTournamentStyles.btn} ${createTournamentStyles.publishBTN}`}
            onClick={() => handleSubmit(false)} // Pass false for publish
            disabled={isSavingDraft || isPublishing || !allValid}
            title={!allValid ? 'Fix the errors above before publishing' : undefined}
          >
            {isPublishing  ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Review;
