import { useEffect } from 'react';
import { IoMdArrowForward, IoMdArrowBack } from "react-icons/io";
import Sponsor from "./sponsors/Sponsors";
import WebSocialLink from "./web-social-links/WebSocialLink";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';

const SponsorsLinks = ({ formData, setFormData, setSelectedTab }) => {
  // Load initial data from localStorage only if formData is empty
  useEffect(() => {
    const savedData = localStorage.getItem('createTournamentData');
    if (savedData && Object.keys(formData).length === 0) {
      setFormData(JSON.parse(savedData));
    }
  }, [formData, setFormData]);

  // Function to handle form data updates and localStorage sync
  const updateFormData = (field, value) => {
    const updatedData = { ...formData, [field]: value };
    setFormData(updatedData);
    localStorage.setItem('createTournamentData', JSON.stringify(updatedData));
  };

  const handleProceed = () => {
    setSelectedTab((prevTab) => prevTab + 1);
  };

  const handleBack = () => {
    setSelectedTab((prevTab) => prevTab - 1);
  };

  return (
    <div className={createTournamentStyles.generalTabContainer}>
      <header>
        <h1>Sponsors & Links</h1>
      </header>

      <Sponsor formData={formData} updateFormData={updateFormData} />

      <WebSocialLink formData={formData} updateFormData={updateFormData} />

      <div className={createTournamentStyles.buttonContainer}>
        <button
          className={`${createTournamentStyles.btn} ${createTournamentStyles.saveDraftBTN}`}
          onClick={() => alert('Draft saved')}
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

export default SponsorsLinks;