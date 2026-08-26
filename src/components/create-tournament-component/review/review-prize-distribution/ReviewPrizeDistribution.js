'use client';

import { useLanguage } from '@/i18n/LanguageProvider';
import { prizeRows } from '../reviewFields';
import styles from '../review-basic-info/review-basic-info.module.css';

// The prize table as entered. Previously a fixed 100/80/50/30 split that bore
// no relation to what had been typed on the prize step.

const ReviewPrizeDistribution = ({ formData = {} }) => {
  const { t } = useLanguage();
  const rows = prizeRows(t, formData);

  return (
    <>
      {rows.map(([label, value], index) => (
        <div key={`${label}-${index}`} className={styles.infoContainer}>
          <div className={styles.leftSideContainer}>
            <h3>{label}</h3>
          </div>
          <div className={styles.rightSideContainer}>
            <p>{value}</p>
          </div>
        </div>
      ))}
    </>
  );
};

export default ReviewPrizeDistribution;
