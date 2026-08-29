'use client';

// Who played best, and the arithmetic behind it.
//
// The breakdown is the point. An MVP that appears with no numbers under it is
// an opinion, and the argument that follows it is unresolvable - which is why
// the PRD asks for the award to be recorded together with "which metrics" it
// was based on. So this table shows the score AND every column that made it,
// and states what each column is worth.
//
// Public, because a result that only its organiser can see is a trophy in a
// drawer.

import { useState, useEffect, useCallback } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { appLocale } from '@/lib/appLocale';
import styles from './mvp.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const show = (value, decimals) => Number(value || 0).toLocaleString(appLocale(), {
  minimumFractionDigits: decimals || 0,
  maximumFractionDigits: decimals || 0,
});

export default function MvpPanel({ tournamentId }) {
  const tt = useT();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!tournamentId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/tournament/${tournamentId}/mvp/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') setData(body.data);
      else setError(tt('mvp.failed', 'Could not load the player stats.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      // Cleared whatever happened, or the panel spins for ever on a guard.
      setLoading(false);
    }
  }, [tournamentId, tt]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className={styles.state}>{tt('ui.loading', 'Loading...')}</p>;
  if (error) return <p className={styles.state}>{error}</p>;
  if (!data) return null;

  const metrics = data.metrics || [];
  const rows = data.table || [];
  const award = data.award;

  if (!rows.length) {
    return <p className={styles.state}>
      {tt('mvp.none', 'No player stats have been recorded yet. The organiser adds them as matches are played.')}
    </p>;
  }

  return (
    <div className={styles.wrap}>
      {award && <div className={styles.award}>
        <span className={styles.awardLabel}>{tt('mvp.award', 'Most valuable player')}</span>
        <strong className={styles.awardName}>{award.username}</strong>
        <span className={styles.awardScore}>
          {tt('mvp.awardScore', '{n} points').replace('{n}', show(award.score, 1))}
        </span>
        {/* When the organiser picked somebody the arithmetic did not, the
            reason is shown rather than hidden. It is what makes it a decision
            instead of a surprise. */}
        {award.overridden && award.reason && <span className={styles.awardReason}>
          {award.reason}
        </span>}
      </div>}

      <p className={styles.scoring}>
        {tt('mvp.scoring', 'The score is what each of these is worth, added up:')}
        {' '}
        {metrics.map((m, i) => (
          <span key={m.key}>
            {i > 0 ? ', ' : ''}
            {m.label} <span className={styles.weight}>&times;{m.weight}</span>
          </span>
        ))}
      </p>

      <div className={styles.scroller}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.posCol}>#</th>
              <th className={styles.nameCol}>{tt('mvp.player', 'Player')}</th>
              <th className={styles.numCol}>{tt('mvp.matches', 'Matches')}</th>
              {metrics.map(m => <th key={m.key} className={styles.numCol}>{m.label}</th>)}
              <th className={styles.ptsCol}>{tt('mvp.score', 'Score')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.player_id}>
                <td className={styles.posCol}>{row.position}</td>
                <td className={styles.nameCol}>
                  {row.username}
                  {row.side && <span className={styles.side}>{row.side}</span>}
                </td>
                <td className={styles.numCol}>{row.matches}</td>
                {metrics.map(m => <td key={m.key} className={styles.numCol}>
                  {show(row.metrics?.[m.key], m.decimals)}
                </td>)}
                <td className={styles.ptsCol}>{show(row.score, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
