'use client';

// How a league is scored, asked only of leagues.
//
// A round robin decided by a table needs three things a knockout does not: how
// many points a result is worth, what separates two sides level on points, and
// how many players each side fields inside one fixture. Asking those on every
// format would clutter a knockout with settings that mean nothing; not asking
// them at all is why the CEO could not build the Rivalry Series on the site.
//
// The seat count is the one that changes the shape of the competition rather
// than the arithmetic. Above one, a fixture stops being a match and becomes a
// tie made of that many matches, decided on goals added across them. Seat one
// only ever faces seat one, which is what the preview below spells out - it is
// the rule people get wrong, and getting it wrong quietly is worse than
// getting it wrong loudly.

import { useEffect, useMemo, useState } from 'react';
import { FiChevronDown, FiChevronUp, FiInfo } from 'react-icons/fi';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import styles from './league-setup.module.css';
import { useT } from '@/i18n/LanguageProvider';

// Every format whose winner comes off a table rather than out of a bracket.
const TABLE_FORMATS = new Set([
  'round-robin', 'round_robin', 'roundrobin', 'rr',
  'league', 'ladder', 'aggregate_2v2', 'aggregate-2v2',
]);

export const isLeagueFormat = value => TABLE_FORMATS.has(
  String(value || '').trim().toLowerCase());

// The six the CEO listed, in the order they gave them. The organiser reorders.
const TIEBREAKS = [
  ['goal_difference', 'league.tbGoalDifference', 'Goal difference'],
  ['goals_for', 'league.tbGoalsFor', 'Goals scored'],
  ['head_to_head', 'league.tbHeadToHead', 'Head to head'],
  ['wins', 'league.tbWins', 'Most wins'],
];

const DEFAULT_ORDER = TIEBREAKS.map(([key]) => key);

