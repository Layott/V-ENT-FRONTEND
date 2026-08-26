'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-visibility.module.css';
import { useT } from '@/i18n/LanguageProvider';
const CreateTournamentVisibility = ({
  formData = {},
  updateFormData
}) => {
  const tt = useT();
  const [selectedOption, setSelectedOption] = useState(formData.tournament_visibility || null);
  const [event, setEvent] = useState(formData.event || '');
  const [entryType, setEntryType] = useState(formData.entry_type || '');
  const [entryFee, setEntryFee] = useState(formData.entry_fee || '');
  const handleOptionClick = option => {
    setSelectedOption(option);
    updateFormData('tournament_visibility', option);
  };
  const handleEntryTypeChange = e => {
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
  const handleEntryFeeChange = e => {
    const fee = e.target.value;
    setEntryFee(fee);
    updateFormData('entry_fee', fee);
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.tournament.visibility.c792", "Tournament Visibility")}</h3>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          
          <div className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'public' ? createTournamentStyles.activeBox : ''}`} onClick={() => handleOptionClick('public')}>
            <div className={`${createTournamentStyles.option} ${selectedOption === 'public' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('public')}></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>{tt("ui.public.dc5e", "Public")}</h4>
              <p>{tt("ui.tournament.will.visible.everyone.2a46", "Your tournament will be visible to everyone  on the  platform.")}</p>
            </div>
          </div>
          
          <div className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'private' ? createTournamentStyles.activeBox : ''}`} onClick={() => handleOptionClick('private')}>
            <div className={`${createTournamentStyles.option} ${selectedOption === 'private' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('private')}></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>{tt("ui.private.237d", "Private")}</h4>
              <p>{tt("ui.tournament.will.hidden.from.05da", "Your tournament will be hidden from the public and available to only users with a link.")}</p>
            </div>
          </div>

          <div className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'protected' ? createTournamentStyles.activeBox : ''}`} onClick={() => handleOptionClick('protected')}>
            <div className={`${createTournamentStyles.option} ${selectedOption === 'protected' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('protected')}></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>{tt("ui.protected.2853", "Protected")}</h4>
              <p>{tt("ui.tournament.will.require.pin.6a12", "Your tournament will require a pin or code for users to register.")}</p>
            </div>
          </div>

        </div>

          {/* <div className={styles.outerQuestionContainer}>
              <div className={styles.eventContainer}>
                <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>Mode
                    <span className={createTournamentStyles.asteriskSpan}>
                        <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                    </span>
                <InfoTip id="tournamentVisibility" /></label>
                
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
                <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}><span className="fieldLabelRow">{tt("ui.entry.type.fb68", "Entry Type")}
                    <span className={createTournamentStyles.asteriskSpan}>
                        <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                    </span> <InfoTip id="entryType" /></span>
                </label>
                
                <select value={entryType} onChange={handleEntryTypeChange} className={createTournamentStyles.inputWithDropdown}>
                    <option value="">{tt("ui.select.8598", "Select")}</option>
                    <option value="Paid">{tt("ui.paid.dc9d", "Paid")}</option>
                    <option value="Free">{tt("ui.free.75f5", "Free")}</option>
                </select>
            </div>


            {/* A free tournament has no fee, so asking for one invites a
                number that is then ignored. The field appears when Paid is
                chosen, and choosing Free clears whatever was typed. */}
            {entryType === 'Paid' && <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="entry-fee"><span className="fieldLabelRow">{tt("ui.entry.fee.vent.coins.31c3", "Entry Fee (VENT COINS)")} <InfoTip id="entryFeePrice" /></span></label>
                <input id="entry-fee" type="number" min="0" placeholder={tt("ui.enter.amount.01f2", "Enter amount")} value={entryFee} className={createTournamentStyles.inputText} onChange={handleEntryFeeChange} />
              </div>}

        </div>
        
      </div>

    </div>;
};
export default CreateTournamentVisibility;