'use client';

import Link from 'next/link';
import { LuTriangleAlert } from 'react-icons/lu';
import styles from './tournament.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
export default function TournamentsError({
  error,
  reset
}) {
  const tx = useTx();
  const tt = useT();
  return <div className={styles.pageContainer}>
      <div className={styles.errorPageWrap}>
        <div className={styles.inlineErrorCard}>
          <LuTriangleAlert className={styles.inlineErrorIcon} />
          <h2 className={styles.inlineErrorTitle}>{tt("ui.something.went.wrong.8d88", "Something went wrong")}</h2>
          <p className={styles.inlineErrorSub}>
            {error?.message || tx("An unexpected error occurred while loading tournaments.")}
          </p>
          <div className={styles.pageActions}>
            <button className={`${styles.primaryBtn} goldBTN`} onClick={reset}>{tt("ui.retry.9f5c", "Retry")}</button>
            <Link href="/">
              <button className={styles.secondaryBtn}>{tt("ui.go.home.8007", "Go home")}</button>
            </Link>
          </div>
        </div>
      </div>
    </div>;
}