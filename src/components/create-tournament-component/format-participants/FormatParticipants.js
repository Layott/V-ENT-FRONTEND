import { useState, useEffect } from 'react';
import { IoMdArrowForward, IoMdArrowBack } from "react-icons/io";
import TournamentFormat from "./tournament-format/TournamentFormat";
import Participants from "./participants/Participants";
import TournamentRules from "./tournament-rules/TournamentRules";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';

const FormatParticipants = ({ setSelectedTab, updateLocalStorage }) => {
  const [formData, setFormData] = useState({});
  
  useEffect(() => {
    const savedData = localStorage.getItem('createTournamentData');
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  const updateFormData = (key, value) => {
    console.log(`FormatParticipants - Updating ${key}:`, value);
    
    // Update local state
    const updatedData = { ...formData, [key]: value };
    setFormData(updatedData);
    
    // Update localStorage using centralized function
    if (updateLocalStorage) {
      updateLocalStorage(key, value);
    }
  };

  const handleProceed = () => {
    // Force save current state before proceeding
    localStorage.setItem('createTournamentData', JSON.stringify(formData));
    setSelectedTab((prevTab) => prevTab + 1);
  };

  const handleBack = () => {
    setSelectedTab((prevTab) => prevTab - 1);
  };

  return (
    <div className={createTournamentStyles.generalTabContainer}>
      <header className={createTournamentStyles.createTournamentHeader}>
        <h1>Format & Participants</h1>
      </header>

      <TournamentFormat updateFormData={updateFormData} />
      <Participants updateFormData={updateFormData} />
      <TournamentRules updateFormData={updateFormData} />

      <div className={createTournamentStyles.buttonContainer}>
        <button
          className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`}
          onClick={() => {
            localStorage.setItem('createTournamentData', JSON.stringify(formData));
            alert('Draft saved');
          }}
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