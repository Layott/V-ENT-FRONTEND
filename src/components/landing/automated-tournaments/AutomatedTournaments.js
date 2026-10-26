"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import { ventFetch, API, toTournamentArray, tournamentStatus } from '@/components/tournament-lib/tournamentApi';
import TournamentCard from '@/components/tournament-card/TournamentCard';
import observerStyle from '@/styles/intersection/intersection.module.css';
import landingStyles from '@/styles/landing/landing.module.css';
import styles from './automated-tournaments.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useViewer } from '@/lib/gating';

const DAY_MS = 24 * 60 * 60 * 1000;
// Live first, then the ones still to come.
const ORDER = { live: 0, ongoing: 0, in_progress: 0, registration_open: 1, upcoming: 1, published: 1, registration_closed: 1 };

// A status is only as fresh as the last time somebody pressed a button. The
// home page led with "Lagos CODM Clash, LIVE" two months after it ended,
// because nobody ever closed it (inbox 561). So the dates decide too: live
// means it has not finished more than a day ago, and everything else must
// still be ahead. A date that cannot be read is given the benefit.
function stillCurrent(t, now) {
  const start = Date.parse(t?.start_date || '');
  const end = Date.parse(t?.end_date || '') || start;
  if (ORDER[tournamentStatus(t)] === 0) return !Number.isFinite(end) || end > now - DAY_MS;
  return !Number.isFinite(start) || start > now;
}

const AutomatedTournaments = () => {
  const tt = useT();
  const viewer = useViewer();
  const [refText, isTextVisible] = useIntersectionObserver({
    threshold: 0.2
  });
  // Real tournaments, not pictures of one (apple-design review, inbox 547).
  // null while asking, [] when there is nothing to show.
  const [live, setLive] = useState(null);
  // A failed load says so; it is not the same as no tournaments being open.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let off = false;
    ventFetch(API.TOURNAMENT.LIST)
      .then(data => {
        if (off) return;
        const now = Date.now();
        const shown = toTournamentArray(data)
          .filter(t => tournamentStatus(t) in ORDER && stillCurrent(t, now))
          .sort((a, b) => ORDER[tournamentStatus(a)] - ORDER[tournamentStatus(b)]
            || String(a?.start_date || '').localeCompare(String(b?.start_date || '')));
        setLive(shown.slice(0, 3));
      })
      .catch(() => { if (!off) { setFailed(true); setLive([]); } });
    return () => { off = true; };
  }, []);
  // The words sit above the cards and the cards take the full width. Side by
  // side, three tall cards in a 520px column left an empty field the width of
  // the screen beside a three-line paragraph (CEO, 26 October 2026: "the
  // landing page is broken").
  return <section className={landingStyles.automatedTournamentsContainer}>
        <div className={styles.inner}>
            <div ref={refText} className={`${styles.intro} ${observerStyle.innerLeftAutomatedTournaments} ${isTextVisible ? observerStyle.fadeInDissolve : ''}`}>
                <div className={styles.introText}>
                    <p className={landingStyles.subHeadingText}>
                        {tt("ui.automated.tournaments.8016", "Automated Tournaments")}
                    </p>
                    <h2 className={landingStyles.headingText}>
                        {tt("ui.ai.powered.tournaments.gamers.3715", "Tournaments that run themselves")}
                    </h2>
                    <p className={`${landingStyles.descriptionParagraph} ${styles.description}`}>
                        {tt("ui.compete.exciting.automated.tournaments.7864", "Brackets draw themselves, both sides confirm each result, and the standings update as the scores come in, so you can focus on winning.")}
                    </p>
                </div>

                {/* Signup is for somebody without an account; a signed-in
                    visitor was offered it here too. Nothing is decided while
                    the session is still being asked for. */}
                <div className={styles.actions}>
                    {!viewer.loading && !viewer.signedIn && (
                        <Link href="/signup" className="btn redBTN">
                            {tt("ui.signup.894b", "Signup")}
                        </Link>
                    )}
                    <Link href="/tournaments" className={`btn ${viewer.signedIn ? 'redBTN' : styles.quietBtn}`}>
                        {tt('landing.browseAll', 'See every tournament')}
                    </Link>
                </div>
            </div>

            <div className={styles.liveList} aria-busy={live === null}>
                {live === null && [0, 1, 2].map(i => <div key={i} className={styles.liveSkeleton} />)}
                {live && live.length === 0 && (
                    <p className={styles.liveEmpty} role={failed ? 'alert' : undefined}>
                        {failed
                            ? tt('landing.liveLoadFailed', 'Open tournaments could not be loaded just now.')
                            : tt('landing.noLiveTournaments', 'Open tournaments appear here as organisers publish them.')}
                    </p>
                )}
                {live && live.map((t, i) => <TournamentCard key={t?.slug || i} t={t} />)}
            </div>
        </div>
    </section>;
};
export default AutomatedTournaments;
