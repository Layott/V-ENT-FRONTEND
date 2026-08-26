import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-schedule.module.css';
import { useT } from '@/i18n/LanguageProvider';
const CreateTournamentSchedule = ({
  formData = {},
  updateFormData
}) => {
  const tt = useT();
  const [selectedOption, setSelectedOption] = useState(formData?.scheduleType || null);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(formData?.recurrenceFrequency || null);
  const [endCriteria, setEndCriteria] = useState(formData?.endCriteria || null);
  const [showMaxCyclesInput, setShowMaxCyclesInput] = useState(endCriteria === "after-cycles");
  const handleOptionClick = option => {
    setSelectedOption(option);
    updateFormData('scheduleType', option);
  };
  const handleRecurrenceFrequencyChange = e => {
    const newValue = e.target.value;
    setRecurrenceFrequency(newValue);
    updateFormData('recurrenceFrequency', newValue);
  };
  const handleEndCriteriaChange = e => {
    const value = e.target.value;
    setEndCriteria(value);
    setShowMaxCyclesInput(value === "after-cycles");
    updateFormData('endCriteria', value);
  };
  const handleInputChange = (key, value) => {
    updateFormData([key], value);
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.tournament.schedule.e6fc", "Tournament Schedule")}</h3>

        <div className={createTournamentStyles.twoBoxesInRowContainer}>
          <div className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === 'one-time' ? createTournamentStyles.activeBox : ''}`}>
            <div className={`${createTournamentStyles.option} ${selectedOption === 'one-time' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('one-time')}></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>{tt("ui.one.time.4401", "One Time")}</h4>
              <p>{tt("ui.host.tournaments.once.after.37e8", "Host tournaments once, After tournament ends it doesn't reoccur.")}</p>
            </div>
          </div>
          
          <div className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === 'recurring' ? createTournamentStyles.activeBox : ''}`}>
            <div className={`${createTournamentStyles.option} ${selectedOption === 'recurring' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('recurring')}></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>{tt("ui.recurring.349f", "Recurring")}</h4>
              <p> {tt("ui.tournaments.reoccurs.given.dates.2c2a", "Tournaments reoccurs at given dates and is ongoing till a final end date.")}</p>
            </div>
          </div>
        </div>

        <div className={styles.tournamentStartEndDateContainer}>
          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>{tt("ui.tournament.start.date.time.10a1", "Tournament Start Date & Time")}
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
            </label>

            
            <input id='start_date_and_time' type="datetime-local" className={styles.dateInput} onChange={e => handleInputChange('start_date_and_time', e.target.value)} />
            
          </div>

          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>{tt("ui.tournament.end.date.time.932c", "Tournament End Date & Time")} 
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
            </label>

            <input id='end_date_and_time' type="datetime-local" className={styles.dateInput} onChange={e => handleInputChange('end_date_and_time', e.target.value)} />
          </div>

        </div>
        
        <div className={styles.tournamentStartEndDateContainer}>
          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>{tt("ui.registration.start.date.time.0e5b", "Registration Start Date & Time")} 
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
            </label>

            <input id='reg_start_date_and_time' type="datetime-local" className={styles.dateInput} style={{
            color: selectedOption ? "white" : ""
          }} onChange={e => handleInputChange('reg_start_date_and_time', e.target.value)} />
            
          </div>

          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>{tt("ui.registration.end.date.time.3522", "Registration End Date  & Time")} 
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
            </label>
            <input id='reg_end_date_and_time' type="datetime-local" className={styles.dateInput} onChange={e => handleInputChange('reg_end_date_and_time', e.target.value)} />
            
          </div>

        </div>
        
      </div>

      {selectedOption === 'recurring' && <>
<div className={styles.moreDetails}>
            <div className={styles.monthlyYearlyContainer}>
              <p className={styles.howOftenParagraph}>{tt("ui.how.often.do.want.4a38", "How often do you want this tournament to reoccur?")}
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </p>
            </div>

            <div className={styles.optionContainer}>
              <label className={styles.optionLabel}>
                <input type="radio" name="recurrenceFrequency" value="monthly" className={styles.optionInput} onChange={handleRecurrenceFrequencyChange} />
                {tt("ui.monthly.d31e", "Monthly")}
              </label>

              <label className={styles.optionLabel}>
                <input type="radio" name="recurrenceFrequency" value="yearly" className={styles.optionInput} onChange={handleRecurrenceFrequencyChange} />
                {tt("ui.yearly.7622", "Yearly")}
              </label>
            </div>

            <div className={styles.nextCycleContainer}>
              <p className={styles.nextCycleParagraph}>
                <span>{tt("ui.next.cycle.start.date.1d71", "Next Cycle Start Date:")}</span>
                <span>{tt("ui.st.november.ec56", "21st November 2024")}</span>
              </p>

              <div className={styles.recurringTournamentMoreDetails}>
                <p>{tt("ui.recurring.tournaments.will.inherit.0864", "Recurring tournaments will inherit start dates (including registration dates) and duration from the first cycle.")}</p>
                <p>{tt("ui.cases.where.start.end.acd7", "For cases where the start/end date is not available e.g months with 30 days and February (28/29 days), the start date will be on the next day. Example: if a recurring tournament start date is on the 30th, for February, it will be moved to the 2nd of March..")}</p>
              </div>
            </div>

            {recurrenceFrequency && <div className={styles.monthlyYearlyContainer}>
                <p className={styles.howOftenParagraph}>{tt("ui.when.do.want.recurring.f3d8", "When do you want the recurring tournaments to end?")}
                  <span className={createTournamentStyles.asteriskSpan}>
                      <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </p>
              </div>}

            {recurrenceFrequency && <div className={styles.optionContainer}>
                <label className={styles.optionLabel}>
                  <input type="radio" name="endCriteria" value="after-cycles" className={styles.optionInput} onChange={handleEndCriteriaChange} />
                  {tt("ui.after.number.cycles.e7bd", "After number of cycles")}
                </label>

                <label className={styles.optionLabel}>
                  <input type="radio" name="endCriteria" value="indefinite" className={styles.optionInput} onChange={handleEndCriteriaChange} />
                  {tt("ui.indefinite.bcd9", "Indefinite")}
                </label>
              </div>}

            {showMaxCyclesInput && <div className={styles.maxNumberCycleContainer}>
                <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>{tt("ui.max.number.cycles.8fc0", "Max Number of Cycles")} 
                  <span className={createTournamentStyles.asteriskSpan}>
                      <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </label>
                
                <input type="number" className={styles.maxNumberCycleInput} value={formData?.number_cycle || ""} onChange={e => handleInputChange('number_cycle', e.target.value)} />
              </div>}

            {endCriteria === "after-cycles" && <p className={styles.nextCycleParagraph}>
                <span>{tt("ui.last.cycle.end.date.b44a", "Last Cycle End Date:")}</span>
                <span>{tt("ui.st.november.d990", "21st November 2026")}</span>
              </p>}

        </div>
      </>}
    </div>;
};
export default CreateTournamentSchedule;