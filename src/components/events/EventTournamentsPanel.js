'use client';

// The tournaments running inside this event, and the way into each one.
//
// CEO, 3 September 2026: "there should also be a way for admins to simply just
// add teams to the event."
//
// An event has no competitors of its own. It has ticket holders, managers and
// vendors, and the people who actually compete enter through a TOURNAMENT that
// runs inside it (`EventTournamentLink`). So the entrant tools, the squads and
// the direct-entry control all live on that tournament's console and always
// did.
//
// What was missing is the door. The event console never mentioned its linked
// tournaments at all, so an organiser standing on the event console looking for
// "add a team" had nowhere to go and no way to know where to look. The endpoint
// for this list already existed and nothing called it.
//
// Building squads onto Event itself would have been the wrong fix: it would
// invent a second Tournament under another name, which is the exact thing the
// one-model rule exists to stop.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import styles from './event-tournaments-panel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function EventTournamentsPanel({ eventRef, token, canManage }) {
  const tt = useT();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!eventRef) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/event/${eventRef}/tournaments/`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      const body = await res.json().catch(() => ({}));
      if (body?.status === 'success') { setRows(body.data?.tournaments || []); setError(''); }
      else setError(apiMessage(tt, body, 'eventTournaments.failed', 'Could not load the tournaments in this event.'));
    } catch (err) {
      setError(apiMessage(tt, err, 'eventTournaments.failed', 'Could not load the tournaments in this event.'));
    } finally {
      setLoading(false);
    }
  }, [eventRef, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <section className={styles.panel}>
      <h3 className={styles.title}>
        {tt('eventTournaments.title', 'Tournaments in this event')}
      </h3>
      <p className={styles.hint}>
        {tt('eventTournaments.hint', 'People compete in a tournament, not in the event itself. Entrants, mixed squads and putting a team straight in are all on the tournament console.')}
      </p>

      {error && <p className={styles.error} role="alert">{error}</p>}
      {loading && <p className={styles.muted}>{tt('eventTournaments.loading', 'Loading...')}</p>}

      {!loading && rows.length === 0 && (
        <p className={styles.muted}>
          {tt('eventTournaments.none', 'No tournament is attached to this event yet. Attach one and its entrants, squads and bracket are managed there.')}
        </p>
      )}

      {rows.map((row) => {
        const ref = row.slug || row.tournament_id || row.id;
        return (
          <div key={ref} className={styles.row}>
            <span className={styles.name}>{row.title || row.tournament_title}</span>
            {row.game && <span className={styles.game}>{row.game}</span>}
            {/* The organiser goes to the console. Everybody else goes to the
                page, because a control somebody cannot use should not be
                offered to them at all. */}
            <Link className={styles.go}
                  href={canManage
                    ? `/tournaments/${ref}/manage?tab=invitations`
                    : `/tournaments/${ref}`}>
              {canManage
                ? tt('eventTournaments.manage', 'Entrants and squads')
                : tt('eventTournaments.view', 'Open it')}
            </Link>
          </div>
        );
      })}
    </section>
  );
}
