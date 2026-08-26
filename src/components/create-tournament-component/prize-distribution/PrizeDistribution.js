import { useState } from 'react';
import { IoMdArrowForward, IoMdArrowBack } from "react-icons/io";
import PrizeDistributionInside from "./prize-distribution-inside/PrizeDistributionInside";
import { validatePrizeDistribution } from "../tournamentWizardValidation";
import ValidationSummary from "../validation-summary/ValidationSummary";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Uses the parent's live formData/updateLocalStorage directly (see the note
// in FormatParticipants.js for why this step no longer keeps its own
// localStorage-loaded copy).
const PrizeDistribution = ({
  setSelectedTab,
  formData = {},
  updateLocalStorage,
  handleSubmit,
  isSavingDraft
}) => {
  const tx = useTx();
  const tt = useT();
  const [errors, setErrors] = useState({});
  const handleProceed = () => {
    const {
      isValid,
      errors: fieldErrors
    } = validatePrizeDistribution(formData);
    setErrors(fieldErrors);
    if (!isValid) return;
    setSelectedTab(prevTab => prevTab + 1);
  };
  const handleBack = () => {
    setSelectedTab(prevTab => prevTab - 1);
  };
  const handleSaveDraft = () => {
    if (handleSubmit) handleSubmit(true);
  };
  return <div className={createTournamentStyles.generalTabContainer}>
      <header className={createTournamentStyles.createTournamentHeader}>
        <h2>{tt("ui.prize.distribution.700b", "Prize Distribution")}</h2>
      </header>

      <ValidationSummary errors={errors} />

      <PrizeDistributionInside formData={formData} updateFormData={updateLocalStorage} />

      <div className={createTournamentStyles.buttonContainer}>
        <button className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`} onClick={handleSaveDraft} disabled={isSavingDraft}>
          {isSavingDraft ? tx("Saving...") : tx("Save Draft")}
        </button>

        <div className={createTournamentStyles.backAndProceedContainer}>
          <button className={`${createTournamentStyles.btn} ${createTournamentStyles.backBTN}`} onClick={handleBack}>
            <IoMdArrowBack className={createTournamentStyles.backArrowIcon} />
            {tt("ui.back.b52b", "Back")}
          </button>

          <button className={`${createTournamentStyles.btn} ${createTournamentStyles.proceedBTN}`} onClick={handleProceed}>
            {tt("ui.proceed.02ed", "Proceed")}
            <IoMdArrowForward className={createTournamentStyles.forwardArrowIcon} />
          </button>
        </div>
      </div>
    </div>;
};
export default PrizeDistribution;