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
            {tt("ui.level.up.gaming.anime.bb20", "Level up your gaming and anime experience with tournaments, exclusive merchandise, and much more. Join V-ENT and unlock a world where fans rule.")}
          </p>
        </div>
      </div>
    </div>;
};
export default BelowHero;