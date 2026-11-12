"use client";

import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import observerStyle from '@/styles/intersection/intersection.module.css';
import styles from './below-hero.module.css';
import { useT } from '@/i18n/LanguageProvider';
const BelowHero = () => {
  const tt = useT();
  const [ref, isVisible] = useIntersectionObserver({
    threshold: 0.01
  });
  return <div ref={ref} className={`${styles.belowHeroContainer} ${observerStyle.belowHeroContainer} ${isVisible ? observerStyle.fadeInFromDown : ''}`}>
      {/* A filled panel. The cut-corner frame drawn in a thin red line was a
          hairline box under the hero (inbox 561). */}
      <div className={styles.curveVectorContainer}>
        <div className={styles.curveVectorText}>
          <p>
            {tt("landing.belowHero.plain", "Find a tournament, register your team, buy a ticket to an event and follow the results in one place. Entry fees and tickets are paid in VENT COINS or by card.")}
          </p>
        </div>
      </div>
    </div>;
};
export default BelowHero;