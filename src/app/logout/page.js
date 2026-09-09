'use client';

// Signing out, on V-ENT rather than on NextAuth's default page.
//
// `/api/auth/signout` served NextAuth's own card: a bright blue button, no
// V-ENT anywhere, English only, on a dark branded site. It is reachable by
// typing the address and by any flow that redirects there, so leaving it as
// the default meant somebody would eventually meet it.
//
// It uses the same `logOut()` every other exit uses, which is the point:
// `signOut()` alone clears the NextAuth token and leaves the `session` cookie
// the middleware accepts on its own, so pressing it used to sign nobody out.

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import AuthHeader from '@/components/auth-header/AuthHeader';
import generalStyles from '@/styles/auth/auth.module.css';
import { logOut } from '@/lib/logout';
import { useT } from '@/i18n/LanguageProvider';
import styles from './logout.module.css';

export default function LogoutPage() {
  const tt = useT();
  const { data: session, status } = useSession();
  const [busy, setBusy] = useState(false);

  // Branch on STATUS, never on data alone: `data` cannot tell "signed out"
  // from "still asking", and this page would flash the wrong sentence.
  const signedIn = status === 'authenticated';

  return (
    <div className={generalStyles.pageContainer}>
      <header className={generalStyles.pageHeader}>
        <AuthHeader />
      </header>

      <main className={generalStyles.mainContainer}>
        <div className={generalStyles.formContainer}>
          <section className={generalStyles.formHeader}>
            <h1 className={generalStyles.formHeading}>
              {tt('logout.heading', 'Sign out of V-ENT')}
            </h1>
            <p>
              {status === 'loading'
                ? tt('ui.loading.33ce', 'Loading…')
                : signedIn
                  ? tt('logout.askNamed', 'You are signed in as {who}.')
                    .replace('{who}', session?.user?.username || '')
                  : tt('logout.alreadyOut', 'You are already signed out.')}
            </p>
          </section>

          {signedIn ? (
            <div className={styles.actions}>
              <button type="button" className={styles.wide}
                      disabled={busy}
                      onClick={() => { setBusy(true); logOut(); }}>
                {busy
                  ? tt('logout.signingOut', 'Signing out...')
                  : tt('logout.signOut', 'Sign out')}
              </button>
              <Link href="/home" className={styles.quiet}>
                {tt('logout.stay', 'Stay signed in')}
              </Link>
            </div>
          ) : (
            <div className={styles.actions}>
              <Link href="/login" className={`${styles.wide} ${styles.back}`}>
                {tt('logout.signIn', 'Sign in again')}
              </Link>
              <Link href="/" className={styles.quiet}>
                {tt('logout.browse', 'Look around without an account')}
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
