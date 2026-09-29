'use client';

// How a battle royale stage is scored, as the organiser sets it.
//
// CEO, 28 September 2026: "build it end to end ... including how they
// calculate and how point systems, mvps, tie breaker and all of that is set",
// and "you don't hardcode what number of squads can be in a lobby, leave that
// for the tournament organizers to decide". Every number here is the
// organiser's; the game only suggests where to start. The server cleans the
// same shape (`stage_settings.clean_battle_royale`), so nothing the form can
// send is a value the server does not understand.
//
// Used in two places: the stage builder, while the plan is being written, and
// the battle royale console, once the lobbies exist.

import { LuArrowDown, LuArrowUp, LuPlus, LuX } from 'react-icons/lu';
import { useT } from '@/i18n/LanguageProvider';
import styles from './br.module.css';

export const BR_PRESETS = {
  free_fire: { 1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1 },
  pubg_mobile: { 1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 6: 2, 7: 1, 8: 1 },
};

export const BR_TIEBREAKERS = ['placement_count', 'total_kills', 'last_map_placement',
  'placement_points', 'kill_points', 'best_placement', 'mvp_count', 'bonus',
  'fewest_penalties', 'maps_played'];

// The English behind each tiebreaker, which is also the dictionary fallback.
// `tiebreak.<key>` is the key the bracket view already reads.
export const TIEBREAK_WORDS = {
  placement_count: 'Most first places',
  total_kills: 'Most kills',
  last_map_placement: 'Placement in the last match',
  placement_points: 'Most placement points',
  kill_points: 'Most kill points',
  best_placement: 'Best single placement',
  mvp_count: 'Most match MVPs',
  bonus: 'Most bonus points',
  fewest_penalties: 'Fewest penalty points',
  maps_played: 'Fewest matches played',
};

const MVP_WORDS = { kills: 'Kills', damage: 'Damage', assists: 'Assists' };

export const defaultBR = (game = '') => {
  const pubg = /pubg/i.test(game || '');
  return {
    lobby_size: pubg ? 16 : 12,
    maps: 6,
    placement_preset: pubg ? 'pubg_mobile' : 'free_fire',
    placement_points: { ...(pubg ? BR_PRESETS.pubg_mobile : BR_PRESETS.free_fire) },
    per_kill: 1,
    per_assist: 0,
    per_1000_damage: 0,
    tiebreakers: ['placement_count', 'total_kills', 'last_map_placement'],
    mvp_criteria: ['kills', 'damage', 'assists'],
    mvp_scope: 'overall',
    match_point: 0,
    advance_by: 'overall',
    carry_over: {},
    check_in_minutes: 0,
    room_settings: '',
  };
};

const Chips = ({ value, options, onChange, disabled, label }) => (
  <div className={styles.chips} role="group" aria-label={label}>
    {options.map(([v, text]) => (
      <button key={String(v)} type="button" disabled={disabled}
              className={`${styles.chip} ${value === v ? styles.chipOn : ''}`}
              aria-pressed={value === v} onClick={() => onChange(v)}>
        {text}
      </button>
    ))}
  </div>
);

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

/** A place -> points table, typed row by row. */
const PlaceTable = ({ table, onChange, disabled, label, tt }) => {
  const rows = Object.entries(table || {})
    .map(([place, points]) => [Number(place), points])
    .sort((a, b) => a[0] - b[0]);
  const set = (place, points) => onChange({ ...table, [place]: points });
  const drop = place => {
    const next = { ...table };
    delete next[place];
    onChange(next);
  };
  const add = () => {
    const nextPlace = rows.length ? rows[rows.length - 1][0] + 1 : 1;
    if (nextPlace > 100) return;
    onChange({ ...table, [nextPlace]: 0 });
  };
  return (
    <div className={styles.placeTable} role="group" aria-label={label}>
      {rows.map(([place, points]) => (
        <div key={place} className={styles.placeRow}>
          <span className={styles.placeName}>
            {tt('br.placeN', 'Place {n}').replace('{n}', place)}
          </span>
          <input className={styles.number} type="number" min="0" max="1000" step="0.5"
                 value={points} disabled={disabled}
                 aria-label={tt('br.pointsForPlace', 'Points for place {n}').replace('{n}', place)}
                 onChange={e => set(place, num(e.target.value))} />
          <button type="button" className={styles.iconBtn} disabled={disabled}
                  aria-label={tt('br.removePlace', 'Remove place {n}').replace('{n}', place)}
                  onClick={() => drop(place)}>
            <LuX aria-hidden="true" />
          </button>
        </div>
      ))}
      <button type="button" className={styles.ghost} disabled={disabled} onClick={add}>
        <LuPlus aria-hidden="true" /> {tt('br.addPlace', 'Add a place')}
      </button>
    </div>
  );
};

