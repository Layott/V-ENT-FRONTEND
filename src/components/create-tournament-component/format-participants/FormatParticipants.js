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

  // Function to get the most current form data
  const getCurrentFormData = () => {
    const savedData = localStorage.getItem('createTournamentData');
    return savedData ? JSON.parse(savedData) : formData;
  };

  // Function to validate if all required fields are filled
  const isFormValid = (dataToValidate = null) => {
    const currentData = dataToValidate || getCurrentFormData();
    console.log('Current formData for validation:', currentData);
    
    // Check bracket type is selected
    if (!currentData.bracket_type) {
      console.log('Missing bracket_type');
      return false;
    }

    // Check tournament access is selected
    if (!currentData.tournament_access) {
      console.log('Missing tournament_access');
      return false;
    }

    // Check tournament rules
    if (!currentData.tournament_rules || currentData.tournament_rules.trim() === '') {
      console.log('Missing tournament_rules');
      return false;
    }

    // Additional validation based on tournament access type
    if (currentData.tournament_access === 'teams' || currentData.tournament_access === 'both') {
      // Check team-specific fields
      if (!currentData.team_size || currentData.team_size === '') {
        console.log('Missing team_size');
        return false;
      }
    }

    if (currentData.tournament_access === 'individuals' || currentData.tournament_access === 'both') {
      // Check individual-specific fields
      if (!currentData.min_number_of_participants || currentData.min_number_of_participants === '') {
        console.log('Missing min_number_of_participants');
        return false;
      }
      if (!currentData.max_number_of_participants || currentData.max_number_of_participants === '') {
        console.log('Missing max_number_of_participants');
        return false;
      }
    }

    console.log('Form validation passed');
    return true;
  };

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
    // Get the most current data from localStorage
    const currentData = getCurrentFormData();
    
    // Sync local state with current data
    setFormData(currentData);
    
    if (!isFormValid(currentData)) {
      alert('Please fill in all required fields before proceeding.');
      return;
    }
    
    setSelectedTab((prevTab) => prevTab + 1);
  };

  const handleBack = () => {
    setSelectedTab((prevTab) => prevTab - 1);
  };

  const handleSaveDraft = () => {
    const currentData = getCurrentFormData();
    localStorage.setItem('createTournamentData', JSON.stringify(currentData));
    alert('Draft saved');
  };

  return (
    <div>
      <div>
        <h2>Format & Participants</h2>
      </div>
      
      <TournamentFormat 
        formData={formData} 
        updateFormData={updateFormData} 
      />
      
      <Participants 
        formData={formData} 
        updateFormData={updateFormData} 
      />
      
      <TournamentRules 
        formData={formData} 
        updateFormData={updateFormData} 
      />
      
      <div className={createTournamentStyles.buttonContainer}>
        <button
          className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`}
          onClick={handleSaveDraft}
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