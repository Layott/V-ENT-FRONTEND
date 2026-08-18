import { useState } from 'react';
import { IoMdArrowForward, IoMdArrowBack } from "react-icons/io";
import Sponsor from "./sponsors/Sponsors";
import WebSocialLink from "./web-social-links/WebSocialLink";
import { validateSponsorsLinks } from "../tournamentWizardValidation";
import ValidationSummary from "../validation-summary/ValidationSummary";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';

const SponsorsLinks = ({ formData, setFormData, setSelectedTab, handleSubmit, isSavingDraft }) => {
  const [errors, setErrors] = useState({});

  // Function to handle form data updates and localStorage sync
  const updateFormData = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    try {
      localStorage.setItem('createTournamentData', JSON.stringify(updatedData));
    } catch {
      // Storage can fail (private mode, quota) - keep going in-memory.
    }
  };

  const handleProceed = () => {
    const { isValid, errors: fieldErrors } = validateSponsorsLinks(formData);
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
    <div className={createTournamentStyles.generalTabContainer}>
      <header>
        <h1>Sponsors & Links</h1>
      </header>

      <ValidationSummary errors={errors} />

      <Sponsor formData={formData} updateFormData={updateFormData} />

      <WebSocialLink formData={formData} updateFormData={updateFormData} />

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

export default SponsorsLinks;
