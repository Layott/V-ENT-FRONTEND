import styles from './create-tournament.module.css';

export default function Loading() {
  return (
    <div className={styles.pageContainer}>
      <div className={styles.loadingState}>
        <div className={styles.loadingCard}>
          <div className={styles.spinner} />
          <span>Loading tournament creator…</span>
        </div>
      </div>
    </div>
  );
}
