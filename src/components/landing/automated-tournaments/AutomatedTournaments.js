"use client";

import Image from 'next/image';
import Link from 'next/link';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import counterStrikeCard from '@/images/counter_strike_card.webp';
import fifaCard from '@/images/fifa_card.webp';
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
  return <div className={landingStyles.automatedTournamentsContainer}>
        <div className={`${landingStyles.innerAutomatedTournamentsContainer} ${styles.innerAutomatedTournamentsContainer}`}>
            <div className={styles.leftAutomatedTournaments}>
                <div ref={refText} className={`${styles.innerLeftAutomatedTournaments} ${observerStyle.innerLeftAutomatedTournaments} ${isTextVisible ? observerStyle.fadeInDissolve : ''}`}>
                    <div className={`${landingStyles.headingContainer} ${styles.headingContainer}`}>
                        <p className={landingStyles.subHeadingText}>
                            {tt("ui.automated.tournaments.8016", "Automated Tournaments")}
                        </p>
                        <h2 className={landingStyles.headingText}>
                            {tt("ui.ai.powered.tournaments.gamers.3715", "AI-Powered Tournaments \xA0for Gamers")}
                        </h2>
                    </div>
                    
                    <div className={`${landingStyles.descriptionContainer} ${styles.descriptionContainer}`}>
                        <p className={landingStyles.descriptionParagraph}>
                            {tt("ui.compete.exciting.automated.tournaments.7864", "Compete in exciting, automated tournaments for your favorite games. From registration to scoring, our AI-driven system ensures smooth management and real-time updates so you can focus on winning.")}
                        </p>

                        <Link href={'/signup'} className={`${profileStyles.waitlistBTN} ${profileStyles.loginBTN}`}>
                            {tt("ui.signup.894b", "Signup")}
                        </Link>
                    </div>
                </div>
            </div>

            <div className={styles.rightAutomatedTournaments}>
                <div className={styles.innerRightAutomatedTournaments}>
                    <div ref={ref} className={`${styles.counterStrikeCardContainer} ${observerStyle.counterStrikeCardContainer} ${isVisible ? observerStyle.fadeInFromLeft : ''}`}>
                        <Image src={counterStrikeCard} alt={tt("landing.alt.csCard", "A tournament card on V-ENT: Counter Strike battle at Unilag, individuals, 20 players, 1 to 21 October 2024, prize 500,000 naira, entry 40 VENT COINS")} />
                    </div>

                    <div ref={ref} className={`${styles.fifaCardContainer}  ${observerStyle.counterStrikeCardContainer} ${isVisible ? observerStyle.fadeInFromRight : ''}`}>
                        <Image src={fifaCard} alt={tt("landing.alt.fifaCard", "A tournament card on V-ENT: FIFA 25 Showdown, teams or individuals, 10 to 15 players, 1 to 21 October 2024, prize 500,000 naira, entry 40 VENT COINS")} />
                    </div>
                </div>
            </div>
        </div>
    </div>;
};
export default AutomatedTournaments;