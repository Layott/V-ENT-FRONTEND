'use client';

// What a signed-out visitor sees where a member would see a control.
//
// CEO, 2 September 2026: "they should not be able to create or join or open
// anything that requires an account and when they try it should ask them to
// create one".
//
// The important half is "when they try". Not "after they try". A control that
// renders live and answers 401 on press is the fault the community feed shipped
// once: a compose box with a working Post button for signed-out visitors, which
// produced a 401 after they had typed. Tell somebody what they need BEFORE they
// spend effort.
//
// So this replaces the control rather than sitting next to it. The page stays
// readable, because content is public and it is the action that is gated.

import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import { signInHref, signUpHref, useViewer } from '@/lib/gating';
import styles from './needs-account.module.css';

/**
 * Wrap any control that needs an account.
 *
 *   <NeedsAccount action={tt('org.followAction', 'follow an organisation')}>
 *     <button onClick={follow}>Follow</button>
 *   </NeedsAccount>
 *
 * Signed in: renders the children untouched.
 * Still deciding: renders nothing, so nothing flashes from one state to another.
 * Signed out: renders one sentence and two links.
 *
 * `compact` gives a single inline link, for a control that lives in a row of
 * other controls where a sentence would break the layout.
 */
export default function NeedsAccount({ action, children, compact = false, returnTo }) {
  const tt = useT();
  const viewer = useViewer();

  // Never guess during "loading". A page that decides early flashes from a
  // member's view to a stranger's, which looks like a bug and reads as one.
  if (viewer.loading) return null;
  if (viewer.signedIn) return children;

  const here = returnTo
    || (typeof window !== 'undefined' ? window.location.pathname : '');

  if (compact) {
    return (
      <Link href={signUpHref(here)} className={styles.compact}>
        {tt('needsAccount.compact', 'Sign in to do this')}
      </Link>
    );
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.text}>
        {action
          ? tt('needsAccount.toDo', 'You need an account to {action}.')
              .replace('{action}', action)
          : tt('needsAccount.generic', 'You need an account to do this.')}
      </p>
      <div className={styles.actions}>
        <Link href={signUpHref(here)} className={styles.primary}>
          {tt('needsAccount.create', 'Create an account')}
        </Link>
        <Link href={signInHref(here)} className={styles.ghost}>
          {tt('needsAccount.signIn', 'Log in')}
        </Link>
      </div>
    </div>
  );
}
