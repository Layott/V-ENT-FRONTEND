import { useState, useEffect } from 'react';
import { IoMdArrowForward, IoMdArrowBack } from "react-icons/io";
import PrizeDistributionInside from "./prize-distribution-inside/PrizeDistributionInside";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';

const PrizeDistribution = ({ setSelectedTab }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    const savedData = localStorage.getItem('createTournamentData');
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  const updateFormData = (key, value) => {
    const savedData = JSON.parse(localStorage.getItem('createTournamentData')) || {};
    savedData[key] = value;
    localStorage.setItem('createTournamentData', JSON.stringify(savedData));
  };

  const handleProceed = () => {
    setSelectedTab((prevTab) => prevTab + 1);
  };

  const handleBack = () => {
    setSelectedTab((prevTab) => prevTab - 1);
  };

  return (
    <div className={createTournamentStyles.generalTabContainer}>
      <header className={createTournamentStyles.createTournamentHeader}>
        <h1>Prize Distribution</h1>
      </header>

      <PrizeDistributionInside updateFormData={updateFormData} />

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

export default PrizeDistribution;
