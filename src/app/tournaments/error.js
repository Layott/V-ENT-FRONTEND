'use client'

import Link from 'next/link';
import { LuTriangleAlert } from 'react-icons/lu';
import styles from './tournament.module.css';

export default function TournamentsError({ error, reset }) {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.errorPageWrap}>
        <div className={styles.inlineErrorCard}>
          <LuTriangleAlert className={styles.inlineErrorIcon} />
          <h2 className={styles.inlineErrorTitle}>Something went wrong</h2>
          <p className={styles.inlineErrorSub}>
            {error?.message || 'An unexpected error occurred while loading tournaments.'}
          </p>
          <div className={styles.pageActions}>
            <button className={`${styles.primaryBtn} goldBTN`} onClick={reset}>Retry</button>
            <Link href="/">
              <button className={styles.secondaryBtn}>Go home</button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
