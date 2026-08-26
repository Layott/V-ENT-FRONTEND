'use client';

import { mediaUrl } from '@/lib/mediaUrl';
import Image from 'next/image';
import { useLanguage } from '@/i18n/LanguageProvider';
import createTournamentStyles from '@/styles/create-tournament/create-tournament.module.css';
import bioInfoStyles from '../review-basic-info/review-basic-info.module.css';
import styles from './review-sponsor-links.module.css';

// Sponsors and links, as entered.
//
// This panel used to render a fixed wall of real companies - Red Bull, Carbon,
// CarryFirst, Cade Esports - on every tournament anybody created, plus three
// social links all pointing at facebook.com. Two separate problems in one
// component: an organiser was shown sponsors they had not signed, and the
// platform was displaying other companies' marks as if they had backed it.
//
// A tournament with no sponsors now says so, which is the truthful answer and
// also the common one.

const LINK_LABELS = {
  facebook_link: 'Facebook',
  twitter_link: 'Twitter / X',
  instagram_link: 'Instagram',
  youtube_link: 'YouTube',
  twitch_link: 'Twitch',
  kick_link: 'Kick',
  tiktok_link: 'TikTok',
  bigolive_link: 'Bigo Live',
};

const SponsorCard = ({ sponsor, index, t }) => {
  const logo = sponsor?.logoPreview || sponsor?.logo;
  const isRenderable = typeof logo === 'string' || (logo && typeof logo === 'object' && logo.src);

  return (
    <div className={styles.sponsorsContainer}>
      <p>{t('review.sponsorN', 'Sponsor {n}').replace('{n}', index + 1)}</p>
      <div className={styles.sponsorContainer}>
        {isRenderable && (
          <div className={styles.logoImageContainer}>
            <Image
              src={mediaUrl(logo)}
              alt={t('review.alt.sponsorLogo', 'The logo of {name}')
                .replace('{name}', sponsor?.name || '')}
              width={64}
              height={64}
              unoptimized
            />
          </div>
        )}
        <div className={styles.sponsorNameAndUsernameContainer}>
          <h3 className={bioInfoStyles.headerH3}>{sponsor?.name || '–'}</h3>
          {sponsor?.username && <p>{sponsor.username}</p>}
        </div>
      </div>
    </div>
  );
};

const ReviewSponsorLinks = ({ formData = {} }) => {
  const { t } = useLanguage();

  const sponsors = (Array.isArray(formData.sponsors) ? formData.sponsors : [])
    .filter((s) => s && (s.name || s.logo || s.logoPreview));

  const links = Object.entries(formData.webSocialLinks || {})
    .filter(([, value]) => String(value || '').trim() !== '');

  return (
    <>
      <h3 className={bioInfoStyles.headerH3}>{t('review.sponsors', 'Sponsors')}</h3>
      {sponsors.length > 0 ? (
        <div className={styles.reviewImageContainer}>
          {sponsors.map((sponsor, index) => (
            <SponsorCard key={index} sponsor={sponsor} index={index} t={t} />
          ))}
        </div>
      ) : (
        <p className={createTournamentStyles.mutedNote}>
          {t('review.noSponsors', 'No sponsors added')}
        </p>
      )}

      <h3 className={bioInfoStyles.headerH3}>{t('review.links', 'Web and social links')}</h3>
      {links.length > 0 ? (
        links.map(([key, value]) => (
          <div key={key} className={bioInfoStyles.infoContainer}>
            <div className={bioInfoStyles.leftSideContainer}>
              <h3>{LINK_LABELS[key] || key.replace(/_link$/, '')}</h3>
            </div>
            <div className={bioInfoStyles.rightSideContainer}>
              <p>{value}</p>
            </div>
          </div>
        ))
      ) : (
        <p className={createTournamentStyles.mutedNote}>
          {t('review.noLinks', 'No links added')}
        </p>
      )}
    </>
  );
};

export default ReviewSponsorLinks;
