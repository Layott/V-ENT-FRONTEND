'use client';

import Link from 'next/link';
import styles from './EmptyStatePanel.module.css';
import { useT } from '@/i18n/LanguageProvider';
const EmptyCard = ({
  icon,
  title,
  count,
  illusType = 'default',
  stateTitle,
  stateText,
  ctaLabel,
  ctaHref,
  ctaIcon,
  ghost = false
}) => <div className={styles.card}>
    <div className={styles.cardHead}>
      <div className={styles.cardTitleRow}>
        <div className={styles.cardTitleIcon}>{icon}</div>
        <span className={styles.cardTitle}>{title}</span>
      </div>
      <span className={styles.cardCount}>{count}</span>
    </div>
    <div className={styles.state}>
      <div className={`${styles.illus} ${illusType === 'grn' ? styles.illusGrn : ''}`}>
        <svg width="42" height="42" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {illusType === 'tournaments' && <>
            <path d="M18 24h-3.5a4.5 4.5 0 0 1 0-9H18" />
            <path d="M46 24h3.5a4.5 4.5 0 0 0 0-9H46" />
            <path d="M14 56h36" />
            <path d="M26 38v6c0 1.5-1 2.5-2.5 3-2 .8-4.5 2.5-4.5 9" />
            <path d="M38 38v6c0 1.5 1 2.5 2.5 3 2 .8 4.5 2.5 4.5 9" />
            <path d="M46 8H18v15a14 14 0 0 0 28 0V8z" />
          </>}
          {illusType === 'events' && <>
            <rect x="10" y="14" width="44" height="42" rx="3" />
            <path d="M10 26h44" />
            <path d="M22 8v12" />
            <path d="M42 8v12" />
            <circle cx="20" cy="38" r="2" fill="currentColor" />
            <circle cx="32" cy="38" r="2" fill="currentColor" />
            <circle cx="44" cy="38" r="2" fill="currentColor" />
          </>}
          {illusType === 'games' && <>
            <rect x="6" y="18" width="52" height="32" rx="10" />
            <path d="M16 32h10M21 27v10" />
            <circle cx="42" cy="30" r="2.2" fill="currentColor" />
            <circle cx="48" cy="36" r="2.2" fill="currentColor" />
          </>}
          {illusType === 'social' && <>
            <circle cx="20" cy="18" r="5" />
            <circle cx="44" cy="32" r="5" />
            <circle cx="20" cy="46" r="5" />
            <path d="M24.5 21l15 8" />
            <path d="M24.5 43l15-8" />
          </>}
          {illusType === 'teams' && <>
            <circle cx="22" cy="22" r="7" />
            <path d="M10 50c0-7 5.5-12 12-12s12 5 12 12" />
            <circle cx="44" cy="26" r="6" />
            <path d="M38 50c0-6 4-11 10-11" />
          </>}
          {illusType === 'achievements' && <>
            <circle cx="32" cy="22" r="14" />
            <path d="M22 33l-4 22 14-8 14 8-4-22" />
            <path d="M28 22l3 3 6-7" />
          </>}
          {illusType === 'default' && <circle cx="32" cy="32" r="14" />}
        </svg>
      </div>
      <h4 className={styles.stateTitle}>{stateTitle}</h4>
      <p className={styles.stateText}>{stateText}</p>
      {ctaHref ? <Link href={ctaHref} className={`${styles.stateBtn} ${ghost ? styles.stateBtnGhost : ''}`}>
          {ctaIcon}
          {ctaLabel}
        </Link> : null}
    </div>
  </div>;
const EmptyStatePanel = ({
  achievementsTotal = 12
}) => {
  const tt = useT();
  return <div className={styles.wrap}>
      <div className={styles.welcomeBanner}>
        <div className={styles.welcomeLeft}>
          <div className={styles.welcomeIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l2.39 7.36H22l-6.18 4.49L18.21 21 12 16.51 5.79 21l2.39-7.15L2 9.36h7.61z" />
            </svg>
          </div>
          <div>
            <div className={styles.welcomeTitle}>{tt("ui.welcome.v.ent.b1eb", "Welcome to V-ENT")}</div>
            <div className={styles.welcomeSub}>{tt("ui.set.up.profile.join.be2e", "Set up your profile, join your first tournament, and start building your gaming legacy.")}</div>
          </div>
        </div>
        <Link href="/edit-user-profile" className={styles.welcomeBtn}>
          {tt("ui.complete.profile.fdb0", "Complete profile")}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </Link>
      </div>

      <div className={styles.grid}>
        <EmptyCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2z" /></svg>} title={tt("ui.tournaments.fee2", "Tournaments")} count="0" illusType="tournaments" stateTitle="No tournaments yet" stateText="You haven't joined any tournaments. Browse open tournaments and compete for VENT COINS prizes." ctaLabel="Browse tournaments" ctaHref="/tournaments" ctaIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>} />
        <EmptyCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>} title={tt("ui.events.c549", "Events")} count="0" illusType="events" stateTitle="No events yet" stateText="You haven't attended any events. Discover gaming meetups, conventions, and watch parties near you." ctaLabel="Browse events" ctaHref="/events" ctaIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>} />
        <EmptyCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="4" /><path d="M6 12h4m-2-2v4M15 13h.01M17 11h.01" /></svg>} title={tt("ui.favorite.games.a8bb", "Favorite Games")} count="0" illusType="games" stateTitle="No favorite games" stateText="Tag the games you play so we can match you with the right tournaments and teammates." ctaLabel="Add games" ctaHref="/edit-user-profile?panel=games" ctaIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>} />
        <EmptyCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /></svg>} title={tt("ui.social.links.339c", "Social Links")} count="0" illusType="social" stateTitle="No social links" stateText="Connect Twitch, YouTube, X or Discord so other players can find you outside the platform." ctaLabel="Add social links" ctaHref="/edit-user-profile?panel=social" ctaIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>} />
        <EmptyCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /></svg>} title={tt("ui.teams.cbfd", "Teams")} count="0" illusType="teams" stateTitle="No teams" stateText="Squad up. Find a team to compete with or create your own and recruit teammates." ctaLabel="Find a team" ctaHref="/teams" ctaIcon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>} />
        <EmptyCard icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>} title={tt("ui.achievements.a663", "Achievements")} count={`0 / ${achievementsTotal}`} illusType="achievements" stateTitle="No achievements yet" stateText="Every champion starts at zero. Play your first match, win your first tournament, unlock your first badge." ctaLabel="See all badges" ctaHref="#" ctaIcon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>} ghost />
      </div>
    </div>;
};
export default EmptyStatePanel;