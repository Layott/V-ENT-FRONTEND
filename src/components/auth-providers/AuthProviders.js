'use client';

/**
 * The other ways in, on both the login and the signup page.
 *
 * There is one of these because there was nearly one: the login page drew
 * Google as a pill sized to its own text and the partner sign-in as a
 * full-width bar with its own margin, side by side in a centred row, so they
 * came out at different widths and different heights and read as two unrelated
 * controls. The signup page had the Google pill and no partner button at all,
 * so somebody could sign in with their African Free Fire Community account but
 * not sign up with it.
 *
 * Now every provider is the same shape, stacked, and both pages render this.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';

import { useT, useTx } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import googleLogo from '../../../public/images/google.svg';
import styles from './AuthProviders.module.css';

const AuthProviders = ({ mode = 'signin', disabled = false, callbackUrl, onError, onBusy }) => {
  const tt = useT();
  const tx = useTx();
  const [external, setExternal] = useState({});

  // Which outside sign-ins are actually live. A provider missing its
  // credentials answers `configured: false` and is not drawn at all, rather
  // than drawn and then failing when somebody presses it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/inbound/providers/`);
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) setExternal(body?.data?.providers || {});
      } catch {
        /* the page works without them */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const google = async () => {
    onBusy?.(true);
    try {
      await signIn('google', {
        redirect: true,
        callbackUrl: callbackUrl || `${window.location.origin}/home`,
        prompt: 'select_account consent',
      });
      // Nothing is announced here. signIn() with redirect: true resolves as
      // soon as the browser starts leaving for Google, long before anyone has
      // picked an account. The outcome arrives back on the callback page.
    } catch {
      onError?.(tt('msg.couldNotStartGoogle', 'Could not start the Google sign-in. Try again.'));
      onBusy?.(false);
    }
  };

  const startExternal = async slug => {
    onBusy?.(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/partners/inbound/${slug}/start/`);
      const body = await res.json();
      if (res.ok && body?.data?.url) {
        window.location.href = body.data.url;
        return;
      }
      onError?.(apiMessage(tt, body, 'api.thatSignInIsNot', 'That sign-in is not available yet.'));
    } catch {
      onError?.(tt('msg.thatSignInCouldNot', 'That sign-in could not be started.'));
    }
    onBusy?.(false);
  };

  const rows = Object.entries(external).filter(([, meta]) => meta.configured);

  return (
    <div className={styles.list}>
      <button
        type="button"
        className={styles.provider}
        onClick={google}
        disabled={disabled}
        aria-label={mode === 'signup'
          ? tt('ui.sign.up.google.3384', 'Sign up with Google')
          : tt('ui.sign.google.4a0b', 'Sign in with Google')}
      >
        <span className={`${styles.mark} ${styles.markLight}`}>
          <Image src={googleLogo} alt="" aria-hidden="true" className={styles.googleMark} />
        </span>
        <span className={styles.label}>{tt('ui.google.2b68', 'Google')}</span>
      </button>

      {rows.map(([slug, meta]) => (
        <button
          key={slug}
          type="button"
          className={styles.provider}
          onClick={() => startExternal(slug)}
          disabled={disabled}
        >
          <span className={`${styles.mark} ${styles.markMuted}`}>
            <span className={styles.monogram}>{meta.short || slug.toUpperCase().slice(0, 3)}</span>
          </span>
          <span className={styles.label}>{tx(meta.label)}</span>
        </button>
      ))}
    </div>
  );
};

export default AuthProviders;
