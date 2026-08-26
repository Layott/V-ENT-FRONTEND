import { useCallback, useMemo } from 'react';
import InfoTip from '@/components/info-tip/InfoTip';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './tournament-options.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// The settings an organiser configures beyond the headline fields. Every one of
// these changes what the platform does: who is refused at registration, how the
// draw is made, who forfeits for not turning up. Nothing here is decorative.
//
// Grouped by the question it answers rather than by data type, because an
// organiser thinks "who can enter" and "what happens if they do not show up",
// not "booleans" and "integers".

const CHECK_IN_CHOICES = [{
  value: 0,
  label: 'No check-in'
}, {
  value: 10,
  label: '10 minutes before'
}, {
  value: 15,
  label: '15 minutes before'
}, {
  value: 30,
  label: '30 minutes before'
}, {
  value: 60,
  label: '1 hour before'
}];
const SEEDING_CHOICES = [{
  value: 'registration',
  label: 'Registration order',
  hint: 'First to sign up gets the first seed.'
}, {
  value: 'random',
  label: 'Random draw',
  hint: 'Shuffled when the bracket is generated.'
}, {
  value: 'ranked',
  label: 'By ranking',
  hint: 'Strongest entrants are kept apart until late rounds.'
}, {
  value: 'manual_order',
  label: 'I will seed it myself',
  hint: 'You set the order before generating.'
}];
const ROSTER_LOCK_CHOICES = [{
  value: 'none',
  label: 'Anytime'
}, {
  value: 'registration_close',
  label: 'When registration closes'
}, {
  value: 'start',
  label: 'When the tournament starts'
}];
export const DEFAULT_OPTIONS = {
  check_in_minutes: 15,
  forfeit_without_check_in: true,
  seeding_method: 'registration',
  third_place_match: false,
  best_of_mode: 'fixed',
  best_of: 1,
  best_of_final: 3,
  match_interval_minutes: 30,
  roster_lock: 'start',
  max_substitutes: 0,
  restrict_country: '',
  min_age: 0,
  require_verified_email: true,
  require_kyc: false,
  require_screenshot: false,
  dispute_window_minutes: 30
};
const Toggle = ({
  id,
  label,
  hint,
  checked,
  onChange,
  tip
}) => <button type="button" id={id} role="switch" aria-checked={checked} className={`${styles.toggleRow} ${checked ? styles.toggleRowOn : ''}`} onClick={() => onChange(!checked)}>
    <span className={styles.toggleText}>
      <span className={styles.toggleLabel}>
        {label}
        {tip ? <InfoTip id={tip} /> : null}
      </span>
      {hint ? <span className={styles.toggleHint}>{hint}</span> : null}
    </span>
    <span className={`${styles.toggleTrack} ${checked ? styles.toggleTrackOn : ''}`}>
      <span className={styles.toggleKnob} />
    </span>
  </button>;
