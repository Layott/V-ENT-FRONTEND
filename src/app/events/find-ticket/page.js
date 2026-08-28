'use client';

// Finding a ticket again without an account.
//
// Somebody who bought as a guest has an email and a code and nothing else. This
// is the page that turns those into their ticket.
//
// Both are required. The code alone is the credential on the ticket, and email
// alone would let anybody type an address and read somebody's booking - the
// same shape of leak as an enumerable id.

import { useState } from 'react';
import Link from 'next/link';
import { LuTicket } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { useT } from '@/i18n/LanguageProvider';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './find-ticket.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function FindTicket() {
  const tt = useT();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [ticket, setTicket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const look = async () => {
    setBusy(true);
    setError('');
    setTicket(null);
    try {
      const res = await fetch(`${API}/event/guest-lookup/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') {
        setTicket(body.data.ticket);
        return;
      }
      setError(apiMessage(tt, body, 'api.NOT_FOUND',
        'No ticket found for that code and email address.'));
    } catch {
      setError(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <Header />
      <MobileHeader />

      <main className={styles.main}>
        <h1 className={styles.title}>{tt('find.title', 'Find your ticket')}</h1>
        <p className={styles.sub}>
          {tt('find.sub', 'Bought without an account? Your email address and the code from the confirmation will bring it back.')}
        </p>

        <form className={styles.form} onSubmit={e => { e.preventDefault(); look(); }}>
          <label className={styles.field}>
            <span className={styles.label}>{tt('guest.email', 'Email address')}</span>
            <input className={styles.input} type="email" value={email}
                   autoComplete="email" placeholder="you@example.com"
                   onChange={e => setEmail(e.target.value)} />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>{tt('find.code', 'Ticket code')}</span>
            <input className={styles.input} value={code} placeholder="VT-XXXXXXXX"
                   onChange={e => setCode(e.target.value)} />
          </label>

          <button type="submit" className={styles.go}
                  disabled={busy || !email.trim() || !code.trim()}>
            {busy ? tt('ui.loading.33ce', 'Loading…') : tt('find.go', 'Find it')}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        {ticket && <div className={styles.found}>
          <p className={styles.foundTitle}>
            <LuTicket aria-hidden="true" /> {ticket.event?.name || ticket.event_name}
          </p>
          <p className={styles.code}>{ticket.code}</p>
          <p className={styles.meta}>
            {ticket.attendee_name || ticket.attendee_email}
            {ticket.tier_name ? ` · ${ticket.tier_name}` : ''}
          </p>
          <p className={styles.meta}>
            {ticket.status === 'checked_in'
              ? tt('find.used', 'Already used at the door.')
              : tt('find.valid', 'Valid. Show this code at the door.')}
          </p>
        </div>}

        <p className={styles.sub}>
          {tt('find.makeAccount', 'Make an account with the same email address and every ticket you have bought appears in it automatically.')}
          {' '}
          <Link href="/signup" className={styles.link}>
            {tt('find.signup', 'Create an account')}
          </Link>
        </p>
      </main>

      <BottomMenu />
    </div>
  );
}
