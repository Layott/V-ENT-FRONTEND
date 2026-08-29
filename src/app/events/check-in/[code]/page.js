'use client';

// "I am here."
//
// The page a ticket holder reaches from the code in their email, where the
// organiser has turned self check-in on. It is deliberately reachable with no
// account: most people holding a ticket on this platform do not have one, and
// a check-in page behind a login is a check-in page nobody uses.
//
// The state is fetched BEFORE anything is offered, so somebody arriving three
// hours early is told when it opens rather than shown a button that fails. That
// is the same rule as the compose box on the community feed: tell people what
// they need before they spend effort, never after.

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { LuTicket } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { appLocale } from '@/lib/appLocale';
import { useT } from '@/i18n/LanguageProvider';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './check-in.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const formatTime = value => (value
  ? new Date(value).toLocaleString(appLocale(), {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
  : '');

export default function SelfCheckIn({ params }) {
  const tt = useT();
  const code = decodeURIComponent(params.code || '').toUpperCase();
  const { data: session } = useSession();
  const token = session?.user?.sessionToken;

  const [state, setState] = useState(null);
  const [email, setEmail] = useState('');
  const [arrived, setArrived] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/event/ticket/${code}/self-check-in/`);
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setState(body.data);
        setError('');
        return;
      }
      setError(apiMessage(tt, body, 'checkIn.notFound',
        'No ticket with that code.'));
    } catch {
      // A bare await on fetch turns any network failure into a permanent
      // spinner. This page is opened at a venue on mobile data.
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }, [code, tt]);

  useEffect(() => { load(); }, [load]);

  const arrive = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`${API}/event/ticket/${code}/self-check-in/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setArrived(body.data);
        return;
      }
      setError(apiMessage(tt, body, 'checkIn.failed',
        'That did not work. Ask a steward at the gate.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  // Why the button is not offered, in the words somebody standing outside a
  // venue needs. Every branch names the thing to do next.
  const reasonText = () => {
    if (!state) return '';
    const map = {
      SELF_CHECK_IN_OFF: tt('checkIn.offReason',
        'This event checks tickets in at the door. Show your code to a steward.'),
      ALREADY_CHECKED_IN: tt('checkIn.alreadyReason',
        'This ticket has already been checked in.'),
      TICKET_NOT_VALID: tt('checkIn.invalidReason',
        'This ticket is not valid any more.'),
      NO_EVENT_TIME: tt('checkIn.noTimeReason',
        'The organiser has not set a start time yet.'),
      TOO_EARLY: tt('checkIn.earlyReason', 'Check-in opens at {when}.')
        .replace('{when}', formatTime(state.opens_at)),
      TOO_LATE: tt('checkIn.lateReason', 'Check-in closed at {when}.')
        .replace('{when}', formatTime(state.closes_at)),
    };
    return map[state.reason] || '';
  };

  return (
    <div className={styles.page}>
      <Header />
      <MobileHeader />

      <main className={styles.main}>
        <h1 className={styles.title}>{tt('checkIn.title', 'Check in')}</h1>

        {loading && <p className={styles.sub}>{tt('ui.loading', 'Loading...')}</p>}

        {!loading && !state && <>
          <p className={styles.error}>{error}</p>
          <p className={styles.sub}>
            {tt('checkIn.findInstead', 'Lost the code? Look your ticket up with the email address you booked with.')}
            {' '}
            <Link href="/events/find-ticket" className={styles.link}>
              {tt('checkIn.findLink', 'Find my ticket')}
            </Link>
          </p>
        </>}

        {arrived && <div className={`${styles.card} ${styles.done}`}>
          <span className={styles.tick} aria-hidden="true">✓</span>
          <p className={styles.eventName}>
            {tt('checkIn.youAreIn', 'You are checked in.')}
          </p>
          <p className={styles.code}>{arrived.code}</p>
          <p className={styles.meta}>
            {arrived.event?.name}
            {arrived.tier ? ` · ${arrived.tier}` : ''}
            {arrived.name ? ` · ${arrived.name}` : ''}
          </p>
          <p className={styles.meta}>
            {tt('checkIn.recordedAt', 'Recorded at {when}.')
              .replace('{when}', formatTime(arrived.checked_in_at))}
          </p>
        </div>}

        {!arrived && state && <>
          <div className={styles.card}>
            <p className={styles.eventName}>
              <LuTicket aria-hidden="true" /> {state.event?.name}
            </p>
            <p className={styles.code}>{code}</p>
          </div>

          {state.may_check_in ? <div className={styles.card}>
            <p className={styles.sub}>
              {tt('checkIn.confirmSub', 'Press this when you arrive. It marks your ticket used, so do it at the venue rather than on the way.')}
            </p>
            <label className={styles.field}>
              <span className={styles.label}>
                {tt('checkIn.emailLabel', 'The email address the ticket was sent to')}
              </span>
              <input className={styles.input} type="email" value={email}
                     autoComplete="email" placeholder="you@example.com"
                     onChange={e => setEmail(e.target.value)} />
            </label>
            <p className={styles.meta}>
              {tt('checkIn.whyEmail', 'Asked because a ticket code on its own gets shared. Signed in with the account that holds this ticket? Leave it blank.')}
            </p>
            <button type="button" className={styles.go} disabled={busy}
                    onClick={arrive}>
              {busy ? tt('ui.loading', 'Loading...') : tt('checkIn.go', 'I am here')}
            </button>
          </div> : <div className={`${styles.card} ${styles.blocked}`}>
            <p className={styles.meta}>{reasonText()}</p>
            {state.reason === 'TOO_EARLY' && state.closes_at && <p className={styles.meta}>
              {tt('checkIn.closesAt', 'It closes at {when}.')
                .replace('{when}', formatTime(state.closes_at))}
            </p>}
          </div>}

          {error && <p className={styles.error}>{error}</p>}
        </>}

        {state?.event?.slug && <p className={styles.sub}>
          <Link href={`/events/${state.event.slug}`} className={styles.link}>
            {tt('checkIn.backToEvent', 'Open the event')}
          </Link>
        </p>}
      </main>

      <BottomMenu />
    </div>
  );
}