/** An ordered list the organiser reorders, adds to and removes from. */
const OrderedPicker = ({ chosen, all, words, prefix, onChange, disabled, label, tt, keepOne }) => {
  const move = (i, by) => {
    const next = [...chosen];
    const to = i + by;
    if (to < 0 || to >= next.length) return;
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };
  const left = all.filter(k => !chosen.includes(k));
  return (
    <div className={styles.ordered} role="group" aria-label={label}>
      <ol className={styles.orderedList}>
        {chosen.map((key, i) => (
          <li key={key} className={styles.orderedRow}>
            <span className={styles.order}>{i + 1}</span>
            <span className={styles.orderedName}>{tt(`${prefix}.${key}`, words[key] || key)}</span>
            <span className={styles.rowActions}>
              <button type="button" className={styles.iconBtn} disabled={disabled || i === 0}
                      aria-label={tt('rules.moveUp', 'Move up')} onClick={() => move(i, -1)}>
                <LuArrowUp aria-hidden="true" />
              </button>
              <button type="button" className={styles.iconBtn} disabled={disabled || i === chosen.length - 1}
                      aria-label={tt('rules.moveDown', 'Move down')} onClick={() => move(i, 1)}>
                <LuArrowDown aria-hidden="true" />
              </button>
              <button type="button" className={styles.iconBtn}
                      disabled={disabled || (keepOne && chosen.length < 2)}
                      aria-label={tt('br.removeRule', 'Remove')}
                      onClick={() => onChange(chosen.filter(k => k !== key))}>
                <LuX aria-hidden="true" />
              </button>
            </span>
          </li>
        ))}
      </ol>
      {left.length > 0 && (
        <div className={styles.chips}>
          {left.map(key => (
            <button key={key} type="button" className={styles.chip} disabled={disabled}
                    onClick={() => onChange([...chosen, key])}>
              <LuPlus aria-hidden="true" /> {tt(`${prefix}.${key}`, words[key] || key)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * @param value     the settings object (see defaultBR)
 * @param onChange  (next) => void
 * @param isLast    the stage decides the tournament: no advancing, no carry-over
 * @param drawn     lobbies exist: the lobby size is fixed (move squads instead)
 */
export default function BRSettingsFields({ value, onChange, disabled = false, isLast = true,
                                           drawn = false }) {
  const tt = useT();
  const s = value || defaultBR();
  const set = (key, v) => onChange({ ...s, [key]: v });

  const pickPreset = preset => {
    if (preset === 'custom') {
      onChange({ ...s, placement_preset: 'custom' });
      return;
    }
    onChange({ ...s, placement_preset: preset, placement_points: { ...BR_PRESETS[preset] } });
  };

  return (
    <div className={styles.settings}>
      <p className={styles.subhead}>{tt('br.lobbiesHead', 'Lobbies')}</p>
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{tt('br.lobbySize', 'Squads in a lobby')}</span>
          <input className={styles.number} type="number" min="2" max="100"
                 value={s.lobby_size} disabled={disabled || drawn}
                 onChange={e => set('lobby_size', num(e.target.value, 12))} />
          {drawn && <span className={styles.note}>
            {tt('br.lobbySizeFixed', 'The lobbies are drawn. Move a squad between lobbies instead.')}
          </span>}
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{tt('br.maps', 'Matches each lobby plays')}</span>
          <input className={styles.number} type="number" min="1" max="30"
                 value={s.maps} disabled={disabled}
                 onChange={e => set('maps', num(e.target.value, 6))} />
        </label>
      </div>

      <p className={styles.subhead}>{tt('br.scoringHead', 'Points')}</p>
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{tt('br.placementTable', 'Placement points')}</span>
        <Chips value={s.placement_preset} disabled={disabled}
               label={tt('br.placementTable', 'Placement points')}
               options={[['free_fire', tt('br.presetFreeFire', 'Free Fire (12 down to 1 for tenth)')],
                         ['pubg_mobile', tt('br.presetPubg', 'PUBG Mobile (10 down to 1 for eighth)')],
                         ['custom', tt('br.presetCustom', 'My own table')]]}
               onChange={pickPreset} />
      </div>
      {s.placement_preset === 'custom' && (
        <PlaceTable table={s.placement_points} disabled={disabled} tt={tt}
                    label={tt('br.placementTable', 'Placement points')}
                    onChange={table => set('placement_points', table)} />
      )}
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{tt('br.perKill', 'Points a kill')}</span>
          <input className={styles.number} type="number" min="0" max="100" step="0.5"
                 value={s.per_kill} disabled={disabled}
                 onChange={e => set('per_kill', num(e.target.value))} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{tt('br.perAssist', 'Points an assist (0 for none)')}</span>
          <input className={styles.number} type="number" min="0" max="100" step="0.5"
                 value={s.per_assist} disabled={disabled}
                 onChange={e => set('per_assist', num(e.target.value))} />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>{tt('br.perDamage', 'Points per 1,000 damage (0 for none)')}</span>
          <input className={styles.number} type="number" min="0" max="100" step="0.5"
                 value={s.per_1000_damage} disabled={disabled}
                 onChange={e => set('per_1000_damage', num(e.target.value))} />
        </label>
      </div>
      <p className={styles.note}>
        {tt('br.scoringNote', 'A squad that did not play a match gets no placement points for it. Bonus and penalty points are added per match when results are entered, each with a reason.')}
      </p>

      <p className={styles.subhead}>{tt('br.tiebreakHead', 'Level on points')}</p>
      <p className={styles.note}>
        {tt('br.tiebreakNote', 'The first rule that separates two squads decides. Put them in the order you want.')}
      </p>
      <OrderedPicker chosen={s.tiebreakers || []} all={BR_TIEBREAKERS} words={TIEBREAK_WORDS}
                     prefix="tiebreak" disabled={disabled} tt={tt}
                     label={tt('br.tiebreakHead', 'Level on points')}
                     onChange={list => set('tiebreakers', list)} />

      <p className={styles.subhead}>{tt('br.mvpHead', 'MVP')}</p>
      <p className={styles.note}>
        {tt('br.mvpNote', 'Each match has an MVP, chosen by these in order. The stage MVP is whoever was match MVP most often.')}
      </p>
      <OrderedPicker chosen={s.mvp_criteria || []} all={['kills', 'damage', 'assists']}
                     words={MVP_WORDS} prefix="br.mvp" disabled={disabled} tt={tt} keepOne
                     label={tt('br.mvpHead', 'MVP')}
                     onChange={list => set('mvp_criteria', list)} />
      <div className={styles.field}>
        <span className={styles.fieldLabel}>{tt('br.mvpScope', 'Who can be a match MVP')}</span>
        <Chips value={s.mvp_scope} disabled={disabled} label={tt('br.mvpScope', 'Who can be a match MVP')}
               options={[['overall', tt('br.mvpOverall', 'Anybody in the lobby')],
                         ['winning_team', tt('br.mvpWinners', 'Only the squad that won the match')]]}
               onChange={v => set('mvp_scope', v)} />
      </div>

      <p className={styles.subhead}>{tt('br.matchPointHead', 'Match point')}</p>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>
          {tt('br.matchPoint', 'Points that put a squad on match point (0 for off)')}
        </span>
        <input className={styles.number} type="number" min="0" max="10000"
               value={s.match_point} disabled={disabled}
               onChange={e => set('match_point', num(e.target.value))} />
      </label>
      <p className={styles.note}>
        {tt('br.matchPointNote', 'Once a squad is at or over this total, the first match it wins takes the lobby, whatever the points say.')}
      </p>

      {!isLast && <>
        <p className={styles.subhead}>{tt('br.throughHead', 'Going through')}</p>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{tt('br.advanceBy', 'How many go through is counted')}</span>
          <Chips value={s.advance_by} disabled={disabled} label={tt('br.advanceBy', 'How many go through is counted')}
                 options={[['overall', tt('br.advanceOverall', 'Across the whole stage')],
                           ['lobby', tt('br.advanceLobby', 'From each lobby')]]}
                 onChange={v => set('advance_by', v)} />
        </div>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>
            {tt('br.carryOver', 'Head start in the next stage, by finishing place (optional)')}
          </span>
          <PlaceTable table={s.carry_over || {}} disabled={disabled} tt={tt}
                      label={tt('br.carryOver', 'Head start in the next stage, by finishing place (optional)')}
                      onChange={table => set('carry_over', table)} />
        </div>
      </>}

      <p className={styles.subhead}>{tt('br.roomHead', 'In the game')}</p>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>
          {tt('br.roomSettings', 'What to set up in the custom room (squads see this)')}
        </span>
        <input className={styles.text} maxLength={400} disabled={disabled}
               value={s.room_settings || ''}
               placeholder={tt('br.roomSettingsPlaceholder', 'For example: Bermuda, squads, no character skills')}
               onChange={e => set('room_settings', e.target.value)} />
      </label>
    </div>
  );
}
