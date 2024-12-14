import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import { FiInfo } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import styles from './participants.module.css'

const Participants = () => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [teamSizeOption, setTeamSizeOption] = useState('');
  const [customTeamSize, setCustomTeamSize] = useState('');

  const handleOptionClick = (option) => {
    setSelectedOption(option);
  }

  const handleTeamSizeChange = (event) => {
    setTeamSizeOption(event.target.value);
    if (event.target.value !== 'custom') {
      setCustomTeamSize('');
    }
  }

  const handleCustomTeamSizeChange = (event) => {
    setCustomTeamSize(event.target.value);
  }

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Participants</h3>

        <p>Who can register for this tournament?</p>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          
          <div
            className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'teams' ? createTournamentStyles.activeBox : ''}`}
          >
            <div
              className={`${createTournamentStyles.option} ${selectedOption === 'teams' ? createTournamentStyles.selected : ''}`}
              onClick={() => handleOptionClick('teams')}
            ></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>Teams</h4>
              <p>Participants will only be limited to teams.</p>
            </div>
          </div>
          
          <div
            className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'individuals' ? createTournamentStyles.activeBox : ''}`}
          >
            <div
              className={`${createTournamentStyles.option} ${selectedOption === 'individuals' ? createTournamentStyles.selected : ''}`}
              onClick={() => handleOptionClick('individuals')}
            ></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>Individuals</h4>
              <p>Only individuals can participate in the tournament.</p>
            </div>
          </div>

          <div
            className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'both' ? createTournamentStyles.activeBox : ''}`}
          >
            <div
              className={`${createTournamentStyles.option} ${selectedOption === 'both' ? createTournamentStyles.selected : ''}`}
              onClick={() => handleOptionClick('both')}
            ></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>Both</h4>
              <p>Both team and  individuals can participate in the tournament.</p>
            </div>
          </div>

        </div>

        <div className={`${styles.howManyTeamsContainer} ${selectedOption === 'teams' || selectedOption === 'both' ? '' : styles.hidden}`}>
          <div className={styles.tournamentTitleContainer}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>How many teams are required?
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
            </label>
            <input
                type="number"
                className={createTournamentStyles.inputText}
                placeholder='Enter number of team'
            />

            <p className={styles.infoParagraph}>
                <span className={styles.infoSpan}>
                    <FiInfo className={styles.infoIcon} />
                </span>
                This must be an even number for single elimination tournaments.
            </p>
          </div>

          <div className={`${createTournamentStyles.inputGroup} ${styles.inputGroup}`}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>How many players in a team is required?
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
            </label>

          
            <select
                value={teamSizeOption}
                onChange={handleTeamSizeChange}
                className={createTournamentStyles.inputWithDropdown}
            >
                <option value="">Select Number of Players</option>
                <option value="duo">Duo (2 players)</option>
                <option value="trio">Trio (3 Players)</option>
                <option value="quad">Quad (4 Players)</option>
                <option value="custom">Custom</option>
            </select>

            {teamSizeOption === 'custom' && (
              <input
                type="number"
                className={`${createTournamentStyles.inputText} ${styles.inputCustomNumber}`}
                placeholder='Enter Number of Player'
                value={customTeamSize}
                onChange={handleCustomTeamSizeChange}
              />
        
            )}
          </div>

        </div>  

        <div className={`${styles.minAndMaxNumberContainer} ${selectedOption === 'individuals' || selectedOption === 'both' ? '' : styles.hidden}`}>
          <div className={createTournamentStyles.twoInputContainer}>
            <div className={createTournamentStyles.inputGroup}>
              <label htmlFor="minNumber" className={createTournamentStyles.labelWithAsterisk}>Min Number of Individuals
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </label>

              <input
                id="minNumber"
                type="number"
                placeholder="Enter Minimum Number"
                className={createTournamentStyles.inputNumber}
              />
            </div>

            <div className={createTournamentStyles.inputGroup}>
              <label htmlFor="maxNumber" className={createTournamentStyles.labelWithAsterisk}>Max Number of Individuals
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </label>

              <input
                id="maxNumber"
                type="number"
                placeholder="Enter Maximum Number"
                className={createTournamentStyles.inputNumber}
              />
                <p className={styles.infoParagraph}>
                  <span className={styles.infoSpan}>
                      <FiInfo className={styles.infoIcon} />
                  </span>
                  The maximum number of individuals allowed is 64.
                </p>
            </div>
          </div>
          <p className={styles.infoParagraph} style={{marginTop: '0.5rem'}}>
            <span className={styles.infoSpan}>
                <FiInfo className={styles.infoIcon} />
            </span>
            Minimum and maximum must be an even number for single elimination tournaments.
          </p>
        </div>

      </div>

    </div>
  )
}

export default Participants