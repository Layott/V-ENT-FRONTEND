import { useEffect, useState } from "react";
import { IoMdArrowForward } from "react-icons/io";
import CreateTournamentTitle from './create-tournament-title/CreateTournamentTitle';
import CreateTournamentType from './create-tournament-type/CreateTournamentType';
import CreateTournamentSchedule from './create-tournament-schedule/CreateTournamentSchedule';
import CreateTournamentVisibility from './create-tournament-visibility/CreateTournamentVisibility';
import CreateTournamentLogo from './create-tournament-logo/CreateTournamentLogo';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';

const BasicInfo = ({ setSelectedTab, updateFormData, updateFileData }) => {
  const [formData, setFormData] = useState({});

  // Load initial data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('createTournamentData');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(parsedData);
        console.log('BasicInfo - Loaded data from localStorage:', parsedData);
      } catch (error) {
        console.error('BasicInfo - Error parsing localStorage data:', error);
      }
    }
  }, []);

  // Function to validate if all required fields are filled
  const isFormValid = () => {
    // Define required fields - FIXED to match actual field names from components
    const requiredFields = [
      'tournament_title',        // from CreateTournamentTitle
      'game',                    // from CreateTournamentTitle  
      'game_mode',               // from CreateTournamentTitle
      'tournament_description',  // from CreateTournamentTitle
      'tournament_type',         // from CreateTournamentType
      'start_date_and_time',     // from CreateTournamentSchedule
      'end_date_and_time',       // from CreateTournamentSchedule
      'reg_start_date_and_time', // from CreateTournamentSchedule
      'reg_end_date_and_time',   // from CreateTournamentSchedule
      'scheduleType',            // from CreateTournamentSchedule
      'tournament_visibility',   // from CreateTournamentVisibility
      'entry_type'               // from CreateTournamentVisibility
    ];
    
    // Debug: Log current form data and validation results
    console.log('=== FORM VALIDATION DEBUG ===');
    console.log('Current formData:', formData);
    console.log('Required fields:', requiredFields);
    
    const validationResults = requiredFields.map(field => {
      const value = formData[field];
      const isValid = value && value.toString().trim() !== '';
      console.log(`Field "${field}":`, {
        exists: field in formData,
        value: value,
        type: typeof value,
        isValid: isValid
      });
      return isValid;
    });
    
    const allValid = validationResults.every(result => result);
    console.log('All fields valid:', allValid);
    console.log('============================');
    
    return allValid;
  };

  // Function to handle form data updates
  const handleFormDataUpdate = (field, value) => {
    console.log(`Updating field "${field}" with value:`, value);
    
    // Update local state for immediate UI updates
    setFormData(prevData => {
      const newData = {
        ...prevData,
        [field]: value
      };
      console.log('New formData after update:', newData);
      return newData;
    });
    
    // Update parent component and localStorage through centralized function
    updateFormData(field, value);
  };

  const handleProceed = () => {
    if (!isFormValid()) {
      // Show which fields are missing
      const requiredFields = [
        'tournamentTitle',
        'tournamentType', 
        'startDate',
        'endDate',
        'visibility'
      ];
      
      const missingFields = requiredFields.filter(field => 
        !formData[field] || formData[field].toString().trim() === ''
      );
      
      alert(`Please fill in all required fields before proceeding.\nMissing fields: ${missingFields.join(', ')}`);
      return;
    }
    setSelectedTab((prevTab) => prevTab + 1);
  };

  const handleSaveDraft = () => {
    // Data is already saved through updateFormData, just show confirmation
    alert('Draft saved');
  };

  return (
    <div>
      {/* Basic Info Header */}
      <div>
        <h2>Basic Info</h2>
      </div>

      {/* Debug Info - Remove this after fixing */}
      

      {/* Form Components */}
      <CreateTournamentTitle 
        formData={formData} 
        updateFormData={handleFormDataUpdate} 
      />
      <CreateTournamentType 
        formData={formData} 
        updateFormData={handleFormDataUpdate} 
      />
      <CreateTournamentSchedule 
        formData={formData} 
        updateFormData={handleFormDataUpdate} 
      />
      <CreateTournamentVisibility 
        formData={formData} 
        updateFormData={handleFormDataUpdate} 
      />
      <CreateTournamentLogo 
        formData={formData} 
        updateFormData={handleFormDataUpdate}
        updateFileData={updateFileData}
      />

      {/* Action Buttons */}
      <div className={createTournamentStyles.buttonContainer}>
        <button
          className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`}
          onClick={() => alert('Draft saved')}
        >
          Save Draft
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
  );
};

export default BasicInfo;