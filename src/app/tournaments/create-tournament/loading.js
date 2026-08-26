import { getT } from '@/i18n/server';
import styles from './create-tournament.module.css';

export default function Loading() {
  const t = getT();
  return (
    <div className={styles.pageContainer}>
      <div className={styles.loadingState}>
        <div className={styles.loadingCard}>
          <div className={styles.spinner} />
          <span>{t('loading.createTournament', 'Loading tournament creator…')}</span>
        </div>
      </div>
    </div>
  );
}
