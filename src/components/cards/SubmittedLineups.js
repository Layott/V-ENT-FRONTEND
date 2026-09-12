'use client';

// Every squad submitted for this tournament, for the organiser running it,
// and the decision on each one.
//
// `tournament/<id>/lineups/` was written as "the organiser's list, and a
// broadcast's" and then nothing on the site ever called it. An organiser
// running an EAFC tournament had no way to see who had submitted and who had
// not, which is the one question worth asking in the hour before a deadline.
//
// It shows who is missing as well as who is in. A list of the people who did
// the thing does not answer "who do I have to chase", and chasing is the actual
// job.
//
// The decision lives here too, on the same row, because "who has handed in"
// and "is this one allowed" are one job seen twice. FE#171 carried a second
// panel that listed the same squads with the buttons on it; two lists of the
// same thing on one tab is how one of them stops being maintained, so the
// buttons moved here and that panel was retired on 12 September.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import UserChip from '@/components/user-chip/UserChip';
import FutCard from './FutCard';
import styles from './submitted-lineups.module.css';

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

export default function SubmittedLineups({ tournamentRef, token, showToast, onDecided }) {
  const tt = useT();
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [submitted, setSubmitted] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openPlayer, setOpenPlayer] = useState(null);
  const [notes, setNotes] = useState({});
  const [deciding, setDeciding] = useState('');

  const auth = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

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

  // Accept, or send back with a reason. The API refuses a rejection with no
  // note, and this says so before the press rather than after.
  const decide = async (player, decision) => {
    const note = (notes[player] || '').trim();
    if (decision === 'reject' && !note) {
      setError(tt('review.reasonNeeded',
        'Say why you are sending it back, so they can fix it.'));
      return;
    }
    setDeciding(`${player}:${decision}`);
    setError('');
    try {
      const res = await fetch(
        `${API}/tournament/${tournamentRef}/lineups/${encodeURIComponent(player)}/review/`,
        { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, note }) });
      const body = await res.json().catch(() => ({}));
      if (body?.status !== 'success') {
        setError(apiMessage(tt, body, 'review.decideFailed', 'That decision was not saved.'));
        return;
      }
      setRows((current) => current.map(
        (l) => (l.player === player ? { ...l, ...body.data.lineup } : l)));
      setNotes((current) => ({ ...current, [player]: '' }));
      showToast?.(decision === 'accept'
        ? tt('review.accepted', 'Squad accepted.')
        : tt('review.sentBack', 'Sent back to the player.'));
      // An organiser who also plays has their own squad on this same screen,
      // and it would otherwise go on saying "waiting for the organiser" after
      // they had just decided it.
      onDecided?.();
    } catch (err) {
      setError(apiMessage(tt, err, 'review.decideFailed', 'That decision was not saved.'));
    } finally {
      setDeciding('');
    }
  };

  // Waiting first, because that is the work. Then the ones already decided.
  const ordered = useMemo(() => {
    const rank = { submitted: 0, rejected: 1, accepted: 2, draft: 3 };
    return [...rows].sort((a, b) => (rank[a.status] ?? 9) - (rank[b.status] ?? 9)
      || String(a.player).localeCompare(String(b.player)));
  }, [rows]);

  const waiting = ordered.filter((l) => l.status === 'submitted').length;

  if (loading) return <p className={styles.muted}>{tt('lineups.loading', 'Loading...')}</p>;

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>
        {tt('lineups.title', 'Squads submitted')}
        {waiting > 0 && (
          <span className={styles.waiting}>
            {' '}
            {tt('review.waitingCount', '{n} waiting for you').replace('{n}', String(waiting))}
          </span>
        )}
      </h3>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <p className={styles.state}>
        {tt('lineups.count', '{done} of {all} players have submitted a complete squad.')
          .replace('{done}', String(submitted))
          .replace('{all}', String(count))}
      </p>

      {ordered.length === 0 ? (
        <p className={styles.muted}>
          {tt('lineups.none', 'Nobody has started a squad yet. Players see the picker once squad rules are set.')}
        </p>
      ) : ordered.map((row) => {
        const open = openPlayer === row.player;
        const eleven = (row.slots || []).filter((s) => s.slot_index < 11);
        return (
          // `player` is the username the payload actually carries, and
          // `user` is the full person added alongside it so this list shows
          // a face and a founder badge rather than a bare name.
          <div key={row.player} className={styles.row}>
            <div className={styles.rowHead}>
              <UserChip user={row.user || { username: row.player }} />
              <span className={`${styles.status} ${styles[row.status] || ''}`}>
                {STATUS(tt)[row.status] || row.status}
              </span>
              {row.formation && <span className={styles.formation}>{row.formation}</span>}
              {row.submitted_at
                ? <span className={styles.when}>{formatDateTime(row.submitted_at)}</span>
                : row.updated_at
                  ? <span className={styles.when}>{formatDateTime(row.updated_at)}</span>
                  : null}
              <button type="button" className={styles.ghost}
                      aria-expanded={open}
                      onClick={() => setOpenPlayer(open ? null : row.player)}>
                {open ? tt('review.hide', 'Hide squad') : tt('review.show', 'See squad')}
              </button>
            </div>

            {row.status === 'rejected' && row.review_note && (
              <p className={styles.note}>
                {tt('review.yourReason', 'You said: {note}').replace('{note}', row.review_note)}
              </p>
            )}

            {open && (
              <div className={styles.cards}>
                {eleven.length === 0 && (
                  <p className={styles.muted}>
                    {tt('review.emptySquad', 'Nothing picked yet.')}
                  </p>
                )}
                {eleven.map((slot) => (
                  <FutCard key={slot.slot_index} size="fit"
                           card={slot.card || slot} caption={slot.position} />
                ))}
              </div>
            )}

            {row.status === 'submitted' && (
              <div className={styles.decide}>
                <input className={styles.input}
                       value={notes[row.player] || ''}
                       maxLength={280}
                       placeholder={tt('review.notePlaceholder', 'Why, if you are sending it back')}
                       aria-label={tt('review.notePlaceholder', 'Why, if you are sending it back')}
                       onChange={(e) => setNotes({ ...notes, [row.player]: e.target.value })} />
                <button type="button" className={styles.accept}
                        disabled={Boolean(deciding)}
                        onClick={() => decide(row.player, 'accept')}>
                  {deciding === `${row.player}:accept`
                    ? tt('review.working', 'Working...')
                    : tt('review.accept', 'Accept')}
                </button>
                <button type="button" className={styles.reject}
                        disabled={Boolean(deciding)}
                        onClick={() => decide(row.player, 'reject')}>
                  {deciding === `${row.player}:reject`
                    ? tt('review.working', 'Working...')
                    : tt('review.reject', 'Send back')}
                </button>
              </div>
            )}

            {row.status === 'submitted' && !(notes[row.player] || '').trim() && (
              <p className={styles.smallHint}>
                {tt('review.rejectNeedsReason', 'Sending one back needs a reason. Accepting does not.')}
              </p>
            )}
          </div>
        );
      })}
    </section>
  );
}
