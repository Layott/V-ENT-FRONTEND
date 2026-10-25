"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { ventFetch, API, toTournamentArray, tournamentStatus } from '@/components/tournament-lib/tournamentApi';
import TournamentCard from '@/components/tournament-card/TournamentCard';
import observerStyle from '@/styles/intersection/intersection.module.css';
import profileStyles from '@/styles/profile/profile-page.module.css';
import landingStyles from '@/styles/landing/landing.module.css';
import styles from './automated-tournaments.module.css';
import { useT } from '@/i18n/LanguageProvider';
const AutomatedTournaments = ({
  scrollToForm
}) => {
  const tt = useT();
  const [ref, isVisible] = useIntersectionObserver({
    threshold: 0.01
  });
  const [refText, isTextVisible] = useIntersectionObserver({
    threshold: 0.2
  });
  // Real tournaments, not pictures of one (apple-design review, inbox 547: the
  // card here was an image of "Counter strike battle, Unilag, October 2024", an
  // event that was never on the platform). Upcoming and live first, nearest
  // first, three at most. null while asking, [] when there is nothing to show.
  const [live, setLive] = useState(null);
  // A failed load says so; it is not the same as no tournaments being open.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let off = false;
    ventFetch(API.TOURNAMENT.LIST)
      .then(data => {
        if (off) return;
        const order = { live: 0, ongoing: 0, in_progress: 0, registration_open: 1, upcoming: 1, published: 1, registration_closed: 2 };
        const shown = toTournamentArray(data)
          .filter(t => tournamentStatus(t) in order)
          .sort((a, b) => order[tournamentStatus(a)] - order[tournamentStatus(b)]
            || String(a?.start_date || '').localeCompare(String(b?.start_date || '')));
        setLive(shown.slice(0, 3));
      })
      .catch(() => { if (!off) { setFailed(true); setLive([]); } });
    return () => { off = true; };
  }, []);
  return <div className={landingStyles.automatedTournamentsContainer}>
        <div className={`${landingStyles.innerAutomatedTournamentsContainer} ${styles.innerAutomatedTournamentsContainer}`}>
            <div className={styles.leftAutomatedTournaments}>
                <div ref={refText} className={`${styles.innerLeftAutomatedTournaments} ${observerStyle.innerLeftAutomatedTournaments} ${isTextVisible ? observerStyle.fadeInDissolve : ''}`}>
                    <div className={`${landingStyles.headingContainer} ${styles.headingContainer}`}>
                        <p className={landingStyles.subHeadingText}>
                            {tt("ui.automated.tournaments.8016", "Automated Tournaments")}
                        </p>
                        <h2 className={landingStyles.headingText}>
                            {tt("ui.ai.powered.tournaments.gamers.3715", "Tournaments that run themselves")}
                        </h2>
                    </div>
                    
                    <div className={`${landingStyles.descriptionContainer} ${styles.descriptionContainer}`}>
                        <p className={landingStyles.descriptionParagraph}>
                            {tt("ui.compete.exciting.automated.tournaments.7864", "Brackets draw themselves, both sides confirm each result, and the standings update as the scores come in, so you can focus on winning.")}
                        </p>

                        <Link href={'/signup'} className={`${profileStyles.waitlistBTN} ${profileStyles.loginBTN}`}>
                            {tt("ui.signup.894b", "Signup")}
                        </Link>
                    </div>
                </div>
            </div>

            <div className={styles.rightAutomatedTournaments}>
                <div ref={ref} className={styles.liveList} aria-busy={live === null}>
                    {live === null && [0, 1, 2].map(i => <div key={i} className={styles.liveSkeleton} />)}
                    {live && live.length === 0 && (
                        <p className={styles.liveEmpty} role={failed ? 'alert' : undefined}>
                            {failed
                                ? tt('landing.liveLoadFailed', 'Open tournaments could not be loaded just now.')
                                : tt('landing.noLiveTournaments', 'Open tournaments appear here as organisers publish them.')}{' '}
                            <Link href="/tournaments">{tt('landing.browseAll', 'See every tournament')}</Link>
                        </p>
                    )}
                    {live && live.map((t, i) => <TournamentCard key={t?.slug || i} t={t} />)}
                </div>
            </div>
        </div>
    </div>;
};
export default AutomatedTournaments;