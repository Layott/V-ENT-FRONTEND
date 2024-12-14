import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-type.module.css';

const CreateTournamentType = () => {
  const [selectedOption, setSelectedOption] = useState(null);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
  };

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Tournament Type</h3>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          <div
            className={`${createTournamentStyles.oneThirdBoxContainer} ${
              selectedOption === 'virtual' ? createTournamentStyles.activeBox : ''
            }`}
          >
            <div
              className={`${createTournamentStyles.option} ${
                selectedOption === 'virtual' ? createTournamentStyles.selected : ''
              }`}
              onClick={() => handleOptionClick('virtual')}
            ></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>Virtual</h4>
              <p>Your tournament will be held only as a virtual tournament.</p>
            </div>
          </div>

          <div
            className={`${createTournamentStyles.oneThirdBoxContainer} ${
              selectedOption === 'physical' ? createTournamentStyles.activeBox : ''
            }`}
          >
            <div
              className={`${createTournamentStyles.option} ${
                selectedOption === 'physical' ? createTournamentStyles.selected : ''
              }`}
              onClick={() => handleOptionClick('physical')}
            ></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>Physical</h4>
              <p>Your tournament will be held as a physical event in a physical space.</p>
            </div>
          </div>

          <div
            className={`${createTournamentStyles.oneThirdBoxContainer} ${
              selectedOption === 'hybrid' ? createTournamentStyles.activeBox : ''
            }`}
          >
            <div
              className={`${createTournamentStyles.option} ${
                selectedOption === 'hybrid' ? createTournamentStyles.selected : ''
              }`}
              onClick={() => handleOptionClick('hybrid')}
            ></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>Hybrid</h4>
              <p>Your tournament will be both virtual and physical.</p>
            </div>
          </div>
        </div>

        <div className={styles.outerVenueVirtualLinkContainer}>
          <div className={createTournamentStyles.twoInputContainer}>
            {/* Virtual Link Input */}
            {selectedOption !== 'physical' && (
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="virtualLink">Virtual Link</label>
                <input
                  id="virtualLink"
                  type="text"
                  placeholder="Paste link here"
                  className={createTournamentStyles.inputText}
                />
              </div>
            )}

            {/* Venue Input */}
            {selectedOption !== 'virtual' && (
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="venue">Venue</label>
                <input
                  id="venue"
                  type="text"
                  placeholder="Enter physical location"
                  className={createTournamentStyles.inputText}
                />
              </div>
            )}
          </div>

          <div className={styles.hideLocationContainer}>
            <input type="checkbox" className={styles.hideCheckbox} />
            <label htmlFor="">Hide location</label>
          </div>

          <div className={styles.outerQuestionContainer}>
            <div className={styles.questionContainer}>
              <p>Is this tournament linked to an event?</p>

              <div className={styles.optionContainer}>
                <label className={styles.optionLabel}>
                  <input
                    type="radio"
                    name="linkedToEvent"
                    value="yes"
                    className={styles.optionInput}
                  />
                  Yes
                </label>

                <label className={styles.optionLabel}>
                  <input
                    type="radio"
                    name="linkedToEvent"
                    value="no"
                    className={styles.optionInput}
                  />
                  No
                </label>
              </div>
            </div>


            <div className={styles.eventContainer}>
              <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>
                Select Event
                <span className={createTournamentStyles.asteriskSpan}>
                  <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </label>

              <select className={createTournamentStyles.inputWithDropdown}>
                <option value="">Select Event</option>
                <option value="FREEFIRE">FREEFIRE</option>
                <option value="PUBGM">PUBGM</option>
                <option value="CODM">CODM</option>
                <option value="EAFC">EAFC</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTournamentType;