export default function LeagueSetup({ formData = {}, updateFormData }) {
  const tt = useT();

  const seats = Number(formData.players_per_team ?? formData.team_size ?? 1) || 1;
  const pointsWin = formData.points_win ?? 3;
  const pointsDraw = formData.points_draw ?? 1;
  const pointsLoss = formData.points_loss ?? 0;

  const [order, setOrder] = useState(() => {
    const saved = Array.isArray(formData.tiebreakers) ? formData.tiebreakers : [];
    const known = saved.filter(k => DEFAULT_ORDER.includes(k));
    // Anything the organiser has not placed keeps its default position at the
    // end, so adding a tiebreak later never silently drops one they had.
    return [...known, ...DEFAULT_ORDER.filter(k => !known.includes(k))];
  });

  useEffect(() => {
    updateFormData('tiebreakers', order);
  }, [order, updateFormData]);

  // Write the defaults down the first time this is shown. What the boxes
  // display has to be what the draft holds: leaving them unwritten means
  // somebody who reads "3 points a win", agrees with it and touches nothing
  // sends no points at all, and the server has to guess the same numbers back.
  // A shown value that is not a saved value is a lie the form is telling.
  useEffect(() => {
    if (formData.points_win === undefined) updateFormData('points_win', 3);
    if (formData.points_draw === undefined) updateFormData('points_draw', 1);
    if (formData.points_loss === undefined) updateFormData('points_loss', 0);
    if (formData.players_per_team === undefined) {
      updateFormData('players_per_team', Number(formData.team_size) || 1);
    }
    // Deliberately once, on mount. Re-running would fight the organiser as
    // they type, putting 3 back the moment they clear the box.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const move = (index, by) => setOrder(prev => {
    const next = [...prev];
    const to = index + by;
    if (to < 0 || to >= next.length) return prev;
    [next[index], next[to]] = [next[to], next[index]];
    return next;
  });

  const entrants = Number(formData.max_number_of_participants
    || formData.min_number_of_participants || 0);

  // What the organiser is actually about to run. Ten fixtures of two seats is
  // twenty matches on the floor, and the day plan is built from that number,
  // not from the fixture count.
  const shape = useMemo(() => {
    if (!entrants || entrants < 2) return null;
    const fixtures = (entrants * (entrants - 1)) / 2;
    return {
      fixtures,
      matches: fixtures * seats,
      each: entrants - 1,
      maxPoints: (entrants - 1) * Number(pointsWin || 0),
    };
  }, [entrants, seats, pointsWin]);

  const num = (key, value) => updateFormData(key, value.replace(/[^0-9]/g, ''));

  return (
    <div className={createTournamentStyles.createSubSectionContainer}>
      <div className={createTournamentStyles.innerCreateSubSectionContainer}>
        <h3 className={createTournamentStyles.tournamentTypeH3}>
          {tt('league.title', 'How the table is scored')}
        </h3>
        <p className={styles.lead}>
          {tt('league.lead', 'This format is decided by a table rather than by a bracket, so these are the numbers behind it.')}
        </p>

        {/* Seats. The setting that changes the shape rather than the sums. */}
        <label className={styles.field}>
          <span className={styles.label}>
            {tt('league.seats', 'Players each side fields in one fixture')}
          </span>
          <input className={styles.input} type="number" min="1" max="10"
                 value={seats}
                 onChange={e => num('players_per_team', e.target.value)} />
          <span className={styles.hint}>
            {seats > 1
              ? tt('league.seatsMany', 'Each fixture is {n} matches, one per seat. Seat 1 only ever faces seat 1, and the fixture is decided on goals added across all {n}, never on how many matches were won.')
                .replace(/\{n\}/g, String(seats))
              : tt('league.seatsOne', 'One player a side, so a fixture is a single match.')}
          </span>
        </label>

        {seats > 1 && (
          <div className={styles.worked}>
            <p className={styles.workedTitle}>
              <FiInfo aria-hidden="true" />
              {tt('league.workedTitle', 'What that means on a scoresheet')}
            </p>
            {/* The CEO's own example. Somebody setting this up should see the
                counter-intuitive case before they run it, not after. */}
            <pre className={styles.workedBody}>{
`${tt('league.seatWord', 'seat')} 1   A 3 - 0 B
${tt('league.seatWord', 'seat')} 2   A 0 - 2 B
${tt('league.workedAggregate', 'aggregate')}   A 3 - 2 B  ${tt('league.workedWho', 'A take the fixture')}`}</pre>
            <p className={styles.workedNote}>
              {tt('league.workedNote', 'A lost one of the two matches and still won the fixture. A level aggregate is a draw, with no decider.')}
            </p>
          </div>
        )}

        {/* Points. */}
        <div className={styles.points}>
          {[
            ['points_win', 'league.pointsWin', 'Points for a win', pointsWin],
            ['points_draw', 'league.pointsDraw', 'Points for a draw', pointsDraw],
            ['points_loss', 'league.pointsLoss', 'Points for a loss', pointsLoss],
          ].map(([key, label, fallback, value]) => (
            <label key={key} className={styles.field}>
              <span className={styles.label}>{tt(label, fallback)}</span>
              <input className={styles.input} type="number" min="0" max="99"
                     value={value}
                     onChange={e => num(key, e.target.value)} />
            </label>
          ))}
        </div>

        {/* Tiebreak order. The order IS the setting. */}
        <p className={styles.label}>{tt('league.tiebreaks', 'What separates two sides level on points')}</p>
        <p className={styles.hint}>
          {tt('league.tiebreaksHint', 'Applied in this order, top first. The first one that separates them decides it. Both tables use the same order.')}
        </p>
        <ol className={styles.tbList}>
          {order.map((key, index) => {
            const row = TIEBREAKS.find(([k]) => k === key);
            if (!row) return null;
            return (
              <li key={key} className={styles.tbRow}>
                <span className={styles.tbRank}>{index + 1}</span>
                <span className={styles.tbName}>{tt(row[1], row[2])}</span>
                <span className={styles.tbMove}>
                  <button type="button" className={styles.tbBtn} disabled={index === 0}
                          onClick={() => move(index, -1)}
                          aria-label={tt('league.moveUp', 'Move up')}>
                    <FiChevronUp aria-hidden="true" />
                  </button>
                  <button type="button" className={styles.tbBtn}
                          disabled={index === order.length - 1}
                          onClick={() => move(index, 1)}
                          aria-label={tt('league.moveDown', 'Move down')}>
                    <FiChevronDown aria-hidden="true" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
        <p className={styles.hint}>
          {tt('league.tiebreakLast', 'If everything above is still level, the organiser decides. V-ENT does not toss a coin for you.')}
        </p>

        {/* What they are about to run, in numbers. */}
        {shape && (
          <div className={styles.shape}>
            <p className={styles.shapeTitle}>{tt('league.shape', 'What this builds')}</p>
            <ul className={styles.shapeList}>
              <li>
                <strong>{shape.fixtures}</strong>
                <span>{tt('league.shapeFixtures', 'fixtures, every pair meeting once')}</span>
              </li>
              <li>
                <strong>{shape.matches}</strong>
                <span>{tt('league.shapeMatches', 'matches to actually run')}</span>
              </li>
              <li>
                <strong>{shape.each}</strong>
                <span>{tt('league.shapeEach', 'fixtures each')}</span>
              </li>
              <li>
                <strong>{shape.maxPoints}</strong>
                <span>{tt('league.shapeMax', 'points at most')}</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
