import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-type.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const CreateTournamentType = ({
  formData = {},
  updateFormData
}) => {
  const tx = useTx();
  const tt = useT();
  const [selectedOption, setSelectedOption] = useState(formData?.tournament_type || null);
  const [isLinkedToEvent, setIsLinkedToEvent] = useState(false);
  const [hideLocation, setHideLocation] = useState(false);
  const handleOptionClick = option => {
    setSelectedOption(option);
    updateFormData('tournament_type', option);
  };
  const handleHideLocationChange = event => {
    setHideLocation(event.target.checked);
    if (event.target.checked) {
      updateFormData('hide_location', 'true');
    } else {
      updateFormData('hide_location', 'false');
    }
  };
  const handleEventLinkChange = value => {
    setIsLinkedToEvent(value === 'yes');
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.tournament.type.21bd", "Tournament Type")}</h3>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          {['virtual', 'physical', 'hybrid'].map(option => <div key={option} className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === option ? createTournamentStyles.activeBox : ''}`} onClick={() => handleOptionClick(option)}>
              <div className={`${createTournamentStyles.option} ${selectedOption === option ? createTournamentStyles.selected : ''}`}></div>
              <div className={createTournamentStyles.boxTextContainer}>
                <h4>{option.charAt(0).toUpperCase() + option.slice(1)}</h4>
                <p>
                  {option === 'virtual' ? tx("Your tournament will be held only as a virtual tournament.") : option === 'physical' ? tx("Your tournament will be held as a physical event in a physical space.") : tx("Your tournament will be both virtual and physical.")}
                </p>
              </div>
            </div>)}
        </div>

        <div className={styles.outerVenueVirtualLinkContainer}>
          <div className={createTournamentStyles.twoInputContainer}>
            {selectedOption !== 'physical' && <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="virtualLink">{tt("ui.virtual.link.7e09", "Virtual Link")}</label>
                <input id="virtualLink" type="text" placeholder={tt("ui.paste.link.here.d7d4", "Paste link here")} className={createTournamentStyles.inputText} onChange={e => updateFormData('virtual_link', e.target.value)} disabled={hideLocation} />
              </div>}

            {selectedOption !== 'virtual' && <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="venue">{tt("ui.venue.67cd", "Venue")}</label>
                <input id="venue" type="text" placeholder={tt("ui.enter.physical.location.da63", "Enter physical location")} className={createTournamentStyles.inputText} onChange={e => updateFormData('tournament_location', e.target.value)} disabled={hideLocation} />
              </div>}
          </div>

          <div className={styles.hideLocationContainer}>
            <input type="checkbox" className={styles.hideCheckbox} checked={hideLocation} onChange={handleHideLocationChange} />
            <label>{tt("ui.hide.location.36ab", "Hide location")}</label>
          </div>

          <div className={styles.outerQuestionContainer}>
            <div className={styles.questionContainer}>
              <p>{tt("ui.tournament.linked.event.46c7", "Is this tournament linked to an event?")}</p>

              <div className={styles.optionContainer}>
                {['yes', 'no'].map(value => <label key={value} className={styles.optionLabel}>
                    <input type="radio" name="linkedToEvent" value={value} className={styles.optionInput} checked={isLinkedToEvent === (value === 'yes')} onChange={() => handleEventLinkChange(value)} />
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </label>)}
              </div>
            </div>

            {isLinkedToEvent && <div className={styles.eventContainer}>
                <label htmlFor="selectEvent" className={createTournamentStyles.labelWithAsterisk}>
                  {tt("ui.select.event.c20e", "Select Event")}
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </label>
                <select id="selectEvent" className={createTournamentStyles.inputWithDropdown} onChange={e => updateFormData('event', e.target.value)}>
                  <option value="">{tt("ui.select.event.c20e", "Select Event")}</option>
                  <option value="FREEFIRE">{tt("ui.free.fire.aa70", "Free Fire")}</option>
                  <option value="PUBGM">{tt("ui.pubg.cad4", "PUBG")}</option>
                  <option value="CODM">{tt("ui.codm.5704", "CODM")}</option>
                  <option value="EAFC">{tt("ui.eafc.11f1", "EAFC")}</option>
                </select>
              </div>}
          </div>
        </div>
      </div>
    </div>;
};
export default CreateTournamentType;