const TournamentOptions = ({
  formData = {},
  updateFormData
}) => {
  const tx = useTx();
  const tt = useT();
  const options = useMemo(() => ({
    ...DEFAULT_OPTIONS,
    ...(formData.options || {})
  }), [formData.options]);
  const set = useCallback((key, value) => {
    updateFormData('options', {
      ...options,
      [key]: value
    });
  }, [options, updateFormData]);
  const number = (key, value, fallback) => {
    const parsed = parseInt(value, 10);
    set(key, Number.isNaN(parsed) ? fallback : parsed);
  };
  return <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>{tt("ui.tournament.settings.3aa2", "Tournament Settings")}</h3>
        <p className={styles.sectionIntro}>
          {tt("ui.these.decide.who.can.4b61", "These decide who can enter, how the draw is made, and what happens when somebody\n          does not turn up. You can change them until the bracket is generated.")}
        </p>

        {/* ---------------------------------------------------- check-in */}
        <div className={styles.group}>
          <h4 className={styles.groupTitle}>{tt("ui.check.4843", "Check-in")}<InfoTip id="checkInWindow" /></h4>
          <p className={styles.groupHint}>
            {tt("ui.entrants.confirm.they.are.d80c", "Entrants confirm they are actually there before the bracket is built. Without it,\n            round one is full of people who signed up weeks ago and forgot.")}
          </p>

          <div className={styles.choiceRow}>
            {CHECK_IN_CHOICES.map(choice => <button type="button" key={choice.value} className={`${styles.chip} ${options.check_in_minutes === choice.value ? styles.chipOn : ''}`} onClick={() => set('check_in_minutes', choice.value)}>
                {tx(choice.label)}
              </button>)}
          </div>

          {options.check_in_minutes > 0 && <Toggle id="forfeit_without_check_in" tip="forfeitNoCheckIn" label={tt("ui.forfeit.anyone.who.does.41e7", "Forfeit anyone who does not check in")} hint="You press the button. Nothing is removed automatically." checked={options.forfeit_without_check_in} onChange={v => set('forfeit_without_check_in', v)} />}
        </div>

        {/* ----------------------------------------------------- seeding */}
        <div className={styles.group}>
          <h4 className={styles.groupTitle}>{tt("ui.seeding.2ac9", "Seeding")}<InfoTip id="seedingMethod" /></h4>
          <div className={styles.seedGrid}>
            {SEEDING_CHOICES.map(choice => <button type="button" key={choice.value} className={`${styles.seedCard} ${options.seeding_method === choice.value ? styles.seedCardOn : ''}`} onClick={() => set('seeding_method', choice.value)}>
                <span className={styles.seedLabel}>{tx(choice.label)}</span>
                <span className={styles.seedHint}>{tx(choice.hint)}</span>
              </button>)}
          </div>

          <Toggle id="third_place_match" tip="thirdPlaceMatch" label={tt("ui.play.third.place.match.f507", "Play a third-place match")} hint="The two semi-final losers play for third. Needed if your prize table pays a third place." checked={options.third_place_match} onChange={v => set('third_place_match', v)} />
        </div>

        {/* ----------------------------------------------------- matches */}
        <div className={styles.group}>
          <h4 className={styles.groupTitle}>{tt("ui.matches.ee2d", "Matches")}<InfoTip id="bestOfMode" /></h4>

          <div className={styles.choiceRow}>
            <button type="button" className={`${styles.chip} ${options.best_of_mode === 'fixed' ? styles.chipOn : ''}`} onClick={() => set('best_of_mode', 'fixed')}>
              {tt("ui.same.length.every.round.62d4", "Same length every round")}
            </button>
            <button type="button" className={`${styles.chip} ${options.best_of_mode === 'escalating' ? styles.chipOn : ''}`} onClick={() => set('best_of_mode', 'escalating')}>
              {tt("ui.longer.as.progresses.f82f", "Longer as it progresses")}
            </button>
          </div>

          <div className={styles.fieldRow}>
            <label className={styles.field} htmlFor="best_of">
              <span className={styles.fieldLabel}>
                {options.best_of_mode === 'escalating' ? tx("First round is best of") : tx("Best of")}
              </span>
              <select id="best_of" className={`${createTournamentStyles.inputText} ${createTournamentStyles.inputWithDropdown} ${styles.select}`} value={options.best_of} onChange={e => number('best_of', e.target.value, 1)}>
                {[1, 3, 5, 7, 9].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>

            {options.best_of_mode === 'escalating' && <label className={styles.field} htmlFor="best_of_final">
                <span className={styles.fieldLabel}>{tt("ui.final.best.ca0a", "Final is best of")}</span>
                <select id="best_of_final" className={`${createTournamentStyles.inputText} ${createTournamentStyles.inputWithDropdown} ${styles.select}`} value={options.best_of_final} onChange={e => number('best_of_final', e.target.value, 3)}>
                  {[1, 3, 5, 7, 9].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>}

            <label className={styles.field} htmlFor="match_interval_minutes">
              <span className={styles.fieldLabel}>{tt("ui.minutes.between.rounds.06e8", "Minutes between rounds")}<InfoTip id="matchInterval" /></span>
              <input id="match_interval_minutes" type="number" min="5" max="600" className={`${createTournamentStyles.inputNumber} ${styles.select}`} value={options.match_interval_minutes} onChange={e => number('match_interval_minutes', e.target.value, 30)} />
            </label>
          </div>

          <Toggle id="require_screenshot" tip="requireScreenshot" label={tt("ui.require.screenshot.every.result.bf3a", "Require a screenshot with every result")} hint="Disputes are far easier to settle when there is a picture attached." checked={options.require_screenshot} onChange={v => set('require_screenshot', v)} />
        </div>

        {/* ------------------------------------------------------ rosters */}
        <div className={styles.group}>
          <h4 className={styles.groupTitle}>{tt("ui.rosters.bdba", "Rosters")}<InfoTip id="rosterLock" /></h4>

          <div className={styles.fieldRow}>
            <label className={styles.field} htmlFor="roster_lock">
              <span className={styles.fieldLabel}>{tt("ui.teams.can.change.their.a8af", "Teams can change their line-up until")}<InfoTip id="rosterLock" /></span>
              <select id="roster_lock" className={`${createTournamentStyles.inputText} ${createTournamentStyles.inputWithDropdown} ${styles.select}`} value={options.roster_lock} onChange={e => set('roster_lock', e.target.value)}>
                {ROSTER_LOCK_CHOICES.map(choice => <option key={choice.value} value={choice.value}>{tx(choice.label)}</option>)}
              </select>
            </label>

            <label className={styles.field} htmlFor="max_substitutes">
              <span className={styles.fieldLabel}>{tt("ui.substitutes.allowed.2dd1", "Substitutes allowed")}<InfoTip id="maxSubstitutes" /></span>
              <input id="max_substitutes" type="number" min="0" max="10" className={`${createTournamentStyles.inputNumber} ${styles.select}`} value={options.max_substitutes} onChange={e => number('max_substitutes', e.target.value, 0)} />
            </label>
          </div>
        </div>

        {/* --------------------------------------------------- who enters */}
        <div className={styles.group}>
          <h4 className={styles.groupTitle}>{tt("ui.who.can.enter.a8dd", "Who can enter")}<InfoTip id="restrictCountry" /></h4>
          <p className={styles.groupHint}>
            {tt("ui.anyone.who.does.not.2351", "Anyone who does not meet these is turned away at registration, before they pay\n            an entry fee.")}
          </p>

          <div className={styles.fieldRow}>
            <label className={styles.field} htmlFor="restrict_country">
              <span className={styles.fieldLabel}>{tt("ui.country.d523", "Country")}<InfoTip id="restrictCountry" /></span>
              <input id="restrict_country" type="text" placeholder={tt("ui.open.everyone.4558", "Open to everyone")} className={`${createTournamentStyles.inputText} ${styles.select}`} value={options.restrict_country} onChange={e => set('restrict_country', e.target.value)} />
            </label>

            <label className={styles.field} htmlFor="min_age">
              <span className={styles.fieldLabel}>{tt("ui.minimum.age.6d60", "Minimum age")}<InfoTip id="minAge" /></span>
              <input id="min_age" type="number" min="0" max="99" className={`${createTournamentStyles.inputNumber} ${styles.select}`} value={options.min_age} onChange={e => number('min_age', e.target.value, 0)} />
            </label>
          </div>

          <Toggle id="require_verified_email" tip="requireVerifiedEmail" label={tt("ui.verified.email.address.required.4ad7", "Verified email address required")} checked={options.require_verified_email} onChange={v => set('require_verified_email', v)} />
          <Toggle id="require_kyc" tip="requireKyc" label={tt("ui.verified.identity.required.299c", "Verified identity required")} hint="Already required automatically on any tournament that charges entry or pays a prize." checked={options.require_kyc} onChange={v => set('require_kyc', v)} />
        </div>
      </div>
    </div>;
};
export default TournamentOptions;