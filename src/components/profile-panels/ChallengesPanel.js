'use client';

/**
 * Somebody's challenge record, on their profile.
 *
 * CEO, 30 August 2026: "the results should also show on their profiles as
 * history and challenges should also show past matches and games and the data
 * also."
 *
 * Only confirmed results count. A score one side typed and the other has not
 * agreed to is still a claim, and a record built out of claims is a record of
 * what people said rather than what happened.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';

import { appLocale } from '@/lib/appLocale';
import { useT } from '@/i18n/LanguageProvider';
import styles from './ChallengesPanel.module.css';

const formatDate = iso => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString(appLocale(), {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

const ChallengesPanel = ({ username }) => {
  const tt = useT();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const [state, setState] = useState({ loading: true, error: '', rows: [], record: null });

  const load = useCallback(async () => {
    if (!username) return;
    try {
      const res = await fetch(`${apiUrl}/scrim/history/${encodeURIComponent(username)}/`);
      const body = await res.json();
      if (!res.ok) {
        setState({ loading: false, error: tt('msg.couldNotLoadChallengeHistory', 'Could not load the challenge history.'), rows: [], record: null });
        return;
      }
      setState({
        loading: false, error: '',
        rows: body?.data?.challenges || [],
        record: body?.data?.record || null,
      });
    } catch {
      setState({ loading: false, error: tt('msg.couldNotReachServer', 'Could not reach the server. Try again.'), rows: [], record: null });
    }
  }, [apiUrl, username, tt]);

  useEffect(() => { load(); }, [load]);

  if (state.loading) {
    return <p className={styles.state}>{tt('ui.loading.challenges.5a29', 'Loading challenges...')}</p>;
  }
  if (state.error) {
    return <p className={styles.state}>{state.error}</p>;
  }

  const r = state.record;

  return (
    <div className={styles.panel}>
      {r && <div className={styles.record}>
        <Stat label={tt('ui.played.6c19', 'Played')} value={r.played} />
        <Stat label={tt('ui.won.3a71', 'Won')} value={r.won} tone="win" />
        <Stat label={tt('ui.lost.8b24', 'Lost')} value={r.lost} tone="loss" />
        <Stat label={tt('ui.drawn.5c93', 'Drawn')} value={r.drawn} />
      </div>}

      {state.rows.length === 0
        ? <p className={styles.state}>
            {tt('ui.no.challenges.played.7f21', 'No challenges played yet.')}
          </p>
        : <>
          {/* Desktop */}
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{tt('ui.opponent.4548', 'Opponent')}</th>
                <th>{tt('ui.game.e3e8', 'Game')}</th>
                <th>{tt('ui.format.041a', 'Format')}</th>
                <th>{tt('ui.date.eb9a', 'Date')}</th>
                <th>{tt('ui.score.2d47', 'Score')}</th>
                <th>{tt('ui.result.9e32', 'Result')}</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map(row => <tr key={row.slug}>
                <td>
                  <Link href={`/community/challenge/${row.slug}`} className={styles.link}>
                    {opponentName(row, username)}
                  </Link>
                </td>
                <td>{row.game}</td>
                <td>{row.format || '-'}</td>
                <td>{formatDate(row.scheduled_at || row.created_at)}</td>
                <td className={styles.score}>{row.result ? `${row.result.score_a} - ${row.result.score_b}` : '-'}</td>
                <td><Outcome tt={tt} outcome={row.outcome} /></td>
              </tr>)}
            </tbody>
          </table>

          {/* Mobile: the same rows as cards, because a six-column table on a
              390px screen is either a horizontal scroll nobody finds or text
              too small to read. */}
          <div className={styles.cards}>
            {state.rows.map(row => <Link key={row.slug} href={`/community/challenge/${row.slug}`} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.cardName}>{opponentName(row, username)}</span>
                <Outcome tt={tt} outcome={row.outcome} />
              </div>
              <div className={styles.cardMeta}>
                {row.game} · {row.format || '-'} · {formatDate(row.scheduled_at || row.created_at)}
              </div>
              {row.result && <div className={styles.cardScore}>{row.result.score_a} - {row.result.score_b}</div>}
            </Link>)}
          </div>
        </>}
    </div>
  );
};

// Whose name to show: the other side's. `team_a` is whoever posted it, so for a
// challenge this person posted the opponent is `team_b`, and the other way
// round otherwise.
const opponentName = (row, username) => {
  const a = row.team_a?.name || '';
  const b = row.team_b?.name || '';
  const mine = a && a.toLowerCase() === String(username).toLowerCase();
  return (mine ? b : a) || b || a || '-';
};

const Stat = ({ label, value, tone }) => (
  <div className={styles.stat}>
    <span className={`${styles.statValue} ${tone ? styles['tone_' + tone] : ''}`}>{value}</span>
    <span className={styles.statLabel}>{label}</span>
  </div>
);

const Outcome = ({ tt, outcome }) => {
  const words = {
    won: tt('ui.won.3a71', 'Won'),
    lost: tt('ui.lost.8b24', 'Lost'),
    draw: tt('ui.drawn.5c93', 'Drawn'),
  };
  return <span className={`${styles.outcome} ${styles['outcome_' + outcome] || ''}`}>
    {words[outcome] || tt('ui.played.6c19', 'Played')}
  </span>;
};

export default ChallengesPanel;
