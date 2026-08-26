'use client';

import Link from 'next/link';
import styles from './create-tournament.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
export default function CreateTournamentError({
  error,
  reset
}) {
  const tx = useTx();
  const tt = useT();
  return <div className={styles.pageContainer}>
      <div className={styles.errorState}>
        <div className={styles.errorCard}>
          <h2 className={styles.errorTitle}>{tt("ui.something.went.wrong.8d88", "Something went wrong")}</h2>
          <p className={styles.errorText}>
            {error?.message || tx("The tournament creator hit an unexpected error. You can try again or head back to Tournaments.")}
          </p>
          <div className={styles.errorActions}>
            <button type="button" className={`${styles.errorBtn} ${styles.retryBtn}`} onClick={() => reset()}>
              {tt("ui.try.again.042c", "Try again")}
            </button>
            <Link href="/tournaments">
              <button type="button" className={`${styles.errorBtn} ${styles.backBtn}`}>
                {tt("ui.back.tournaments.534f", "Back to Tournaments")}
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>;
}