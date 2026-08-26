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
          
          <div className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'public' ? createTournamentStyles.activeBox : ''}`}>
            <div className={`${createTournamentStyles.option} ${selectedOption === 'public' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('public')}></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>{tt("ui.public.dc5e", "Public")}</h4>
              <p>{tt("ui.tournament.will.visible.everyone.2a46", "Your tournament will be visible to everyone  on the  platform.")}</p>
            </div>
          </div>
          
          <div className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'private' ? createTournamentStyles.activeBox : ''}`}>
            <div className={`${createTournamentStyles.option} ${selectedOption === 'private' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('private')}></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>{tt("ui.private.237d", "Private")}</h4>
              <p>{tt("ui.tournament.will.hidden.from.05da", "Your tournament will be hidden from the public and available to only users with a link.")}</p>
            </div>
          </div>

          <div className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === 'protected' ? createTournamentStyles.activeBox : ''}`}>
            <div className={`${createTournamentStyles.option} ${selectedOption === 'protected' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('protected')}></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>{tt("ui.protected.2853", "Protected")}</h4>
              <p>{tt("ui.tournament.will.require.pin.6a12", "Your tournament will require a pin or code for users to register.")}</p>
            </div>
          </div>

        </div>

          <div className={styles.outerQuestionContainer}>

            <div className={styles.eventContainer}>
                <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>b
                    <span className={createTournamentStyles.asteriskSpan}>
                        <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                    </span>
                </label>
                
                <select
          // value={selectedEvent}
          // onChange={handleEntryTypeChange}
          className={createTournamentStyles.inputWithDropdown}>
                    <option value="">{tt("ui.select.8598", "Select")}</option>
                    <option value="FREE FIRE">{tt("ui.free.fire.aa70", "Free Fire")}</option>
                    <option value="PUBGM">{tt("ui.pubg.cad4", "PUBG")}</option>
                    <option value="CODM">{tt("ui.codm.5704", "CODM")}</option>
                    <option value="EAFC">{tt("ui.eafc.11f1", "EAFC")}</option>
                </select>
            </div>

          </div>


          <div className={createTournamentStyles.twoInputContainer}>
            <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>{tt("ui.entry.type.fb68", "Entry Type")}
                    <span className={createTournamentStyles.asteriskSpan}>
                        <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                    </span>
                </label>
                
                <select value={entryType} onChange={handleEntryTypeChange} className={createTournamentStyles.inputWithDropdown}>
                    <option value="">{tt("ui.select.8598", "Select")}</option>
                    <option value="FREEFIRE">{tt("ui.free.fire.aa70", "Free Fire")}</option>
                    <option value="PUBGM">{tt("ui.pubg.cad4", "PUBG")}</option>
                    <option value="CODM">{tt("ui.codm.5704", "CODM")}</option>
                    <option value="EAFC">{tt("ui.eafc.11f1", "EAFC")}</option>
                </select>
            </div>


            <div className={createTournamentStyles.inputGroup}>
              <label htmlFor="">{tt("ui.entry.fee.a428", "Entry Fee")}</label>
              <input type="number" placeholder={tt("ui.enter.amount.01f2", "Enter amount")} value={entryFee} className={createTournamentStyles.inputText} onChange={handleEntryFeeChange} />
            </div>

        </div>
        
      </div>

    </div>;
};
export default CreateTournamentVisibility;