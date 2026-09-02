'use client';

// Both tables of a league, live, from the same results.
//
// "for every tournament, there should always be two types of results if it's a
// team tournament, the team result/table, and then individual player results
// /table also."
//
// A player can win their own match while their country loses the fixture, and
// both tables have to record that correctly. That is the whole reason there are
// two, and it is why they are drawn side by side rather than one behind a
// toggle: the pair is the point.
//
// Goal difference is a column, not a hover. Four matches is a very short sample
// and goal difference will decide places, probably more than once, so it has to
// be readable off the screen during the event.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import styles from './standings.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const COLUMNS = [
  ['played', 'table.p', 'P', 'table.playedFull', 'Played'],
  ['won', 'table.w', 'W', 'table.wonFull', 'Won'],
  ['drawn', 'table.d', 'D', 'table.drawnFull', 'Drawn'],
  ['lost', 'table.l', 'L', 'table.lostFull', 'Lost'],
  ['goals_for', 'table.gf', 'GF', 'table.gfFull', 'Goals for'],
  ['goals_against', 'table.ga', 'GA', 'table.gaFull', 'Goals against'],
  ['goal_difference', 'table.gd', 'GD', 'table.gdFull', 'Goal difference'],
];

// The rest of what a league keeps, from the CADE calculator. Behind a toggle
// rather than always on: a table with twenty columns is one nobody reads on a
// phone, and the seven above are what somebody checks first. Everything here
// is already in the payload, so showing them costs no request.
const EXTRA_COLUMNS = [
  ['clean_sheets', 'table.cs', 'CS', 'table.csFull', 'Clean sheets'],
  ['average_goals_for', 'table.avgGf', 'AvgF', 'table.avgGfFull', 'Average goals for'],
  ['average_goals_against', 'table.avgGa', 'AvgA', 'table.avgGaFull', 'Average goals against'],
  ['win_rate', 'table.wr', 'Win%', 'table.wrFull', 'Win rate'],
  ['biggest_win', 'table.bw', 'Best', 'table.bwFull', 'Biggest win'],
  ['biggest_loss', 'table.bl', 'Worst', 'table.blFull', 'Biggest loss'],
  ['walkovers_received', 'table.wo', 'W/O', 'table.woFull', 'Walkovers received'],
  ['walkovers_given', 'table.wog', 'W/O-', 'table.wogFull', 'Walkovers given'],
  ['points_per_game', 'table.ppg', 'PPG', 'table.ppgFull', 'Points per game'],
  ['form_score', 'table.form', 'Form', 'table.formFull', 'Form over the recent matches'],
];

// A rate reads as 0.53 in the payload and as 53% to a person; an average reads
// as 5.315789 and is meaningless past one decimal.
const show = (key, value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (key === 'win_rate') return `${Math.round(value * 100)}%`;
  if (key === 'form_score') return `${Math.round(value)}%`;
  if (key.startsWith('average_')) return Number(value).toFixed(1);
  return value;
};

