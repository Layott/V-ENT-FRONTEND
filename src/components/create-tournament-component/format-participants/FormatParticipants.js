import { useState } from 'react';
import { IoMdArrowForward, IoMdArrowBack } from "react-icons/io";
import TournamentFormat from "./tournament-format/TournamentFormat";
import Participants from "./participants/Participants";
import TournamentRules from "./tournament-rules/TournamentRules";
import { validateFormatParticipants } from "../tournamentWizardValidation";
import ValidationSummary from "../validation-summary/ValidationSummary";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';

// formData/updateLocalStorage come straight from the parent
// CreateTournamentComponent's centralized state - this step deliberately
// does NOT keep its own copy loaded from localStorage. Doing so used to
// create a mount-order race: this component's own effect (loading
// localStorage into a stale-until-effect local state) ran after its
// children's effects, so leaf components (e.g. TournamentRules) would push
// blank values up before the "real" data ever finished loading, clobbering
// whatever was already saved.
const FormatParticipants = ({ setSelectedTab, formData = {}, updateLocalStorage, handleSubmit, isSavingDraft }) => {
  const [errors, setErrors] = useState({});

  const handleProceed = () => {
    const { isValid, errors: fieldErrors } = validateFormatParticipants(formData);
    setErrors(fieldErrors);
    if (!isValid) return;
    setSelectedTab((prevTab) => prevTab + 1);
  };

  const handleBack = () => {
    setSelectedTab((prevTab) => prevTab - 1);
  };

  const handleSaveDraft = () => {
    if (handleSubmit) handleSubmit(true);
  };

  return (
    <div>
      <div>
        <h2>Format & Participants</h2>
      </div>

      <ValidationSummary errors={errors} />

      <TournamentFormat
        formData={formData}
        updateFormData={updateLocalStorage}
      />

      <Participants
        formData={formData}
        updateFormData={updateLocalStorage}
      />

      <TournamentRules
        formData={formData}
        updateFormData={updateLocalStorage}
      />

      <div className={createTournamentStyles.buttonContainer}>
        <button
          className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`}
          onClick={handleSaveDraft}
          disabled={isSavingDraft}
        >
          {isSavingDraft ? 'Saving...' : 'Save Draft'}
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
            className={`${createTournamentStyles.btn} ${createTournamentStyles.proceedBTN}`}
            onClick={handleProceed}
          >
            Proceed
            <IoMdArrowForward className={createTournamentStyles.forwardArrowIcon} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormatParticipants;
