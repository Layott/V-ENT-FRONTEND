'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect } from 'react';
import { FaAsterisk } from "react-icons/fa6";
import { FiInfo } from "react-icons/fi";
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './participants.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useFormatShape, countRule as ruleFrom } from '@/lib/formatCatalogue';
import { plannedCount, plannedSeats } from '../tournament-format/TournamentFormat';
// Who may register, in words rather than the raw option value. It read
// "Participants limited to teams." in English on every language of the site.
const ACCESS = {
  teams: { name: 'Teams', blurb: 'Only teams can register for this tournament.' },
  individuals: { name: 'Individuals', blurb: 'Only single players can register.' },
  both: { name: 'Both', blurb: 'Teams and single players can both register.' },
};

const Participants = ({
  formData = {},
  updateFormData
}) => {
  const tt = useT();
  const [selectedOption, setSelectedOption] = useState(formData?.tournament_access || null);
  const [teamSizeOption, setTeamSizeOption] = useState(formData?.team_size || '');
  const [customTeamSize, setCustomTeamSize] = useState(formData?.custom_team_size || '');
  const [minIndividuals, setMinIndividuals] = useState(formData?.min_number_of_participants || '');
  const [maxIndividuals, setMaxIndividuals] = useState(formData?.max_number_of_participants || '');
  const [error, setError] = useState('');

  // What this format actually needs, read from the catalogue that enforces it
  // rather than from a copy kept here.
  //
  // The copy was wrong for four of the eight formats. It tested
  // `format === 'swiss'` while the value normalises to `swiss_system`, so the
  // Swiss rule never fired once; double elimination was given a minimum of 2
  // against the catalogue's 4; round robin's ceiling of 20 was not here at
  // all, so 40 teams could be typed into a form that would build 780 fixtures;
  // and gsl, aggregate_2v2 and ladder had no rule of any kind.
  const { entry } = useFormatShape(
    formData?.bracket_type, plannedCount(formData), plannedSeats(formData));
  const rule = ruleFrom(entry);
  const fill = (key, fallback, values) => {
    let out = tt(key, fallback);
    Object.entries(values).forEach(([name, value]) => {
      out = out.split(`{${name}}`).join(String(value));
    });
    return out;
  };
  const countRule = {
    min: rule.min,
    max: rule.max,
    evenOnly: rule.evenOnly,
    note: !rule.known
      ? tt('ui.count.any', 'Two or more.')
      : rule.evenOnly
        ? fill('ui.count.evenFrom',
            'An even number, {min} or more, so nobody is left without an opponent in the first round.',
            { min: rule.min })
        : rule.max
          ? fill('ui.count.between', 'Between {min} and {max}.',
              { min: rule.min, max: rule.max })
          : fill('ui.count.from', '{min} or more.', { min: rule.min }),
  };

  const validateCount = (value, fieldName) => {
    const n = parseInt(value, 10);
    if (Number.isNaN(n)) {
      setError('');
      return false;
    }
    if (n < countRule.min) {
      setError(tt('msg.atLeastN', 'Enter at least {n}.').replace('{n}', countRule.min));
      return false;
    }
    // A ceiling the catalogue holds and the form never did. Round robin past
    // twenty is 190 fixtures, which the server refuses after somebody has
    // filled in the whole wizard.
    if (countRule.max && n > countRule.max) {
      setError(fill('msg.atMostN', 'Enter at most {n}.', { n: countRule.max }));
      return false;
    }
    if (countRule.evenOnly && n % 2 !== 0) {
      setError(tt('msg.pleaseEnterAnEvenNumber', 'Please enter an even number.'));
      return false;
    }
    setError('');
    return true;
  };

  // Kept for the call sites that have not been renamed. It no longer wipes what
  // somebody typed: clearing the field on a wrong number meant retyping the
  // whole thing to fix one digit, and it is why an odd count looked like the
  // form was broken rather than like a rule.
  const validateEvenNumber = (value, fieldName) => validateCount(value, fieldName);
  const handleOptionClick = option => {
    setSelectedOption(option);
    updateFormData('tournament_access', option);
  };
  const handleTeamSizeChange = event => {
    const value = event.target.value;
    setTeamSizeOption(value);
    updateFormData('team_size', value !== 'custom' ? value : customTeamSize);
  };
  const handleCustomTeamSizeChange = event => {
    const value = event.target.value;
    setCustomTeamSize(value);
    updateFormData('custom_team_size', value);
    updateFormData('team_size', value);
  };
  const handleMinIndividualsChange = event => {
    const value = event.target.value;
    setMinIndividuals(value);
    updateFormData('min_number_of_participants', value);
  };
  const handleMaxIndividualsChange = event => {
    const value = event.target.value;
    setMaxIndividuals(value);
    updateFormData('max_number_of_participants', value);
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.participants.cd56", "Participants")}</h3>

        <p>{tt("ui.who.can.register.tournament.70f4", "Who can register for this tournament?")}</p>

        <div className={createTournamentStyles.threeBoxesInRowContainer}>
          {['teams', 'individuals', 'both'].map(option => <div key={option} className={`${createTournamentStyles.oneThirdBoxContainer} ${selectedOption === option ? createTournamentStyles.activeBox : ''}`} onClick={() => handleOptionClick(option)}>
              <div className={`${createTournamentStyles.option} ${selectedOption === option ? createTournamentStyles.selected : ''}`}></div>
              <div className={createTournamentStyles.boxTextContainer}>
                <h4>{tt(`ui.access.${option}`, ACCESS[option].name)}</h4>
                <p>{tt(`ui.access.${option}.blurb`, ACCESS[option].blurb)}</p>
              </div>
            </div>)}
        </div>

        {['teams', 'both'].includes(selectedOption) && <div className={styles.howManyTeamsContainer}>
            <div className={styles.tournamentTitleContainer}>
              <label htmlFor="numberOfTeams" className={createTournamentStyles.labelWithAsterisk}>
                <span className="fieldLabelRow">{tt("ui.how.many.teams.required.d02a", "How many teams are required?")}
                <span className={createTournamentStyles.asteriskSpan}>
                  <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span> <InfoTip id="numberOfTeams" /></span>
              </label>
              <input id="numberOfTeams" type="text" className={createTournamentStyles.inputText}
                     placeholder={tt("ui.enter.number.teams.3cb8", "Enter number of teams")}
                     /* Controlled, so re-opening a draft shows the number
                        already chosen. Uncontrolled, the box came up empty
                        however many teams the draft was saved with, and an
                        empty box submits the default. */
                     value={formData.number_of_teams ?? formData.max_number_of_participants ?? ''}
                     onChange={e => {
            const value = e.target.value;
            if (value === '' || /^[0-9]+$/.test(value)) {
              // This field is the tournament's slot count. It only ever
              // wrote number_of_teams, which the submit does not read, so
              // a tournament created for 4 teams was sent with the
              // default 32 and displayed as 0/32.
              updateFormData('number_of_teams', value);
              updateFormData('max_number_of_participants', value);
            }
          }} onBlur={e => {
            validateEvenNumber(e.target.value, 'number_of_teams');
          }} />
              {error && <p className={styles.errorText}>{error}</p>} 

              <p className={styles.infoParagraph}>
                <span className={styles.infoSpan}>
                  <FiInfo />
                </span>
                {countRule.note}
              </p>
            </div>

            <div className={`${createTournamentStyles.inputGroup} ${styles.inputGroup}`}>
              <label htmlFor="teamSizeOption" className={createTournamentStyles.labelWithAsterisk}>
                <span className="fieldLabelRow">{tt("ui.how.many.players.team.fb4e", "How many players in a team are required?")}
                <span className={createTournamentStyles.asteriskSpan}>
                  <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                </span> <InfoTip id="teamSize" /></span>
              </label>
              <select id="teamSizeOption" value={teamSizeOption} onChange={handleTeamSizeChange} className={createTournamentStyles.inputWithDropdown}>
                <option value="">{tt("ui.select.number.players.7801", "Select Number of Players")}</option>
                <option value="duo">{tt("ui.duo.players.15f8", "Duo (2 players)")}</option>
                <option value="trio">{tt("ui.trio.players.7ebc", "Trio (3 players)")}</option>
                <option value="quad">{tt("ui.quad.players.dc17", "Quad (4 players)")}</option>
                <option value="custom">{tt("ui.custom.081a", "Custom")}</option>
              </select>

              {teamSizeOption === 'custom' && <input id="customTeamSize" type="number" className={`${createTournamentStyles.inputText} ${styles.inputCustomNumber}`} placeholder={tt("ui.enter.number.players.1ad8", "Enter number of players")} value={customTeamSize} onChange={handleCustomTeamSizeChange} />}
            </div>
          </div>}

        {['individuals', 'both'].includes(selectedOption) && <div className={styles.minAndMaxNumberContainer}>
            <div className={createTournamentStyles.twoInputContainer}>
              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="minNumber" className={createTournamentStyles.labelWithAsterisk}>
                  <span className="fieldLabelRow">{tt("ui.min.number.individuals.d770", "Min Number of Individuals")}
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span> <InfoTip id="minParticipants" /></span>
                </label>
                <input id="minNumber" type="number" placeholder={tt("ui.enter.minimum.number.06ca", "Enter minimum number")} className={createTournamentStyles.inputNumber} value={minIndividuals} onChange={handleMinIndividualsChange} />
              </div>

              <div className={createTournamentStyles.inputGroup}>
                <label htmlFor="maxNumber" className={createTournamentStyles.labelWithAsterisk}>
                  <span className="fieldLabelRow">{tt("ui.max.number.individuals.e3ae", "Max Number of Individuals")}
                  <span className={createTournamentStyles.asteriskSpan}>
                    <FaAsterisk className={createTournamentStyles.asteriskIcon} />
                  </span> <InfoTip id="maxParticipants" /></span>
                </label>
                <input id="maxNumber" type="number" placeholder={tt("ui.enter.maximum.number.961a", "Enter maximum number")} className={createTournamentStyles.inputNumber} value={maxIndividuals} onChange={handleMaxIndividualsChange} />
                <p className={styles.infoParagraph}>
                  <span className={styles.infoSpan}>
                    <FiInfo />
                  </span>
                  {tt("ui.maximum.number.individuals.allowed.175c", "The maximum number of individuals allowed is 64.")}
                </p>
              </div>
            </div>
            <p className={styles.infoParagraph} style={{
          marginTop: '0.5rem'
        }}>
              <span className={styles.infoSpan}>
                <FiInfo />
              </span>
              {countRule.note}
            </p>
          </div>}
      </div>
    </div>;
};
export default Participants;