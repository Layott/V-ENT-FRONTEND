import { useState, useEffect } from 'react';
import { FiInfo } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import tournamentTitleStyles from './../../basic-info/create-tournament-title/create-tournament-title.module.css';
import { useT } from '@/i18n/LanguageProvider';
const TournamentRules = ({
  formData = {},
  updateFormData
}) => {
  const tt = useT();
  const [description, setDescription] = useState(formData?.tournament_rules || '');

  // Update parent formData whenever description changes
  useEffect(() => {
    updateFormData('tournament_rules', description);
  }, [description, updateFormData]);
  const handleDescriptionChange = event => {
    const value = event.target.value;
    if (value.length <= 1000) {
      setDescription(value);
    }
  };
  return <div className={`${createTournamentStyles.createSubSectionContainer} ${tournamentTitleStyles.createSubSectionContainer}`}>
      <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.tournament.rules.df25", "Tournament Rules")}</h3>

      <div className={tournamentTitleStyles.tournamentDescriptionContainer}>
        <textarea id="tournament-rules" name="tournament_rules" value={description} onChange={handleDescriptionChange} placeholder={tt("ui.enter.tournament.rules.7ea0", "Enter the tournament rules...")} className={createTournamentStyles.inputText}></textarea>
        
        <p className={tournamentTitleStyles.infoParagraph}>
          <span className={tournamentTitleStyles.infoSpan}>
            <FiInfo className={tournamentTitleStyles.infoIcon} />
          </span>
          {tt("ui.max.characters.e348", "Max of 1,000 characters.")}
        </p>
      </div>

    </div>;
};
export default TournamentRules;