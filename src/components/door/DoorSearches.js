'use client';

// What the door actually asked for, while the door is still open.
//
// CEO, 6 September 2026: "Is it possible to see all the emails or names that
// were searched for under door list in the rivalry seriess bwetween Friday and
// yesterday saturday?"
//
// The honest answer that day was no, because nothing recorded it. The search
// filtered a list the browser had downloaded once at page load, so a lookup
// never reached the server and left no trace. `door_lookups` was written to fix
// that and then NOTHING ON THE SITE CALLED IT, which meant the answer to the
// CEO's question was still "no" - the rows were being written into a table
// nobody could read.
//
// ## Why the misses filter is the point
//
// A run of terms matching nothing is a door in trouble: the wrong event open,
// a list that never finished downloading, or people arriving with tickets
// bought after the page loaded. Seeing that at 19:00 is worth something.
// Seeing it in a post-mortem is worth nothing, which is exactly what happened
// on 5 September when one check-in was recorded out of 1421 tickets.

import { useCallback, useState } from 'react';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDateTime } from '@/lib/datetime';
import { useAutoRefresh } from '@/lib/useLiveData';
import styles from './door-searches.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function DoorSearches({ eventId, token }) {
  const tt = useT();
  const [open, setOpen] = useState(false);
  const [missesOnly, setMissesOnly] = useState(false);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [misses, setMisses] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!eventId || !token) return;
    if (!quiet) { setLoading(true); setError(''); }
    try {
      const url = `${API}/event/${eventId}/door-lookups/`
        + `?limit=100${missesOnly ? '&misses=1' : ''}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'success') {
        setRows(body.data.lookups || []);
        setCount(Number(body.data.count || 0));
        setMisses(Number(body.data.misses || 0));
        setError('');
      } else if (!quiet) {
        setError(apiMessage(tt, body, 'door.logFailed', 'Could not load the search log.'));
      }
    } catch (err) {
      // A failed refresh must never empty a log somebody is reading.
      if (!quiet) {
        setError(apiMessage(tt, err, 'door.logFailed', 'Could not load the search log.'));
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [eventId, token, missesOnly, tt]);

  // Only while it is open. A door screen has enough to do without polling a log
  // nobody is looking at, and this is the page a steward keeps open all night.
  useAutoRefresh(() => load({ quiet: true }), [open, missesOnly],
                 { enabled: open, interval: 20000 });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) load();
  };

  const setFilter = (value) => {
    setMissesOnly(value);
    // The filter is a server query, so it has to be asked again rather than
    // filtered here. Asking on the click keeps it immediate.
    setTimeout(() => load({ quiet: true }), 0);
  };

  return (
    <section className={styles.panel}>
      <button type="button" className={styles.head} onClick={toggle} aria-expanded={open}>
        <span className={styles.headTitle}>{tt('door.logTitle', 'What was searched for')}</span>
        <span className={styles.headMeta}>
          {open
            ? tt('door.logHide', 'Hide')
            : tt('door.logShow', 'Show')}
        </span>
      </button>

      {open && (
        <div className={styles.body}>
          <p className={styles.hint}>
            {tt('door.logHint', 'Every name, email, phone or code the door looked up, newest first. A run of searches matching nothing usually means the wrong event is open or the list did not finish downloading.')}
          </p>

          <div className={styles.filterRow}>
            {[[false, tt('door.logAll', 'Every search')],
              [true, tt('door.logMisses', 'Found nobody')]].map(([value, label]) => (
              <button key={String(value)} type="button"
                      className={`${styles.filterChip} ${missesOnly === value ? styles.filterChipOn : ''}`}
                      aria-pressed={missesOnly === value}
                      onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>

          <p className={styles.counts}>
            {tt('door.logCounts', '{all} searches, {miss} of which found nobody.')
              .replace('{all}', String(count))
              .replace('{miss}', String(misses))}
          </p>

          {error && <p className={styles.error} role="alert">{error}</p>}

          {loading && rows.length === 0 ? (
            <p className={styles.stateText}>{tt('door.logLoading', 'Loading…')}</p>
          ) : rows.length === 0 ? (
            <p className={styles.stateText}>
              {missesOnly
                ? tt('door.logNoMisses', 'Every search so far found somebody.')
                : tt('door.logEmpty', 'Nothing has been searched for yet.')}
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{tt('door.logTerm', 'Searched for')}</th>
                    <th>{tt('door.logResult', 'Result')}</th>
                    <th>{tt('door.logWho', 'Asked by')}</th>
                    <th>{tt('door.logWhen', 'When')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={`${row.at}-${i}`}>
                      <td><span className={styles.term}>{row.term}</span></td>
                      <td>
                        {row.matched === 0 ? (
                          <span className={styles.badgeMiss}>
                            {tt('door.logNobody', 'Nobody')}
                          </span>
                        ) : (
                          <span className={styles.badgeHit}>
                            {row.code
                              ? row.code
                              : tt('door.logMatched', '{n} matched').replace('{n}', String(row.matched))}
                          </span>
                        )}
                      </td>
                      <td className={styles.muted}>
                        {row.asked_by || tt('door.logNoWho', 'Not signed in')}
                      </td>
                      <td className={styles.muted}>{formatDateTime(row.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
