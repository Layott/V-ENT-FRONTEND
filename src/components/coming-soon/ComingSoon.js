'use client'

import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './coming-soon.module.css';

/**
 * Placeholder for modules whose backend does not exist yet.
 *
 * These pages previously rendered hardcoded sample content, which read as real
 * data to anyone clicking through. Until the API exists they state plainly what
 * is coming and point at what does work today. The original layouts are kept in
 * `docs/wip/` for when the backend lands.
 */
const ComingSoon = ({ title, blurb, phase, alternatives = [] }) => (
  <div className={styles.pageContainer}>
    <Header />
    <MobileHeader />

    <main className={styles.mainContainer}>
      <Sidebar />

      <div className={styles.rightPaneContainer}>
        <div className={styles.card}>
          {phase && <p className={styles.phase}>{phase}</p>}
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.blurb}>{blurb}</p>

          {alternatives.length > 0 && (
            <div className={styles.links}>
              <p className={styles.linksLabel}>Available now</p>
              <div className={styles.linkRow}>
                {alternatives.map((a) => (
                  <Link key={a.href} href={a.href} className={styles.linkPill}>
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>

    <BottomMenu />
  </div>
);

export default ComingSoon;
