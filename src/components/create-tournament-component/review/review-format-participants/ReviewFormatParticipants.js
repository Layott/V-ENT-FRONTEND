'use client';

import { useLanguage } from '@/i18n/LanguageProvider';
import { formatRows } from '../reviewFields';
import styles from '../review-basic-info/review-basic-info.module.css';

// Format and participants, as entered. Previously a fixed "Single Elimination,
// 48 players, Counter-Strike" no matter what the organiser had chosen.

const ReviewFormatParticipants = ({ formData = {} }) => {
  const { t } = useLanguage();
  const rules = String(formData.tournament_rules || '').trim();

  return (
    <>
      {formatRows(t, formData).map(([label, value]) => (
        <div key={label} className={styles.infoContainer}>
          <div className={styles.leftSideContainer}>
            <h3>{label}</h3>
          </div>
          <div className={styles.rightSideContainer}>
            <p>{value}</p>
          </div>
        </div>
      ))}

      <div className={`${styles.infoContainer} ${styles.descriptionInfoContainer}`}>
        <div className={`${styles.leftSideContainer} ${styles.leftSideDescriptionContainer}`}>
          <h3>{t('review.row.rules', 'Rules')}</h3>
        </div>
        <div className={styles.rightSideContainer}>
          {rules
            ? <div dangerouslySetInnerHTML={{ __html: rules }} />
            : <p>{t('review.noRules', 'No rules written yet')}</p>}
        </div>
      </div>
    </>
  );
};

export default ReviewFormatParticipants;
