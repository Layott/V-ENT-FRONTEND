import { useEffect, useState } from "react";
import { IoMdArrowForward } from "react-icons/io";
import CreateTournamentTitle from './create-tournament-title/CreateTournamentTitle';
import CreateTournamentType from './create-tournament-type/CreateTournamentType';
import CreateTournamentSchedule from './create-tournament-schedule/CreateTournamentSchedule';
import CreateTournamentVisibility from './create-tournament-visibility/CreateTournamentVisibility';
import CreateTournamentLogo from './create-tournament-logo/CreateTournamentLogo';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';

const BasicInfo = ({ setSelectedTab }) => {
  const [formData, setFormData] = useState({});

  // Load initial data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem('createTournamentData');
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  // Function to handle form data updates and localStorage sync
  const updateFormData = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    localStorage.setItem('createTournamentData', JSON.stringify(updatedData)); // Save to localStorage
  };

  const handleProceed = () => {
    setSelectedTab((prevTab) => prevTab + 1);
  };

  return (
    <div className={createTournamentStyles.generalTabContainer}>
      <header>
        <h1>Basic Info</h1>
      </header>

      <CreateTournamentTitle updateFormData={updateFormData} formData={formData} />
      <CreateTournamentType updateFormData={updateFormData} formData={formData} />
      <CreateTournamentSchedule updateFormData={updateFormData} formData={formData} />
      <CreateTournamentVisibility updateFormData={updateFormData} formData={formData} />
      <CreateTournamentLogo updateFormData={updateFormData} formData={formData} />

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
