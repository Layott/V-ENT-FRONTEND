'use client';

// Settings > Privacy > Manage block list (CEO, 1 October 2026, inbox 405).
//
// Blocking and muting have worked from a person's profile for weeks; this is
// the place to see who you have blocked or muted and take it back without
// finding their profile again. The list is always the signed-in person's own:
// the server reads it from the session (GET /safety/people/).

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import UserChip from '@/components/user-chip/UserChip';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate } from '@/lib/datetime';
import shared from './settingsShared.module.css';
import styles from './BlockList.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;
const DEADLINE_MS = 15000;

const BlockList = ({ showToast }) => {
  const tt = useT();
  const { data: session, status } = useSession();
  const token = session?.user?.sessionToken;
  const [state, setState] = useState({ phase: 'loading', blocked: [], muted: [] });
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!token) return;
    setState((s) => ({ ...s, phase: 'loading' }));
    try {
      const res = await fetch(`${API}/safety/people/`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(DEADLINE_MS),
      });
      const body = await res.json();
      if (!res.ok || body?.status !== 'success') throw new Error('refused');
      setState({ phase: 'ready', blocked: body.data.blocked || [], muted: body.data.muted || [] });
    } catch {
      setState((s) => ({ ...s, phase: 'error' }));
    }
  }, [token]);

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [status, load]);

  const undo = async (person, kind) => {
    setBusy(`${kind}:${person.username}`);
    try {
      const res = await fetch(`${API}/user/${encodeURIComponent(person.username)}/${kind}/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'block' ? { block: false } : { mute: false }),
        signal: AbortSignal.timeout(DEADLINE_MS),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.status !== 'success') {
        showToast?.(apiMessage(tt, body, 'settings.blockList.actionFailed', 'That did not work. Try again.'), 'error');
        return;
      }
      showToast?.((kind === 'block'
        ? tt('settings.blockList.unblocked', 'Unblocked @{username}.')
        : tt('settings.blockList.unmuted', 'Unmuted @{username}.')).replace('{username}', person.username));
      setState((s) => ({
        ...s,
        [kind === 'block' ? 'blocked' : 'muted']:
          s[kind === 'block' ? 'blocked' : 'muted'].filter((p) => p.username !== person.username),
      }));
    } catch {
      showToast?.(tt('settings.blockList.actionFailed', 'That did not work. Try again.'), 'error');
    } finally {
      setBusy('');
    }
  };

  if (status !== 'authenticated' || state.phase === 'loading') {
    return <p className={styles.note} role="status">{tt('settings.blockList.loading', 'Loading the people you have blocked…')}</p>;
  }
  if (state.phase === 'error') {
    return (
      <div className={styles.note} role="alert">
        <p>{tt('settings.blockList.error', 'Your block list could not be loaded.')}</p>
        <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN} ${styles.retry}`} onClick={load}>
          {tt('settings.blockList.retry', 'Try again')}
        </button>
      </div>
    );
  }
  if (!state.blocked.length && !state.muted.length) {
    return <p className={styles.note}>{tt('settings.blockList.empty', 'You have not blocked or muted anybody.')}</p>;
  }

  const row = (person, kind) => (
    <li key={`${kind}:${person.username}`} className={styles.row}>
      <div className={styles.who}>
        <UserChip user={person} size={36} />
        {kind === 'mute' && (
          <span className={styles.when}>
            {person.until
              ? tt('settings.blockList.mutedUntil', 'Muted until {date}').replace('{date}', formatDate(person.until))
              : tt('settings.blockList.mutedForever', 'Muted with no end date')}
          </span>
        )}
      </div>
      <button type="button" className={`${shared.btn} ${shared.btnSm} ${shared.ghostBTN} ${styles.action}`}
        disabled={busy === `${kind}:${person.username}`} onClick={() => undo(person, kind)}>
        {kind === 'block' ? tt('settings.blockList.unblock', 'Unblock') : tt('settings.blockList.unmute', 'Unmute')}
      </button>
    </li>
  );

  return (
    <div className={styles.lists}>
      {state.blocked.length > 0 && (
        <section>
          <h4 className={styles.heading}>{tt('settings.blockList.blocked', 'Blocked')}</h4>
          <ul className={styles.list}>{state.blocked.map((p) => row(p, 'block'))}</ul>
        </section>
      )}
      {state.muted.length > 0 && (
        <section>
          <h4 className={styles.heading}>{tt('settings.blockList.muted', 'Muted')}</h4>
          <ul className={styles.list}>{state.muted.map((p) => row(p, 'mute'))}</ul>
        </section>
      )}
    </div>
  );
};

export default BlockList;
