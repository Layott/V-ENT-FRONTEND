'use client';

import { appLocale } from '@/lib/appLocale';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './create-tournament-schedule.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import DateField from '@/components/date-field/DateField';
const RECURRENCE_OPTIONS = [{
  value: 'daily',
  label: 'Daily'
}, {
  value: 'weekly',
  label: 'Weekly'
}, {
  value: 'monthly',
  label: 'Monthly'
}, {
  value: 'yearly',
  label: 'Yearly'
}];
const CreateTournamentSchedule = ({
  formData = {},
  updateFormData
}) => {
  const tx = useTx();
  const tt = useT();
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
  };
  const formatDate = dateObj => {
    if (!dateObj) return "--";
    const options = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return new Date(dateObj).toLocaleDateString(appLocale(), options);
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
    if (!formData?.start_date_and_time || !recurrenceFrequency || !formData?.number_cycle) return null;
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
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.tournament.schedule.e6fc", "Tournament Schedule")}</h3>

        <div className={createTournamentStyles.twoBoxesInRowContainer}>
          <div className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === 'one-time' ? createTournamentStyles.activeBox : ''}`} onClick={() => handleOptionClick('one-time')}>
            <div className={`${createTournamentStyles.option} ${selectedOption === 'one-time' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('one-time')}></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>{tt("ui.one.time.4401", "One Time")}</h4>
              <p>{tt("ui.host.tournaments.once.after.37e8", "Host tournaments once, After tournament ends it doesn't reoccur.")}</p>
            </div>
          </div>
          
          <div className={`${createTournamentStyles.halfBoxContainer} ${selectedOption === 'recurring' ? createTournamentStyles.activeBox : ''}`} onClick={() => handleOptionClick('recurring')}>
            <div className={`${createTournamentStyles.option} ${selectedOption === 'recurring' ? createTournamentStyles.selected : ''}`} onClick={() => handleOptionClick('recurring')}></div>
            <div className={createTournamentStyles.boxTextContainer}>
              <h4>{tt("ui.recurring.349f", "Recurring")}<InfoTip id="recurrence" /></h4>
              <p> {tt("ui.tournaments.reoccurs.given.dates.2c2a", "Tournaments reoccurs at given dates and is ongoing till a final end date.")}</p>
            </div>
          </div>
        </div>

        <div className={styles.tournamentStartEndDateContainer}>
          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}><span className="fieldLabelRow">{tt("ui.tournament.start.date.time.10a1", "Tournament Start Date & Time")}
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span> <InfoTip id="startDateTime" /></span>
            </label>

            
            <DateField id='start_date_and_time' value={formData?.start_date_and_time || ''} onChange={e => handleInputChange('start_date_and_time', e.target.value)} className={`${styles.dateInput} ${dateError ? styles.errorInput : ''}`} withTime />
            
          </div>

          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}><span className="fieldLabelRow">{tt("ui.tournament.end.date.time.932c", "Tournament End Date & Time")} 
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span> <InfoTip id="endDateTime" /></span>
            </label>

            <DateField id='end_date_and_time' value={formData?.end_date_and_time || ''} onChange={e => handleInputChange('end_date_and_time', e.target.value)} className={`${styles.dateInput} ${dateError ? styles.errorInput : ''}`} withTime />
          </div>

        </div>

        {dateError && <div className={styles.errorMessage}>
            {dateError}
          </div>}
        
        <div className={styles.tournamentStartEndDateContainer}>
          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}><span className="fieldLabelRow">{tt("ui.registration.start.date.time.0e5b", "Registration Start Date & Time")} 
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span> <InfoTip id="regStartDate" /></span>
            </label>

            <DateField id='reg_start_date_and_time' value={formData?.reg_start_date_and_time || ''} onChange={e => handleInputChange('reg_start_date_and_time', e.target.value)} className={`${styles.dateInput} ${regDateError ? styles.errorInput : ''}`} withTime />
            
          </div>

          <div className={createTournamentStyles.inputGroup}>
            <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}><span className="fieldLabelRow">{tt("ui.registration.end.date.time.3522", "Registration End Date  & Time")} 
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span> <InfoTip id="regEndDate" /></span>
            </label>
            <DateField id='reg_end_date_and_time' value={formData?.reg_end_date_and_time || ''} onChange={e => handleInputChange('reg_end_date_and_time', e.target.value)} className={`${styles.dateInput} ${regDateError ? styles.errorInput : ''}`} withTime />
            
          </div>

        </div>

        {regDateError && <div className={styles.errorMessage}>
            {regDateError}
          </div>}
        
      </div>

      {selectedOption === 'recurring' && <>
<div className={styles.moreDetails}>
            <div className={styles.monthlyYearlyContainer}>
              <p className={styles.howOftenParagraph}>{tt("ui.how.often.do.want.4a38", "How often do you want this tournament to reoccur?")}<InfoTip id="recurrence" />
                <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span>
              </p>
            </div>

            {/* Daily and Weekly were missing, so a weekly ladder - the most
                common recurring format there is - could not be described. */}
            <div className={styles.optionContainer}>
              {RECURRENCE_OPTIONS.map(option => <label className={styles.optionLabel} key={option.value}>
                  <input type="radio" name="recurrenceFrequency" value={option.value} className={styles.optionInput} checked={recurrenceFrequency === option.value} onChange={handleRecurrenceFrequencyChange} />
                  {tx(option.label)}
                </label>)}
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
              <span>{formatDate(nextCycleStart)}</span>
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
                <label htmlFor="" className={createTournamentStyles.labelWithAsterisk}><span className="fieldLabelRow">{tt("ui.max.number.cycles.8fc0", "Max Number of Cycles")} 
                  <span className={createTournamentStyles.asteriskSpan}>
                      <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span> <InfoTip id="maxCycles" /></span>
                </label>
                
                <input type="number" className={styles.maxNumberCycleInput} value={formData?.number_cycle || ""} onChange={e => handleInputChange('number_cycle', e.target.value)} />
              </div>}

            {endCriteria === "after-cycles" && <p className={styles.nextCycleParagraph}>
                <span>{tt("ui.last.cycle.end.date.b44a", "Last Cycle End Date:")}</span>
                <span>{formatDate(lastCycleEnd)}</span>
              </p>}

        </div>
      </>}
    </div>;
};
export default CreateTournamentSchedule;