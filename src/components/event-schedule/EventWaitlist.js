'use client';

// Joining the queue for a sold-out event.
//
// The DICE shape: this is the return valve that makes a face-value-only policy
// workable, not a way to capture demand. Somebody whose plans change has a way
// out that is not a resale site, and the ticket goes to the next person here at
// the price it was always sold at.
//
// Renders nothing when tickets are still on sale, because a queue for something
// you can simply buy is a confusing thing to offer.

import { useCallback, useEffect, useState } from 'react';
import { LuClock, LuTicket } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { appLocale } from '@/lib/appLocale';
import { useT } from '@/i18n/LanguageProvider';
import styles from './event-waitlist.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const when = value => (value
  ? new Date(value).toLocaleString(appLocale(),
    { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '');

export default function EventWaitlist({ eventRef, token, soldOut }) {
  const tt = useT();
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!eventRef || !token) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/event/${eventRef}/waitlist/mine/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') setPlace(body.data);
    } catch {
      // A queue position that will not load is not worth an error on the page.
    } finally {
      setLoading(false);
    }
  }, [eventRef, token]);

  useEffect(() => { load(); }, [load]);

  const act = async (method) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API}/event/${eventRef}/waitlist/`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: method === 'POST' ? JSON.stringify({}) : undefined,
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        await load();
        return;
      }
      setError(apiMessage(tt, body, 'api.failed', 'Failed.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  // Nothing to offer somebody who can just buy a ticket, or who is signed out.
  if (!token || !soldOut) return null;
  if (loading) return null;

  const entry = place?.entry;
  const offered = entry?.status === 'offered';

  return (
    <div className={offered ? styles.wrapOffered : styles.wrap}>
      {offered ? (
        <>
          <p className={styles.title}>
            <LuTicket aria-hidden="true" />
            {tt('waitlist.offered', 'A ticket has come back, and it is yours first')}
          </p>
          <p className={styles.body}>
            {tt('waitlist.offerWindow', 'Buy it before {when} and it is yours. After that it goes to the next person in the queue.')
              .replace('{when}', when(entry.offer_expires_at))}
          </p>
        </>
      ) : entry?.status === 'waiting' ? (
        <>
          <p className={styles.title}>
            <LuClock aria-hidden="true" />
            {tt('waitlist.inQueue', 'You are number {n} in the queue')
              .replace('{n}', entry.position)}
          </p>
          <p className={styles.body}>
            {tt('waitlist.whatHappens', 'If somebody returns a ticket, it is offered to the queue in order, at the price it was always sold at. Nothing is resold above face value here.')}
          </p>
          <button type="button" className={styles.ghost} disabled={busy}
                  onClick={() => act('DELETE')}>
            {tt('waitlist.leave', 'Leave the queue')}
          </button>
        </>
      ) : (
        <>
          <p className={styles.title}>
            <LuClock aria-hidden="true" />
            {tt('waitlist.soldOut', 'Sold out, but tickets do come back')}
          </p>
          <p className={styles.body}>
            {tt('waitlist.whatHappens', 'If somebody returns a ticket, it is offered to the queue in order, at the price it was always sold at. Nothing is resold above face value here.')}
          </p>
          <button type="button" className={styles.primary} disabled={busy}
                  onClick={() => act('POST')}>
            {busy ? tt('ui.saving.8f2a', 'Saving…')
              : tt('waitlist.join', 'Join the queue')}
          </button>
        </>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
