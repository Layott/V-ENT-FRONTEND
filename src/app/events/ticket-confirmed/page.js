'use client';

// Where Paystack sends a guest back to after paying.
//
// The tickets are issued HERE, from the reference, rather than when the payment
// was started. A ticket that exists before the money does is a ticket somebody
// can screenshot, and a payment abandoned halfway leaves nothing to clean up.
//
// Safe to open twice: the browser returning and Paystack calling back are two
// arrivals for one payment, and the endpoint answers the second one with the
// tickets it already made rather than making more.

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LuCheck, LuTicket, LuTriangleAlert } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './confirmed.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

function Confirmed() {
  const tt = useT();
  const params = useSearchParams();
  // Paystack returns its own `reference` or `trxref` depending on the flow.
  const reference = params.get('reference') || params.get('trxref') || '';

  const [state, setState] = useState('working');
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');

  const verify = useCallback(async () => {
    if (!reference) {
      setState('failed');
      setError(tt('confirmed.noReference',
        'There is no payment reference in this address, so there is nothing to confirm.'));
      return;
    }
    try {
      const res = await fetch(`${API}/event/guest-verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setTickets(body.data.tickets || []);
        setState('done');
        return;
      }
      setError(apiMessage(tt, body, 'api.PAYMENT_NOT_COMPLETE',
        'That payment has not gone through.'));
      setState('failed');
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
      setState('failed');
    }
  }, [reference]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { verify(); }, [verify]);

  return (
    <div className={styles.page}>
      <Header />
      <MobileHeader />

      <main className={styles.main}>
        {state === 'working' && <>
          <h1 className={styles.title}>{tt('confirmed.checking', 'Checking the payment')}</h1>
          <p className={styles.sub}>
            {tt('confirmed.wait', 'This takes a moment. Do not close the page.')}
          </p>
        </>}

        {state === 'done' && <>
          <h1 className={styles.title}>
            <LuCheck aria-hidden="true" /> {tt('confirmed.done', 'Paid. That is booked')}
          </h1>
          <p className={styles.sub}>
            {tt('confirmed.sent', 'The ticket has been emailed to you. Bring the code below, or the email, to the door.')}
          </p>
          <ul className={styles.codes}>
            {tickets.map(t => <li key={t.code} className={styles.code}>
              <LuTicket aria-hidden="true" />
              <strong>{t.code}</strong>
              {t.attendee_name && <span>{t.attendee_name}</span>}
            </li>)}
          </ul>
          <p className={styles.sub}>
            {tt('guest.findAgain', 'You can find it again with your email address and the code, without an account.')}
            {' '}
            <Link href="/events/find-ticket" className={styles.link}>
              {tt('guest.findLink', 'Find a ticket')}
            </Link>
          </p>
        </>}

        {state === 'failed' && <>
          <h1 className={styles.title}>
            <LuTriangleAlert aria-hidden="true" />
            {tt('confirmed.failed', 'That did not go through')}
          </h1>
          <p className={styles.sub}>{error}</p>
          <p className={styles.sub}>
            {/* Said plainly, because the first fear is having been charged. */}
            {tt('confirmed.noCharge', 'No ticket has been issued. If money did leave your account, keep this page and contact the organiser with the reference below.')}
          </p>
          {reference && <p className={styles.code}><strong>{reference}</strong></p>}
        </>}
      </main>

      <BottomMenu />
    </div>
  );
}

export default function TicketConfirmed() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#131316' }} />}>
      <Confirmed />
    </Suspense>
  );
}
