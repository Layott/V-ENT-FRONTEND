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

  // Function to handle form data updates
  const handleFormDataUpdate = (field, value) => {
    // Update local state for immediate UI updates
    setFormData(prevData => ({
      ...prevData,
      [field]: value
    }));
    
    // Update parent component and localStorage through centralized function
    updateFormData(field, value);
  };

  const handleProceed = () => {
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