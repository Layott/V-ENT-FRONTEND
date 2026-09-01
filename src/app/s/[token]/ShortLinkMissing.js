'use client';

// What somebody sees when a short link no longer opens anything.
//
// A client component purely so it can be translated: `useT` needs the language
// provider, and the page above it is a server component because the redirect
// has to happen before anything is painted.
//
// A written state rather than a spinner. People reach this because a character
// was misread off a flyer or the organiser switched the link off, and both of
// those want telling in words.

import Link from 'next/link';
import { useT } from '@/i18n/LanguageProvider';
import styles from './short-link.module.css';

export default function ShortLinkMissing({ token }) {
  const tt = useT();
  const body = tt('share.expiredBody',
    'The short link {token} does not open anything. It may have been switched '
    + 'off by whoever shared it, or a character may have been mistyped.');
  const [before, after] = body.split('{token}');

  return (
    <main className={styles.wrap}>
      <div className={styles.panel}>
        <h1 className={styles.title}>
          {tt('share.expiredTitle', 'This link has expired')}
        </h1>
        <p className={styles.body}>
          {before}
          <span className={styles.code}>{token || '-'}</span>
          {after}
        </p>
        <div className={styles.actions}>
          <Link href="/events" className={styles.primary}>
            {tt('share.browseEvents', 'Browse events')}
          </Link>
          <Link href="/" className={styles.ghost}>
            {tt('share.goHome', 'Go to V-ENT')}
          </Link>
        </div>
      </div>
    </main>
  );
}