const Table = ({ title, subtitle, rows, tt, detailed, onPick }) => {
  if (!rows || rows.length === 0) {
    return (
      <section className={styles.block}>
        <h3 className={styles.blockTitle}>{title}</h3>
        <p className={styles.empty}>
          {tt('table.empty', 'Nothing played yet. The table fills in as results are recorded.')}
        </p>
      </section>
    );
  }

  return (
    <section className={styles.block}>
      <h3 className={styles.blockTitle}>{title}</h3>
      {subtitle && <p className={styles.blockSub}>{subtitle}</p>}
      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.posCol}>{tt('table.pos', '#')}</th>
              <th className={styles.nameCol}>{tt('table.name', 'Name')}</th>
              {COLUMNS.map(([key, abbr, abbrFallback, full, fullFallback]) => (
                <th key={key} className={styles.numCol}>
                  {/* Abbreviated on screen, spelled out for a screen reader:
                      "GD" is unreadable aloud and everybody knows it. */}
                  <abbr title={tt(full, fullFallback)}>{tt(abbr, abbrFallback)}</abbr>
                </th>
              ))}
              {detailed && EXTRA_COLUMNS.map(([key, abbr, abbrFallback, full, fullFallback]) => (
                <th key={key} className={styles.numCol}>
                  <abbr title={tt(full, fullFallback)}>{tt(abbr, abbrFallback)}</abbr>
                </th>
              ))}
              <th className={styles.ptsCol}>{tt('table.pts', 'Pts')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={`${row.registration_id || ''}-${row.name}`}
                  className={onPick ? styles.pickable : undefined}
                  onClick={onPick ? () => onPick(row) : undefined}>
                <td className={styles.posCol}>{row.position}</td>
                <td className={styles.nameCol}>{row.name}</td>
                {COLUMNS.map(([key]) => (
                  <td key={key} className={styles.numCol}>
                    {key === 'goal_difference' && row[key] > 0 ? `+${row[key]}` : row[key]}
                  </td>
                ))}
                {detailed && EXTRA_COLUMNS.map(([key]) => (
                  <td key={key} className={styles.numCol}>{show(key, row[key])}</td>
                ))}
                <td className={styles.ptsCol}>
                  {row.points}
                  {/* A deduction shown where the points are, because a total
                      that silently differs from the results is the one thing
                      a table cannot afford. */}
                  {!!row.points_adjustment && <span className={styles.adjusted}
                        title={(row.adjustments || [])
                          .map(a => `${a.metric} ${a.value > 0 ? '+' : ''}${a.value}: ${a.reason}`)
                          .join(', ')}>
                    {row.points_adjustment > 0 ? `+${row.points_adjustment}` : row.points_adjustment}
                  </span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default function StandingsPanel({ tournamentId }) {
  const tt = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Off by default. A table with twenty columns is one nobody reads on a
  // phone, and the seven basic ones are what somebody checks first.
  const [detailed, setDetailed] = useState(false);
  const [picked, setPicked] = useState(null);

  const load = useCallback(async () => {
    if (!tournamentId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/standings/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') setData(body.data);
      else setError(tt('table.failed', 'Could not load the table.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      // Cleared whatever happened, or the panel spins for ever on a guard.
      setLoading(false);
    }
  }, [tournamentId, tt]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <p className={styles.state}>{tt('ui.loading', 'Loading…')}</p>;
  }
  if (error) {
    return <p className={styles.state}>{error}</p>;
  }
  if (!data) return null;

  const rules = data.rules || {};
  const seats = Number(rules.players_per_team || 1);
  const settings = data.stat_settings || {};

  return (
    <div className={styles.wrap}>
      {/* How this is scored, said once at the top rather than left for people
          to infer from the numbers. */}
      <p className={styles.scoring}>
        {tt('table.scoring', '{w} points a win, {d} a draw, {l} a loss.')
          .replace('{w}', rules.points_win ?? 3)
          .replace('{d}', rules.points_draw ?? 1)
          .replace('{l}', rules.points_loss ?? 0)}
        {seats > 1 && ' '}
        {seats > 1 && tt('table.aggregate', 'A fixture is {n} matches and is decided on goals added across them, not on how many were won.')
          .replace('{n}', seats)}
      </p>

      <div className={styles.controls}>
        <button type="button"
                className={detailed ? styles.toggleOn : styles.toggleOff}
                onClick={() => setDetailed(d => !d)}>
          {detailed
            ? tt('table.fewerColumns', 'Fewer columns')
            : tt('table.moreColumns', 'Every stat')}
        </button>
        {/* How the debatable ones are being worked out, said plainly. Two
            leagues can run the same fixtures and produce different tables,
            and a reader deserves to know which one this is. */}
        {settings.win_rate_method && <span className={styles.how}>
          {settings.win_rate_method === 'wins_and_half_draws'
            ? tt('table.howWinRateHalf', 'Win rate counts a draw as half a win.')
            : tt('table.howWinRateWins', 'Win rate is wins over games played.')}
          {' '}
          {settings.walkover_goals_count
            ? tt('table.howWoGoals', 'Walkover goals count towards goal difference.')
            : tt('table.howWoNoGoals', 'Walkover goals do not touch goal difference.')}
        </span>}
      </div>

      <Table
        tt={tt}
        detailed={detailed}
        onPick={setPicked}
        title={tt('table.teams', 'Team table')}
        subtitle={seats > 1
          ? tt('table.teamsSub', 'Scored on the fixture: the aggregate across all its matches.')
          : null}
        rows={data.team_table}
      />

      <Table
        tt={tt}
        detailed={detailed}
        onPick={setPicked}
        title={tt('table.players', 'Player table')}
        subtitle={tt('table.playersSub', "Scored on each player's own match. Somebody can win here while their side loses the fixture.")}
        rows={data.player_table}
      />

      {picked && <PlayerCard row={picked} tt={tt} onClose={() => setPicked(null)} />}
    </div>
  );
}

/** One entrant's full record, which a table row cannot hold. */
function PlayerCard({ row, tt, onClose }) {
  const lines = [
    ['table.playedFull', 'Played', row.played],
    ['table.wonFull', 'Won', row.won ?? row.wins],
    ['table.drawnFull', 'Drawn', row.drawn ?? row.draws],
    ['table.lostFull', 'Lost', row.lost ?? row.losses],
    ['table.gfFull', 'Goals for', row.goals_for],
    ['table.gaFull', 'Goals against', row.goals_against],
    ['table.gdFull', 'Goal difference', row.goal_difference],
    ['table.csFull', 'Clean sheets', row.clean_sheets],
    ['table.avgGfFull', 'Average goals for', show('average_goals_for', row.average_goals_for)],
    ['table.avgGaFull', 'Average goals against', show('average_goals_against', row.average_goals_against)],
    ['table.wrFull', 'Win rate', show('win_rate', row.win_rate)],
    ['table.bwFull', 'Biggest win', row.biggest_win],
    ['table.blFull', 'Biggest loss', row.biggest_loss],
    ['table.woFull', 'Walkovers received', row.walkovers_received],
    ['table.wogFull', 'Walkovers given', row.walkovers_given],
    ['table.ppgFull', 'Points per game', show('points_per_game', row.points_per_game)],
    ['table.formFull', 'Form over the recent matches', show('form_score', row.form_score)],
  ];

  return (
    <div className={styles.cardWrap} role="dialog" aria-label={row.name}>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <p className={styles.cardName}>{row.name}</p>
          <button type="button" className={styles.cardClose} onClick={onClose}>
            {tt('ui.close', 'Close')}
          </button>
        </div>

        <p className={styles.cardPts}>
          {row.points} {tt('table.pointsWord', 'points')}
          {!!row.points_adjustment && <span className={styles.adjusted}>
            {row.points_adjustment > 0 ? `+${row.points_adjustment}` : row.points_adjustment}
          </span>}
        </p>

        <div className={styles.cardGrid}>
          {lines.map(([key, fallback, value]) => (
            <div key={key} className={styles.cardCell}>
              <span className={styles.cardLabel}>{tt(key, fallback)}</span>
              <span className={styles.cardValue}>
                {value === null || value === undefined ? '-' : value}
              </span>
            </div>
          ))}
        </div>

        {/* Why a total differs from the results, in the words somebody wrote
            when they made the decision. */}
        {!!(row.adjustments || []).length && <div className={styles.cardAdjust}>
          <p className={styles.cardLabel}>{tt('table.adjustments', 'Adjustments')}</p>
          {row.adjustments.map((a, i) => (
            <p key={i} className={styles.cardAdjustRow}>
              <strong>{a.metric} {a.value > 0 ? `+${a.value}` : a.value}</strong>
              {' '}{a.reason}
            </p>
          ))}
        </div>}
      </div>
    </div>
  );
}
