'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
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
  useEffect(() => {
    const token = params.get('token');
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
      } else {
        setError(tt("msg.thatSignInCouldNot", "That sign-in could not be completed. Please try again."));
      }
    })();
  }, [params, router]);
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