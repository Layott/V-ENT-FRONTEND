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

    // Opened as a popup from the login page. `window.opener` is the fast path,
    // but it cannot be relied on: this window has been to AFC and back since it
    // was opened, and a browser is entitled to sever the opener across that.
    // The CEO signed in and the popup sat on /home rather than closing, which
    // is exactly what a severed opener looks like.
    //
    // So the popup is recognised by the name it was opened with, which survives
    // the round trip, and the page that opened it does not wait to be told: it
    // watches for the session appearing. The cookie is set for the whole
    // origin, so the moment this window signs in the opener is signed in too.
    const isPopup = (window.name || '').startsWith('vent-sso-')
      || (window.opener && window.opener !== window);

    const opener = window.opener;
    if (opener && opener !== window && token) {
      // Fast path, when the opener survived. Posting to this origin only: the
      // token is a live session and must not be readable by anything else
      // holding a handle on this window.
      window.history.replaceState({}, '', '/auth/external');
      try {
        opener.postMessage(
          { source: 'v-ent-sso', token, username: params.get('username') || '' },
          window.location.origin,
        );
        window.close();
        return;
      } catch {
        // Fall through and sign in here instead.
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
        // Signed in. If this is the popup, the opener is now signed in too -
        // same origin, same cookie - and it is watching for exactly that. Shut
        // this window rather than showing a second copy of the site inside it.
        if (isPopup) {
          window.close();
          // A window the browser refuses to close should not sit on a blank
          // page, so carry on to /home as though it were an ordinary tab.
          setTimeout(() => router.replace('/home'), 400);
          return;
        }
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