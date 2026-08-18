import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css'
import styles from './create-tournament-schedule.module.css'

const CreateTournamentSchedule = ({formData={}, updateFormData}) => {
  const [selectedOption, setSelectedOption] = useState(formData?.scheduleType || null);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState(formData?.recurrenceFrequency || null);
  const [endCriteria, setEndCriteria] = useState(formData?.endCriteria || null);
  const [showMaxCyclesInput, setShowMaxCyclesInput] = useState(endCriteria === "after-cycles");
  const [dateError, setDateError] = useState('');
  const [regDateError, setRegDateError] = useState('');

  

  const validateDates = (startDate, endDate) => {
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if start date is after end date
    if (start > end) {
      setDateError('Tournament start date cannot be later than end date and time');
      return false;
    }
    
    // Check if dates are exactly the same (no duration)
    if (start.getTime() === end.getTime()) {
      setDateError('Tournament end date must be at least 10 minutes after start date and time');
      return false;
    }
    
    // Check if there's at least 10 minutes difference
    const timeDifference = end.getTime() - start.getTime();
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    if (timeDifference < tenMinutesInMs) {
      setDateError('Tournament end date must be at least 10 minutes after start date and time');
      return false;
    }
    
    setDateError('');
    return true;
  }
  setDateError('');
  return true;
};

const validateRegDates = (regStartDate, regEndDate) => {
  if (regStartDate && regEndDate) {
    const regStart = new Date(regStartDate);
    const regEnd = new Date(regEndDate);
    
    // Check if start date is after end date
    if (regStart > regEnd) {
      setRegDateError('Registration start date cannot be later than end date and time');
      return false;
    }
    
    // Check if dates are exactly the same (no duration)
    if (regStart.getTime() === regEnd.getTime()) {
      setRegDateError('Registration end date must be at least 10 minutes after start date and time');
      return false;
    }
    
    // Check if there's at least 10 minutes difference
    const timeDifference = regEnd.getTime() - regStart.getTime();
    const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes in milliseconds
    
    if (timeDifference < tenMinutesInMs) {
      setRegDateError('Registration end date must be at least 10 minutes after start date');
      return false;
    }
    
    setRegDateError('');
    return true;
  }
  setRegDateError('');
  return true;
};

  const handleOptionClick = (option) => {
    setSelectedOption(option);
    updateFormData('scheduleType', option );
  }

  const handleRecurrenceFrequencyChange = (e) => {
    const newValue = e.target.value; 
    setRecurrenceFrequency(newValue); 
    updateFormData( 'recurrenceFrequency', newValue);
  }

  const handleEndCriteriaChange = (e) => {
    const value = e.target.value;
    setEndCriteria(value);
    setShowMaxCyclesInput(value === "after-cycles")
    updateFormData('endCriteria', value);
  }
  
  const handleInputChange = (key, value) => {
    updateFormData([key], value );
    
    // Validate dates when start or end date changes
    if (key === 'start_date_and_time') {
      validateDates(value, formData?.end_date_and_time);
    } else if (key === 'end_date_and_time') {
      validateDates(formData?.start_date_and_time, value);
    }
    
    // Validate registration dates when reg start or reg end date changes
    if (key === 'reg_start_date_and_time') {
      validateRegDates(value, formData?.reg_end_date_and_time);
    } else if (key === 'reg_end_date_and_time') {
      validateRegDates(formData?.reg_start_date_and_time, value);
    }
  }

  const formatDate = (dateObj) => {
  if (!dateObj) return "--";

  const options = { day: 'numeric', month: 'long', year: 'numeric' };
  return new Date(dateObj).toLocaleDateString('en-GB', options);
};

const getNextCycleStartDate = () => {
  if (!formData?.start_date_and_time || !recurrenceFrequency) return null;
  const baseDate = new Date(formData.start_date_and_time);
  const next = new Date(baseDate);

  if (recurrenceFrequency === "monthly") {
    next.setMonth(next.getMonth() + 1);
  } else if (recurrenceFrequency === "yearly") {
    next.setFullYear(next.getFullYear() + 1);
  }

  return next;
};

const getLastCycleEndDate = () => {
  if (
    !formData?.start_date_and_time ||
    !recurrenceFrequency ||
    !formData?.number_cycle
  ) return null;

  const baseDate = new Date(formData.start_date_and_time);
  const last = new Date(baseDate);
  const cycles = parseInt(formData.number_cycle, 10) - 1;

  if (recurrenceFrequency === "monthly") {
    last.setMonth(last.getMonth() + cycles);
  } else if (recurrenceFrequency === "yearly") {
    last.setFullYear(last.getFullYear() + cycles);
  }

  return last;
};

