'use client'

import Link from 'next/link';
import styles from './create-tournament.module.css';

export default function CreateTournamentError({ error, reset }) {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.errorState}>
        <div className={styles.errorCard}>
          <h2 className={styles.errorTitle}>Something went wrong</h2>
          <p className={styles.errorText}>
            {error?.message || 'The tournament creator hit an unexpected error. You can try again or head back to Tournaments.'}
          </p>
          <div className={styles.errorActions}>
            <button type="button" className={`${styles.errorBtn} ${styles.retryBtn}`} onClick={() => reset()}>
              Try again
            </button>
            <Link href="/tournaments">
              <button type="button" className={`${styles.errorBtn} ${styles.backBtn}`}>
                Back to Tournaments
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
