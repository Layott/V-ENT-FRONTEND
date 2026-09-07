'use client';

/**
 * What a person sees when a page fails.
 *
 * CEO, 7 September 2026, sending a screenshot of "Something went wrong /
 * MdSell is not defined": "what is this error that is not a good kind of error
 * to show users".
 *
 * They were right, and it was in thirteen error boundaries, all shaped like
 * this:
 *
 *     {error?.message || tx('An unexpected error occurred...')}
 *
 * The written sentence was there all along and the raw exception WON, because
 * `||` takes the left side whenever it is truthy and an exception message
 * almost always is. So the one case the fallback was written for - a real
 * crash - is the only case it never appeared in.
 *
 * What a reader gets from "MdSell is not defined" is that something is broken
 * and that nobody was expecting them to read this. It is the same rule as
 * `feedback_no_developer_errors`: no engineer's sentence, no raw server string,
 * no stack. Say what happened in words they can act on.
 *
 * ## What this shows instead
 *
 * - A sentence about what failed and what they can do.
 * - A **reference code**, when Next gives us one. `error.digest` is an opaque
 *   hash, not prose: it is safe to show, and it is the one thing that makes a
 *   report actionable. "It said reference 8a31f2" beats "it said something
 *   went wrong" by an enormous margin.
 * - A route to `/feedback` carrying that reference, so telling us costs one
 *   press rather than a hunt for the form.
 *
 * The real error still reaches the console for whoever is debugging, which is
 * where it was always useful and never on screen.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { LuTriangleAlert } from 'react-icons/lu';
import { useT } from '@/i18n/LanguageProvider';
import styles from './error-screen.module.css';

export default function ErrorScreen({ error, reset, whatKey, whatText }) {
  useEffect(() => {
    // For whoever is debugging. Never for the person reading the page.
    if (error) console.error('[v-ent] page error', error);
  }, [error]);

  const tt = useT();
  const reference = error?.digest || '';

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <LuTriangleAlert className={styles.icon} aria-hidden="true" />

        <h2 className={styles.title}>
          {tt('error.title', 'This page did not load')}
        </h2>

        <p className={styles.body}>
          {/* Named by KEY, never as a ready-made English sentence: a string
              passed in from a boundary cannot be translated, and this page is
              read in three languages. */}
          {whatKey
            ? tt(whatKey, whatText)
            : tt('error.body', 'Something on our side failed while putting this page together. It is not something you did, and trying again often works.')}
        </p>

        {reference && (
          <p className={styles.reference}>
            {tt('error.reference', 'Reference')} <span className={styles.code}>{reference}</span>
          </p>
        )}

        <div className={styles.actions}>
          {reset && (
            <button type="button" className={`${styles.primary} goldBTN`} onClick={reset}>
              {tt('error.retry', 'Try again')}
            </button>
          )}
          <Link href="/" className={styles.secondary}>
            {tt('error.home', 'Go home')}
          </Link>
          <Link
            href={`/feedback?area=other${reference ? `&ref=${encodeURIComponent(reference)}` : ''}`}
            className={styles.secondary}>
            {tt('error.tellUs', 'Tell us what happened')}
          </Link>
        </div>
      </div>
    </div>
  );
}