const nextCycleStart = getNextCycleStartDate();
const lastCycleEnd = getLastCycleEndDate();


  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>Tournament Schedule</h3>

        <div className={createTournamentStyles.twoBoxesInRowContainer}>
          <div
            className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === 'one-time' ? createTournamentStyles.activeBox : ''}`}
            onClick={() => handleOptionClick('one-time')}
          >
            <div
              className={`${createTournamentStyles.option} ${selectedOption === 'one-time' ? createTournamentStyles.selected : ''}`}
              onClick={() => handleOptionClick('one-time')}
            ></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>One Time</h4>
              <p>Host tournaments once, After tournament ends it doesn&#39;t reoccur.</p>
            </div>
          </div>
          
          <div
            className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === 'recurring' ? createTournamentStyles.activeBox : ''}`}
            onClick={() => handleOptionClick('recurring')}
          >
            <div
              className={`${createTournamentStyles.option} ${selectedOption === 'recurring' ? createTournamentStyles.selected : ''}`}
              onClick={() => handleOptionClick('recurring')}
            ></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>Recurring</h4>
              <p> Tournaments reoccurs at given dates and is ongoing till a final end date.</p>
            </div>
          </div>
        </div>

        <div className={styles.tournamentStartEndDateContainer}>
          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>Tournament Start Date & Time
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
            </label>

            
            <input 
              id='start_date_and_time' 
              type="datetime-local" 
              className={`${styles.dateInput} ${dateError ? styles.errorInput : ''}`} 
              onChange={(e) => handleInputChange('start_date_and_time', e.target.value)} 
            />
            
          </div>

          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>Tournament End Date & Time 
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
            </label>

            <input 
              id='end_date_and_time' 
              type="datetime-local" 
              className={`${styles.dateInput} ${dateError ? styles.errorInput : ''}`} 
              onChange={(e) => handleInputChange('end_date_and_time', e.target.value)}
            />
          </div>

        </div>

        {dateError && (
          <div className={styles.errorMessage}>
            {dateError}
          </div>
        )}
        
        <div className={styles.tournamentStartEndDateContainer}>
          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>Registration Start Date & Time 
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
            </label>

            <input 
              id='reg_start_date_and_time' 
              type="datetime-local" 
              className={`${styles.dateInput} ${regDateError ? styles.errorInput : ''}`} 
              style={{ color: selectedOption ? "white" : ""}} 
              onChange={(e) => handleInputChange('reg_start_date_and_time', e.target.value)} 
            />
            
          </div>

          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>Registration End Date  & Time 
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
            </label>
            <input 
              id='reg_end_date_and_time' 
              type="datetime-local" 
              className={`${styles.dateInput} ${regDateError ? styles.errorInput : ''}`} 
              onChange={(e) => handleInputChange('reg_end_date_and_time', e.target.value)} 
            />
            
          </div>

        </div>

        {regDateError && (
          <div className={styles.errorMessage}>
            {regDateError}
          </div>
        )}
        
      </div>

      {selectedOption === 'recurring' && (
        <>
<div className={styles.moreDetails}>
            <div className={styles.monthlyYearlyContainer}>
              <p className={styles.howOftenParagraph}>How often do you want this tournament to reoccur?
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </p>
            </div>

            <div className={styles.optionContainer}>
              <label className={styles.optionLabel}>
                <input
                  type="radio"
                  name="recurrenceFrequency"
                  value="monthly"
                  className={styles.optionInput}
                  onChange={handleRecurrenceFrequencyChange}
                />
                Monthly
              </label>

              <label className={styles.optionLabel}>
                <input
                  type="radio"
                  name="recurrenceFrequency"
                  value="yearly"
                  className={styles.optionInput}
                  onChange={handleRecurrenceFrequencyChange}
                />
                Yearly
              </label>
            </div>

            <div className={styles.nextCycleContainer}>
              <p className={styles.nextCycleParagraph}>
              <span>Next Cycle Start Date:</span>
              <span>{formatDate(nextCycleStart)}</span>
              </p>


              <div className={styles.recurringTournamentMoreDetails}>
                <p>Recurring tournaments will inherit start dates (including registration dates) and duration from the first cycle.</p>
                <p>For cases where the start/end date is not available e.g months with 30 days and February (28/29 days), the start date will be on the next day. Example: if a recurring tournament start date is on the 30th, for February, it will be moved to the 2nd of March..</p>
              </div>
            </div>

            {recurrenceFrequency && (
              <div className={styles.monthlyYearlyContainer}>
                <p className={styles.howOftenParagraph}>When do you want the recurring tournaments to end?
                  <span className={createTournamentStyles.asteriskSpan}>
                      <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </p>
              </div>
            )}

            {recurrenceFrequency && (
              <div className={styles.optionContainer}>
                <label className={styles.optionLabel}>
                  <input
                    type="radio"
                    name="endCriteria"
                    value="after-cycles"
                    className={styles.optionInput}
                    onChange={handleEndCriteriaChange}
                  />
                  After number of cycles
                </label>

                <label className={styles.optionLabel}>
                  <input
                    type="radio"
                    name="endCriteria"
                    value="indefinite"
                    className={styles.optionInput}
                    onChange={handleEndCriteriaChange}
                  />
                  Indefinite
                </label>
              </div>
            )}

            {showMaxCyclesInput && (
              <div className={styles.maxNumberCycleContainer}>
                <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}>Max Number of Cycles 
                  <span className={createTournamentStyles.asteriskSpan}>
                      <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span>
                </label>
                
                <input type="number" className={styles.maxNumberCycleInput} value={formData?.number_cycle || ""}
              onChange={(e) => handleInputChange('number_cycle', e.target.value)} />
              </div>
            )}

            {endCriteria === "after-cycles" && (
              <p className={styles.nextCycleParagraph}>
                <span>Last Cycle End Date:</span>
                <span>{formatDate(lastCycleEnd)}</span>
              </p>
            )}

        </div>
      </>
      )}
    </div>
  )
}

export default CreateTournamentSchedule;