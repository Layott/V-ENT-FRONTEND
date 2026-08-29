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

const Table = ({ title, subtitle, rows, tt }) => {
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
              <th className={styles.ptsCol}>{tt('table.pts', 'Pts')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={`${row.registration_id || ''}-${row.name}`}>
                <td className={styles.posCol}>{row.position}</td>
                <td className={styles.nameCol}>{row.name}</td>
                {COLUMNS.map(([key]) => (
                  <td key={key} className={styles.numCol}>
                    {key === 'goal_difference' && row[key] > 0 ? `+${row[key]}` : row[key]}
                  </td>
                ))}
                <td className={styles.ptsCol}>{row.points}</td>
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

      <Table
        tt={tt}
        title={tt('table.teams', 'Team table')}
        subtitle={seats > 1
          ? tt('table.teamsSub', 'Scored on the fixture: the aggregate across all its matches.')
          : null}
        rows={data.team_table}
      />

      <Table
        tt={tt}
        title={tt('table.players', 'Player table')}
        subtitle={tt('table.playersSub', "Scored on each player's own match. Somebody can win here while their side loses the fixture.")}
        rows={data.player_table}
      />
    </div>
  );
}
