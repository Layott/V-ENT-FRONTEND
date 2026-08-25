import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import styles from './create-tournament-visibility.module.css'

const CreateTournamentVisibility = ({formData = {}, updateFormData}) => {
  const [selectedOption, setSelectedOption] = useState(formData.tournament_visibility || null);
  const [event, setEvent] = useState(formData.event || '');
  const [entryType, setEntryType] = useState(formData.entry_type || '');
  const [entryFee, setEntryFee] = useState(formData.entry_fee || '');

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    updateFormData('tournament_visibility', option );
  };



  const handleEntryTypeChange = (e) => {
    const selectedEntryType = e.target.value;
    setEntryType(selectedEntryType);
    updateFormData('entry_type', selectedEntryType);

    // Switching to Free drops any fee already typed, so a tournament cannot be
    // saved as free while carrying a price nobody sees.
    if (selectedEntryType !== 'Paid' && entryFee !== '') {
      setEntryFee('');
      updateFormData('entry_fee', '');
    }
  };

  const handleEntryFeeChange = (e) => {
    const fee = e.target.value;
    setEntryFee(fee);
    updateFormData('entry_fee', fee );
  };


  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Tournament Visibility</h3>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          
          <div
            className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'public' ? createTournamentStyles.activeBox : ''}`}
            onClick={() => handleOptionClick('public')}
          >
            <div
              className={`${createTournamentStyles.option} ${selectedOption === 'public' ? createTournamentStyles.selected : ''}`}
              onClick={() => handleOptionClick('public')}
            ></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>Public</h4>
              <p>Your tournament will be visible to everyone  on the  platform.</p>
            </div>
          </div>
          
          <div
            className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'private' ? createTournamentStyles.activeBox : ''}`}
            onClick={() => handleOptionClick('private')}
          >
            <div
              className={`${createTournamentStyles.option} ${selectedOption === 'private' ? createTournamentStyles.selected : ''}`}
              onClick={() => handleOptionClick('private')}
            ></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>Private</h4>
              <p>Your tournament will be hidden from the public and available to only users with a link.</p>
            </div>
          </div>

          <div
            className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'protected' ? createTournamentStyles.activeBox : ''}`}
            onClick={() => handleOptionClick('protected')}
          >
            <div
              className={`${createTournamentStyles.option} ${selectedOption === 'protected' ? createTournamentStyles.selected : ''}`}
              onClick={() => handleOptionClick('protected')}
            ></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>Protected</h4>
              <p>Your tournament will require a pin or code for users to register.</p>
            </div>
          </div>

        </div>

          {/* <div className={styles.outerQuestionContainer}>

            <div className={styles.eventContainer}>
                <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>Mode
                    <span className={createTournamentStyles.asteriskSpan}>
                        <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                    </span>
                </label>
                
                <select
                    // value={selectedEvent}
                    // onChange={handleEntryTypeChange}
                    className={createTournamentStyles.inputWithDropdown}
                >
                    <option value="">Select</option>
                    <option value="FREE FIRE">Free Fire</option>
                    <option value="PUBGM">PUBG</option>
                    <option value="CODM">CODM</option>
                    <option value="EAFC">EAFC</option>
                </select>
            </div>

          </div> */}


          <div className={createTournamentStyles.twoInputContainer}>
            <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>Entry Type
                    <span className={createTournamentStyles.asteriskSpan}>
                        <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                    </span>
                </label>
                
                <select
                    value={entryType}
                    onChange={handleEntryTypeChange}
                    className={createTournamentStyles.inputWithDropdown}
                >
                    <option value="">Select</option>
                    <option value="Paid">Paid</option>
                    <option value="Free">Free</option>
                </select>
            </div>


            {/* A free tournament has no fee, so asking for one invites a
                number that is then ignored. The field appears when Paid is
                chosen, and choosing Free clears whatever was typed. */}
            {entryType === 'Paid' && (
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="entry-fee">Entry Fee (VENT COINS)</label>
                <input
                  id="entry-fee"
                  type="number"
                  min="0"
                  placeholder="Enter amount"
                  value={entryFee}
                  className={createTournamentStyles.inputText}
                  onChange={handleEntryFeeChange}
                />
              </div>
            )}

        </div>
        
      </div>

    </div>
  )
}

export default CreateTournamentVisibility;