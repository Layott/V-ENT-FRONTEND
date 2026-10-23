'use client';

// /circuits/leagues/<slug>: a league, every division of a season (P5d).

import { use } from 'react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import LeagueView from '@/components/circuits/LeagueView';
import styles from '@/components/circuits/circuits.module.css';

export default function LeaguePage(props) {
  const params = use(props.params);
  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPane}>
          <LeagueView slug={decodeURIComponent(params.slug)} />
        </div>
      </main>
      <BottomMenu />
    </div>
  );
}
