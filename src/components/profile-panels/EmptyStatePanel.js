'use client';

// A brand new profile, seen by its owner: one "Get started" card.
//
// CEO, 12 November 2026 (inbox 594-17): this used to be a welcome banner and six
// empty tiles, each an icon, a paragraph and a button, about 300px apiece on a
// phone, so a new player scrolled two screens of nothing. Now it is four steps
// in order with one main action, and a line saying where everything else will
// appear. Numbered rather than ticked: none of them is done yet, which is why
// this panel is showing at all.

import Link from 'next/link';
import styles from './EmptyStatePanel.module.css';
import { useT } from '@/i18n/LanguageProvider';

const STEPS = [
  ['/edit-user-profile', 'start.profileTitle', 'Complete your profile', 'start.profileHint', 'A picture, your gamer tag and where you play from.', 'start.profileGo', 'Complete profile'],
  ['/edit-user-profile?panel=games', 'start.gamesTitle', 'Add the games you play', 'start.gamesHint', 'So tournaments and teammates for those games find you.', 'start.gamesGo', 'Add games'],
  ['/tournaments', 'start.tournamentTitle', 'Join a tournament', 'start.tournamentHint', 'Open tournaments, free and paid, with VENT COINS prizes.', 'start.tournamentGo', 'Browse tournaments'],
  ['/teams', 'start.teamTitle', 'Find a team', 'start.teamHint', 'Join a squad or start your own and invite players.', 'start.teamGo', 'Find a team'],
];

const EmptyStatePanel = () => {
  const tt = useT();
  return <section className={styles.start} aria-labelledby="get-started-title">
      <div className={styles.startHead}>
        <h2 id="get-started-title" className={styles.startTitle}>{tt('start.title', 'Get started')}</h2>
        <p className={styles.startSub}>
          {tt('start.sub', 'Your tournaments, events, teams and badges show on this page as you play.')}
        </p>
      </div>
      <ol className={styles.steps}>
        {STEPS.map(([href, titleKey, title, hintKey, hint, goKey, go], i) => <li key={href} className={styles.step}>
            <span className={styles.stepNum} aria-hidden="true">{i + 1}</span>
            <div className={styles.stepText}>
              <span className={styles.stepTitle}>{tt(titleKey, title)}</span>
              <span className={styles.stepHint}>{tt(hintKey, hint)}</span>
            </div>
            <Link href={href} className={i === 0 ? styles.stepMain : styles.stepGo}>
              {tt(goKey, go)}
            </Link>
          </li>)}
      </ol>
    </section>;
};
export default EmptyStatePanel;
