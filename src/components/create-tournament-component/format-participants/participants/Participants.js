import { useState, useEffect } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import { FiInfo } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './participants.module.css';

const Participants = ({ formData, updateFormData }) => {
  const [selectedOption, setSelectedOption] = useState(formData?.selectedOption || null);
  const [teamSizeOption, setTeamSizeOption] = useState(formData?.teamSizeOption || '');
  const [customTeamSize, setCustomTeamSize] = useState(formData?.customTeamSize || '');
  const [minIndividuals, setMinIndividuals] = useState(formData?.minIndividuals || '');
  const [maxIndividuals, setMaxIndividuals] = useState(formData?.maxIndividuals || '');

  // Synchronize local state with formData
  useEffect(() => {
    updateFormData({...formData,
      selectedOption,
      teamSizeOption,
      customTeamSize,
      minIndividuals,
      maxIndividuals,
    });
  }, [selectedOption, teamSizeOption, customTeamSize, minIndividuals, maxIndividuals]);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
  };

  const handleTeamSizeChange = (event) => {
    const value = event.target.value;
    setTeamSizeOption(value);
    if (value !== 'custom') {
      setCustomTeamSize('');
    }
  };

  const handleCustomTeamSizeChange = (event) => {
    setCustomTeamSize(event.target.value);
  };

  const handleMinIndividualsChange = (event) => {
    setMinIndividuals(event.target.value);
  };

  const handleMaxIndividualsChange = (event) => {
    setMaxIndividuals(event.target.value);
  };

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Participants</h3>

        <p>Who can register for this tournament?</p>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          {['teams', 'individuals', 'both'].map((option) => (
            <div
              key={option}
              className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === option ? createTournamentStyles.activeBox : ''}`}
              onClick={() => handleOptionClick(option)}
            >
              <div
                className={`${createTournamentStyles.option} ${selectedOption === option ? createTournamentStyles.selected : ''}`}
              ></div>
              <div className={createTournamentStyles.boxTextContainer}>
                <h4>{option.charAt(0).toUpperCase() + option.slice(1)}</h4>
                <p>{`Participants limited to ${option}.`}</p>
              </div>
            </div>
          ))}
        </div>

        {['teams', 'both'].includes(selectedOption) && (
          <div className={styles.howManyTeamsContainer}>
            <div className={styles.tournamentTitleContainer}>
              <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>
                How many teams are required?
                <span className={createTournamentStyles.asteriskSpan}>
                  <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </label>
              <input
                id="numberOfTeams"
                type="number"
                className={createTournamentStyles.inputText}
                placeholder="Enter number of teams"
              />

              <p className={styles.infoParagraph}>
                <span className={styles.infoSpan}>
                  <FiInfo className={styles.infoIcon} />
                </span>
                This must be an even number for single elimination tournaments.
              </p>
            </div>

            <div className={`${createTournamentStyles.inputGroup} ${styles.inputGroup}`}>
              <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>
                How many players in a team are required?
                <span className={createTournamentStyles.asteriskSpan}>
                  <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </label>
              <select
                id = {teamSizeOption}
                value={teamSizeOption}
                onChange={handleTeamSizeChange}
                className={createTournamentStyles.inputWithDropdown}
              >
                <option value="">Select Number of Players</option>
                <option value="duo">Duo (2 players)</option>
                <option value="trio">Trio (3 players)</option>
                <option value="quad">Quad (4 players)</option>
                <option value="custom">Custom</option>
              </select>

              {teamSizeOption === 'custom' && (
                <input
                  id = "customTeamSize"
                  type="number"
                  className={`${createTournamentStyles.inputText} ${styles.inputCustomNumber}`}
                  placeholder="Enter number of players"
                  value={customTeamSize}
                  onChange={handleCustomTeamSizeChange}
                />
              )}
            </div>
          </div>
        )}

        {['individuals', 'both'].includes(selectedOption) && (
          <div className={styles.minAndMaxNumberContainer}>
            <div className={createTournamentStyles.twoInputContainer}>
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="minNumber" className={createTournamentStyles.labelWithAsterisk}>
                  Min Number of Individuals
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </label>
                <input
                  id="minNumber"
                  type="number"
                  placeholder="Enter minimum number"
                  className={createTournamentStyles.inputNumber}
                  value={minIndividuals}
                  onChange={handleMinIndividualsChange}
                />
              </div>

              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="maxNumber" className={createTournamentStyles.labelWithAsterisk}>
                  Max Number of Individuals
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </label>
                <input
                  id="maxNumber"
                  type="number"
                  placeholder="Enter maximum number"
                  className={createTournamentStyles.inputNumber}
                  value={maxIndividuals}
                  onChange={handleMaxIndividualsChange}
                />
                <p className={styles.infoParagraph}>
                  <span className={styles.infoSpan}>
                    <FiInfo className={styles.infoIcon} />
                  </span>
                  The maximum number of individuals allowed is 64.
                </p>
              </div>
            </div>
            <p className={styles.infoParagraph} style={{ marginTop: '0.5rem' }}>
              <span className={styles.infoSpan}>
                <FiInfo className={styles.infoIcon} />
              </span>
              Minimum and maximum must be an even number for single elimination tournaments.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Participants;
