import { useEffect } from 'react';
import { IoMdArrowForward, IoMdArrowBack } from "react-icons/io";
import TournamentFormat from "./tournament-format/TournamentFormat";
import Participants from "./participants/Participants";
import TournamentRules from "./tournament-rules/TournamentRules";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import { useT } from '@/i18n/LanguageProvider';
const FormatParticipants = ({
  formData,
  setFormData,
  setSelectedTab
}) => {
  const tt = useT();
  // Load initial data from localStorage only if formData is empty
  useEffect(() => {
    const savedData = localStorage.getItem('createTournamentData');
    if (savedData && Object.keys(formData).length === 0) {
      setFormData(JSON.parse(savedData));
    }
  }, [formData, setFormData]);
  const updateFormData = (key, value) => {
    // Update the centralized formData state
    const updatedData = {
      ...formData,
      [key]: value
    };
    setFormData(updatedData);

    // Also save to localStorage for persistence
    localStorage.setItem('createTournamentData', JSON.stringify(updatedData));
  };
  const handleProceed = () => {
    setSelectedTab(prevTab => prevTab + 1);
  };
  const handleBack = () => {
    setSelectedTab(prevTab => prevTab - 1);
  };
  return <div className={createTournamentStyles.generalTabContainer}>
      <header className={createTournamentStyles.createTournamentHeader}>
        <h1>{tt("ui.format.participants.9427", "Format & Participants")}</h1>
      </header>

      <TournamentFormat updateFormData={updateFormData} formData={formData} />

      <Participants updateFormData={updateFormData} formData={formData} />

      <TournamentRules updateFormData={updateFormData} formData={formData} />

      <div className={createTournamentStyles.buttonContainer}>
        <button className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`} onClick={() => alert('Draft saved')}>
          {tt("ui.save.draft.cc13", "Save Draft")}
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
export default FormatParticipants;