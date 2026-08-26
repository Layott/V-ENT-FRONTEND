'use client';

import { mediaUrl } from '@/lib/mediaUrl';
import Image from 'next/image';
import { useLanguage } from '@/i18n/LanguageProvider';
import { basicInfoRows, show } from '../reviewFields';
import styles from './review-basic-info.module.css';

// The first panel of the Review step: what the organiser typed on Basic Info.
//
// This used to render a fixed, invented tournament - "Leagues of Legend -
// Unilag Showdown 2024", the game "Tekken", a venue in Lagos and a WhatsApp
// link - regardless of what had been entered, and the parent rendered it with
// no props at all. So the last screen before publishing, the one whose entire
// job is to let somebody check their own work, showed them somebody else's.
//
// A field left empty shows a dash rather than a plausible-looking default.
// "Venue: Unilag, Lagos" on a tournament with no venue set is worse than a
// blank, because a blank is a question and a wrong value is an answer.

const ReviewBasicInfo = ({ formData = {} }) => {
  const { t, language } = useLanguage();
  const rows = basicInfoRows(t, formData, language);
  const description = String(formData.tournament_description || '').trim();

  return (
    <>
      <div className={`${styles.infoContainer} ${styles.staticInfoContainer}`}>
        <div className={styles.leftSideContainer}>
          <h3>{t('review.row.title', 'Tournament title')}</h3>
        </div>
        <div className={styles.rightSideContainer}>
          <p>{show(formData.tournament_title)}</p>
        </div>
      </div>

      <div className={styles.infoContainer}>
        <div className={styles.leftSideContainer}>
          <h3>{t('review.row.game', 'Game')}</h3>
        </div>
        <div className={styles.rightSideContainer}>
          <p>{show(formData.game)}</p>
        </div>
      </div>

      <div className={styles.infoContainer}>
        <div className={styles.leftSideContainer}>
          <h3>{t('review.row.gameMode', 'Game mode')}</h3>
        </div>
        <div className={styles.rightSideContainer}>
          <p>{show(formData.game_mode)}</p>
        </div>
      </div>

      <div className={`${styles.infoContainer} ${styles.descriptionInfoContainer}`}>
        <div className={`${styles.leftSideContainer} ${styles.leftSideDescriptionContainer}`}>
          <h3>{t('review.row.description', 'Description')}</h3>
        </div>
        <div className={styles.rightSideContainer}>
          {description
            ? description.split(/\n+/).map((para, i) => <p key={i}>{para}</p>)
            : <p>{t('review.nothingWritten', 'Nothing written yet')}</p>}
        </div>
      </div>

      {rows.map(([label, value]) => (
        <div key={label} className={styles.infoContainer}>
          <div className={styles.leftSideContainer}>
            <h3>{label}</h3>
          </div>
          <div className={styles.rightSideContainer}>
            <p>{value}</p>
          </div>
        </div>
      ))}

      {formData.linked_event_name && (
        <div className={`${styles.infoContainer} ${styles.staticInfoContainer}`}>
          <div className={styles.leftSideContainer}>
            <h3>{t('review.row.linkedEvent', 'Part of the event')}</h3>
          </div>
          <div className={styles.rightSideContainer}>
            <p>{formData.linked_event_name}</p>
          </div>
        </div>
      )}

      <div className={`${styles.infoContainer} ${styles.staticInfoContainer}`}>
        <div className={styles.leftSideContainer}>
          <h3>{t('review.row.banner', 'Banner')}</h3>
        </div>
        <div className={styles.rightSideContainer}>
          {formData.bannerPreview || formData.tournament_banner ? (
            <div className={styles.bannerImageContainer}>
              <Image
                src={mediaUrl(formData.bannerPreview || formData.tournament_banner)}
                alt={t('review.alt.banner', 'The banner you chose for this tournament')}
                width={480}
                height={200}
                unoptimized
              />
            </div>
          ) : (
            <p>{t('review.noBanner', 'No banner chosen')}</p>
          )}
        </div>
      </div>
    </>
  );
};

export default ReviewBasicInfo;
