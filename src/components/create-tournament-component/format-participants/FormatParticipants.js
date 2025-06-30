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

  // Function to validate if all required fields are filled
  const isFormValid = () => {
    console.log('Current formData for validation:', formData);
    
    // Check bracket type is selected
    if (!formData.bracket_type) {
      console.log('Missing bracket_type');
      return false;
    }

    // Check tournament access is selected
    if (!formData.tournament_access) {
      console.log('Missing tournament_access');
      return false;
    }

    // Check tournament rules
    if (!formData.tournament_rules || formData.tournament_rules.trim() === '') {
      console.log('Missing tournament_rules');
      return false;
    }

    // Additional validation based on tournament access type
    if (formData.tournament_access === 'teams' || formData.tournament_access === 'both') {
      // Check team-specific fields
      if (!formData.number_of_teams || formData.number_of_teams === '') {
        console.log('Missing number_of_teams');
        return false;
      }
      if (!formData.team_size || formData.team_size === '') {
        console.log('Missing team_size');
        return false;
      }
    }

    if (formData.tournament_access === 'individuals' || formData.tournament_access === 'both') {
      // Check individual-specific fields
      if (!formData.min_number_of_participants || formData.min_number_of_participants === '') {
        console.log('Missing min_number_of_participants');
        return false;
      }
      if (!formData.max_number_of_participants || formData.max_number_of_participants === '') {
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
    if (!isFormValid()) {
      alert('Please fill in all required fields before proceeding.');
      return;
    }
    // Force save current state before proceeding
    localStorage.setItem('createTournamentData', JSON.stringify(formData));
    setSelectedTab((prevTab) => prevTab + 1);
  };

  const handleBack = () => {
    setSelectedTab((prevTab) => prevTab - 1);
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