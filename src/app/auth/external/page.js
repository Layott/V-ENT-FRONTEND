'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn } from 'next-auth/react';
import styles from './external.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Where an outside sign-in lands. The backend has already checked with the
// provider and issued a V-ENT session token; this exchanges it for a NextAuth
// session and gets out of the way. It is deliberately dull: no data is read
// here, and the token in the URL is replaced in history straight away so it
// does not sit in the address bar.
const ExternalSignInContent = () => {
  const tt = useT();
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState('');
  // Exactly once. `params` is a fresh object on every render, so this effect
  // used to run again after the first pass had already replaced the URL and
  // spent the token. The second run failed and painted "Sign-in did not
  // complete" over a session that had in fact been created - reported by the
  // CEO on 30 August 2026 as "it said not successful but still logged me in".
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = params.get('token');

    // Opened as a popup from the login page: this window's job is to hand the
    // token back and get out of the way. The exchange happens in the page that
    // opened it, which is the one the person is actually looking at. Posting to
    // this origin only - the token is a live session and must not be readable
    // by whatever else has a handle on this window.
    const opener = window.opener;
    if (opener && opener !== window) {
      window.history.replaceState({}, '', '/auth/external');
      try {
        opener.postMessage(
          { source: 'v-ent-sso', token: token || '', username: params.get('username') || '' },
          window.location.origin,
        );
        window.close();
        return;
      } catch {
        // Could not reach the opener - fall through and sign in here instead,
        // which still works, just in the smaller window.
      }
    }

    if (!token) {
      setError(tt("msg.thatSignInLinkIs", "That sign-in link is incomplete. Start again from the login page."));
      return;
    }

    // Take the token out of the address bar before doing anything with it.
    window.history.replaceState({}, '', '/auth/external');
    (async () => {
      const result = await signIn('external-token', {
        token,
        redirect: false
      });
      if (result?.ok) {
        router.replace('/home');
        return;
      }
      // Ask before announcing a failure. A signed-in person told they are not
      // signed in will go round the loop again, and the second attempt is the
      // one that really cannot work.
      const session = await getSession();
      if (session?.user) {
        router.replace('/home');
        return;
      }
      setError(tt("msg.thatSignInCouldNot", "That sign-in could not be completed. Please try again."));
    })();
  }, [params, router, tt]);
  return <main className={styles.wrap}>
      <div className={styles.card}>
        {error ? <>
            <h1 className={styles.title}>{tt("ui.sign.did.not.complete.fb49", "Sign-in did not complete")}</h1>
            <p className={styles.body}>{error}</p>
            <a href="/login" className={styles.action}>{tt("ui.back.sign.4da8", "Back to sign in")}</a>
          </> : <>
            <h1 className={styles.title}>{tt("ui.signing.bb30", "Signing you in")}</h1>
            <p className={styles.body}>{tt("ui.one.moment.while.finish.19b1", "One moment while we finish setting up your session.")}</p>
          </>}
      </div>
    </main>;
};
const ExternalSignIn = () => <Suspense fallback={<main className={styles.wrap} />}>
    <ExternalSignInContent />
  </Suspense>;
export default ExternalSignIn;