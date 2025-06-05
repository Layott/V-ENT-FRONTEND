import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-type.module.css';

const CreateTournamentType = ({ formData={}, updateFormData }) => {
  const [selectedOption, setSelectedOption] = useState(formData?.tournament_type || null);
  const [isLinkedToEvent, setIsLinkedToEvent] = useState(true);
  const [hideLocation, setHideLocation] = useState(false);

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    updateFormData('tournament_type', option);
  };
  
  const handleHideLocationChange = (event) => {
    setHideLocation(event.target.checked);
    if (event.target.checked) {
      updateFormData('hide_location', 'true');
    }else {
      updateFormData('hide_location', 'false');}
  };

  const handleEventLinkChange = (value) => {
    setIsLinkedToEvent(value === 'yes');
  };

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Tournament Type</h3>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          {['virtual', 'physical', 'hybrid'].map((option) => (
            <div
              key={option}
              className={`${createTournamentStyles.oneThirdBoxContainer} ${
                selectedOption === option ? createTournamentStyles.activeBox : ''
              }`}
              onClick={() => handleOptionClick(option)}
            >
              <div
                className={`${createTournamentStyles.option} ${
                  selectedOption === option ? createTournamentStyles.selected : ''
                }`}
              ></div>
              <div className={createTournamentStyles.boxTextContainer}>
                <h4>{option.charAt(0).toUpperCase() + option.slice(1)}</h4>
                <p>
                  {option === 'virtual'
                    ? 'Your tournament will be held only as a virtual tournament.'
                    : option === 'physical'
                    ? 'Your tournament will be held as a physical event in a physical space.'
                    : 'Your tournament will be both virtual and physical.'}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.outerVenueVirtualLinkContainer}>
          <div className={createTournamentStyles.twoInputContainer}>
            {selectedOption !== 'physical' && (
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="virtualLink">Virtual Link</label>
                <input
                  id="virtualLink"
                  type="text"
                  placeholder="Paste link here"
                  className={createTournamentStyles.inputText}
                  onChange={(e) => updateFormData('virtual_link', e.target.value)}
                  disabled={hideLocation}
                />
              </div>
            )}

            {selectedOption !== 'virtual' && (
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="venue">Venue</label>
                <input
                  id="venue"
                  type="text"
                  placeholder="Enter physical location"
                  className={createTournamentStyles.inputText}
                  onChange={(e) => updateFormData('tournament_location', e.target.value)}
                  disabled={hideLocation}
                />
              </div>
            )}
          </div>

          <div className={styles.hideLocationContainer}>
            <input
              type="checkbox"
              className={styles.hideCheckbox}
              checked={hideLocation}
              onChange={handleHideLocationChange}
            />
            <label>Hide location</label>
          </div>

          <div className={styles.outerQuestionContainer}>
            <div className={styles.questionContainer}>
              <p>Is this tournament linked to an event?</p>

              <div className={styles.optionContainer}>
                {['yes', 'no'].map((value) => (
                  <label key={value} className={styles.optionLabel}>
                    <input
                      type="radio"
                      name="linkedToEvent"
                      value={value}
                      className={styles.optionInput}
                      checked={isLinkedToEvent === (value === 'yes')}
                      onChange={() => handleEventLinkChange(value)}
                    />
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </label>
                ))}
              </div>
            </div>

            {isLinkedToEvent && (
              <div className={styles.eventContainer}>
                <label htmlFor="selectEvent" className={createTournamentStyles.labelWithAsterisk}>
                  Select Event
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </label>
                <select
                  id="selectEvent"
                  className={createTournamentStyles.inputWithDropdown}
                  onChange={(e) => updateFormData('event', e.target.value)}
                >
                  <option value="">Select Event</option>
                  <option value="FREEFIRE">Free Fire</option>
                  <option value="PUBGM">PUBG</option>
                  <option value="CODM">CODM</option>
                  <option value="EAFC">EAFC</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTournamentType;
