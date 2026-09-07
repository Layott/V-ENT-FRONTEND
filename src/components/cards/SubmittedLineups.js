'use client';

// Every squad submitted for this tournament, for the organiser running it.
//
// `tournament/<id>/lineups/` was written as "the organiser's list, and a
// broadcast's" and then nothing on the site ever called it. An organiser
// running an EAFC tournament had no way to see who had submitted and who had
// not, which is the one question worth asking in the hour before a deadline.
//
// It shows who is missing as well as who is in. A list of the people who did
// the thing does not answer "who do I have to chase", and chasing is the actual
// job.

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import UserChip from '@/components/user-chip/UserChip';
import styles from './lineup-rules.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

// Saving and submitting are different acts, and the payload keeps them apart:
// draft, submitted, accepted, rejected. Collapsing them into "done / not done"
// would hide the one an organiser has to act on, which is `submitted`.
const STATUS = (tt) => ({
  draft: tt('lineups.status.draft', 'Started, not submitted'),
  submitted: tt('lineups.status.submitted', 'Submitted, awaiting review'),
  accepted: tt('lineups.status.accepted', 'Accepted'),
  rejected: tt('lineups.status.rejected', 'Rejected'),
});

export default function SubmittedLineups({ tournamentRef, token }) {
  const tt = useT();
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [submitted, setSubmitted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!tournamentRef) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/tournament/${tournamentRef}/lineups/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'success') {
        setRows(body.data.lineups || []);
        setCount(Number(body.data.count || 0));
        setSubmitted(Number(body.data.submitted || 0));
        setError('');
      } else if (!quiet) {
        setError(apiMessage(tt, body, 'lineups.loadFailed', 'Could not load the squads.'));
      }
    } catch (err) {
      if (!quiet) {
        setError(apiMessage(tt, err, 'lineups.loadFailed', 'Could not load the squads.'));
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [tournamentRef, token, tt]);

  // Squads arrive right up to the deadline, which is exactly when an organiser
  // is watching this and cannot be reloading it by hand.
  useAutoRefresh(() => load({ quiet: true }), [], { interval: 15000 });

  useEffect(() => { load(); }, [load]);

  if (loading) return <p className={styles.muted}>{tt('lineups.loading', 'Loading...')}</p>;

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>{tt('lineups.title', 'Squads submitted')}</h3>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <p className={styles.state}>
        {tt('lineups.count', '{done} of {all} players have submitted a complete squad.')
          .replace('{done}', String(submitted))
          .replace('{all}', String(count))}
      </p>

      {rows.length === 0 ? (
        <p className={styles.muted}>
          {tt('lineups.none', 'Nobody has started a squad yet. Players see the picker once squad rules are set.')}
        </p>
      ) : (
        <ul className={styles.results}>
          {rows.map((row) => (
            // `player` is the username the payload actually carries, and
            // `user` is the full person added alongside it so this list shows
            // a face and a founder badge rather than a bare name.
            <li key={row.player} className={styles.row}>
              <UserChip user={row.user || { username: row.player }} />
              <span className={styles.count}>{STATUS(tt)[row.status] || row.status}</span>
              {row.submitted_at
                ? <span className={styles.muted}>{formatDateTime(row.submitted_at)}</span>
                : row.updated_at
                  ? <span className={styles.muted}>{formatDateTime(row.updated_at)}</span>
                  : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
