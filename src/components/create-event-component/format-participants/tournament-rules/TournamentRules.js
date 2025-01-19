import { useState, useEffect } from 'react';
import { FiInfo } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import tournamentTitleStyles from './../../basic-info/create-tournament-title/create-tournament-title.module.css';

const TournamentRules = ({ formData={}, updateFormData }) => {
  const [description, setDescription] = useState(formData?.tournament_rules|| '');

  // Update parent formData whenever description changes
  useEffect(() => {
    updateFormData('tournament_rules', description);
  }, [description, updateFormData]);

  const handleDescriptionChange = (event) => {
    const value = event.target.value;
    if (value.length <= 1000) {
      setDescription(value);
    }
  };

  return (
    <div className={`${createTournamentStyles.createSubSectionContainer} ${tournamentTitleStyles.createSubSectionContainer}`}>
      <h3 className={createTournamentStyles.tournamentTypeH3}>Tournament Rules</h3>

      <div className={tournamentTitleStyles.tournamentDescriptionContainer}>
        <textarea
          id="tournament-rules"
          name="tournament_rules"
          value={description}
          onChange={handleDescriptionChange}
          placeholder="Enter the tournament rules..."
          className={createTournamentStyles.inputText}
        ></textarea>
        
        <p className={tournamentTitleStyles.infoParagraph}>
          <span className={tournamentTitleStyles.infoSpan}>
            <FiInfo className={tournamentTitleStyles.infoIcon} />
          </span>
          Max of 1,000 characters.
        </p>
      </div>

    </div>
  );
};

export default TournamentRules;
