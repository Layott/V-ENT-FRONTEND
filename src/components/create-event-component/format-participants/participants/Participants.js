import { useState, useEffect } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import { FiInfo } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './participants.module.css';
import { useT } from '@/i18n/LanguageProvider';
const Participants = ({
  formData = {},
  updateFormData
}) => {
  const tt = useT();
  const [selectedOption, setSelectedOption] = useState(formData?.tournament_access || null);
  const [teamSizeOption, setTeamSizeOption] = useState(formData?.team_size || '');
  const [customTeamSize, setCustomTeamSize] = useState(formData?.custom_team_size || '');
  const [minIndividuals, setMinIndividuals] = useState(formData?.min_number_of_participants || '');
  const [maxIndividuals, setMaxIndividuals] = useState(formData?.max_number_of_participants || '');
  const [error, setError] = useState('');
  const validateEvenNumber = (value, fieldName, updateFormData) => {
    const parsedValue = parseInt(value, 10);
    if (isNaN(parsedValue) || parsedValue % 2 !== 0) {
      setError(tt("msg.pleaseEnterAnEvenNumber", "Please enter an even number."));
      updateFormData(fieldName, ''); // Reset invalid input
      return false;
    }
    setError('');
    return true;
  };
  const handleOptionClick = option => {
    setSelectedOption(option);
    updateFormData('tournament_access', option);
  };
  const handleTeamSizeChange = event => {
    const value = event.target.value;
    setTeamSizeOption(value);
    updateFormData('team_size', value !== 'custom' ? value : customTeamSize);
  };
  const handleCustomTeamSizeChange = event => {
    const value = event.target.value;
    setCustomTeamSize(value);
    updateFormData('custom_team_size', value);
    updateFormData('team_size', value);
  };
  const handleMinIndividualsChange = event => {
    const value = event.target.value;
    setMinIndividuals(value);
    updateFormData('min_number_of_participants', value);
  };
  const handleMaxIndividualsChange = event => {
    const value = event.target.value;
    setMaxIndividuals(value);
    updateFormData('max_number_of_participants', value);
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.participants.cd56", "Participants")}</h3>

        <p>{tt("ui.who.can.register.tournament.70f4", "Who can register for this tournament?")}</p>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          {['teams', 'individuals', 'both'].map(option => <div key={option} className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === option ? createTournamentStyles.activeBox : ''}`} onClick={() => handleOptionClick(option)}>
              <div className={`${createTournamentStyles.option} ${selectedOption === option ? createTournamentStyles.selected : ''}`}></div>
              <div className={createTournamentStyles.boxTextContainer}>
                <h4>{option.charAt(0).toUpperCase() + option.slice(1)}</h4>
                <p>{`Participants limited to ${option}.`}</p>
              </div>
            </div>)}
        </div>

        {['teams', 'both'].includes(selectedOption) && <div className={styles.howManyTeamsContainer}>
            <div className={styles.tournamentTitleContainer}>
              <label htmlFor="numberOfTeams" className={createTournamentStyles.labelWithAsterisk}>
                {tt("ui.how.many.teams.required.d02a", "How many teams are required?")}
                <span className={createTournamentStyles.asteriskSpan}>
                  <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </label>
              <input id="numberOfTeams" type="text" className={createTournamentStyles.inputText} placeholder={tt("ui.enter.number.teams.3cb8", "Enter number of teams")} onChange={e => {
            const value = e.target.value;
            if (value === '' || /^[0-9]+$/.test(value)) {
              updateFormData('number_of_teams', value); // Update value
            }
          }} onBlur={e => {
            validateEvenNumber(e.target.value, 'number_of_teams', updateFormData);
          }} />
              {error && <p className={styles.errorText}>{error}</p>} 

              <p className={styles.infoParagraph}>
                <span className={styles.infoSpan}>
                  <FiInfo className={styles.infoIcon} />
                </span>
                {tt("ui.must.even.number.single.5842", "This must be an even number for single elimination tournaments.")}
              </p>
            </div>

            <div className={`${createTournamentStyles.inputGroup} ${styles.inputGroup}`}>
              <label htmlFor="teamSizeOption" className={createTournamentStyles.labelWithAsterisk}>
                {tt("ui.how.many.players.team.fb4e", "How many players in a team are required?")}
                <span className={createTournamentStyles.asteriskSpan}>
                  <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </label>
              <select id="teamSizeOption" value={teamSizeOption} onChange={handleTeamSizeChange} className={createTournamentStyles.inputWithDropdown}>
                <option value="">{tt("ui.select.number.players.7801", "Select Number of Players")}</option>
                <option value="duo">{tt("ui.duo.players.15f8", "Duo (2 players)")}</option>
                <option value="trio">{tt("ui.trio.players.7ebc", "Trio (3 players)")}</option>
                <option value="quad">{tt("ui.quad.players.dc17", "Quad (4 players)")}</option>
                <option value="custom">{tt("ui.custom.081a", "Custom")}</option>
              </select>

              {teamSizeOption === 'custom' && <input id="customTeamSize" type="number" className={`${createTournamentStyles.inputText} ${styles.inputCustomNumber}`} placeholder={tt("ui.enter.number.players.1ad8", "Enter number of players")} value={customTeamSize} onChange={handleCustomTeamSizeChange} />}
            </div>
          </div>}

        {['individuals', 'both'].includes(selectedOption) && <div className={styles.minAndMaxNumberContainer}>
            <div className={createTournamentStyles.twoInputContainer}>
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="minNumber" className={createTournamentStyles.labelWithAsterisk}>
                  {tt("ui.min.number.individuals.d770", "Min Number of Individuals")}
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </label>
                <input id="minNumber" type="number" placeholder={tt("ui.enter.minimum.number.06ca", "Enter minimum number")} className={createTournamentStyles.inputNumber} value={minIndividuals} onChange={handleMinIndividualsChange} />
              </div>

              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="maxNumber" className={createTournamentStyles.labelWithAsterisk}>
                  {tt("ui.max.number.individuals.e3ae", "Max Number of Individuals")}
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </label>
                <input id="maxNumber" type="number" placeholder={tt("ui.enter.maximum.number.961a", "Enter maximum number")} className={createTournamentStyles.inputNumber} value={maxIndividuals} onChange={handleMaxIndividualsChange} />
                <p className={styles.infoParagraph}>
                  <span className={styles.infoSpan}>
                    <FiInfo className={styles.infoIcon} />
                  </span>
                  {tt("ui.maximum.number.individuals.allowed.175c", "The maximum number of individuals allowed is 64.")}
                </p>
              </div>
            </div>
            <p className={styles.infoParagraph}>
              <span className={styles.infoSpan}>
                <FiInfo className={styles.infoIcon} />
              </span>
              {tt("ui.minimum.maximum.must.even.087d", "Minimum and maximum must be even numbers for single elimination tournaments.")}
            </p>
          </div>}
      </div>
    </div>;
};
export default Participants;