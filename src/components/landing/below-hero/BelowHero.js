"use client";

import Image from 'next/image';
import useIntersectionObserver from '@/hooks/useIntersectionObserver';
import curveVector from '@/images/curve_vector.svg';
import observerStyle from '@/styles/intersection/intersection.module.css';
import styles from './below-hero.module.css';
import { useT } from '@/i18n/LanguageProvider';
const BelowHero = () => {
  const tt = useT();
  const [ref, isVisible] = useIntersectionObserver({
    threshold: 0.01
  });
  return <div ref={ref} className={`${styles.belowHeroContainer} ${observerStyle.belowHeroContainer} ${isVisible ? observerStyle.fadeInFromDown : ''}`}>
      <div className={styles.curveVectorContainer}>
        <Image src={curveVector} alt="" aria-hidden="true" className={styles.curveVector} priority />
        <div className={styles.curveVectorText}>
          <p>
            {tt("ui.level.up.gaming.anime.bb20", "Level up your gaming and anime experience with tournaments, exclusive merchandise, and much more. Join V-ENT and unlock a world where fans rule.")}
          </p>
        </div>
      </div>
    </div>;
};
export default BelowHero;