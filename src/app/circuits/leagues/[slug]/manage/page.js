'use client';

// /circuits/leagues/<slug>/manage: running a league (P5d). The owner and
// admins; the server refuses anybody else, and the screen shows them the
// public link.

import { use } from 'react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import LeagueManage from '@/components/circuits/LeagueManage';
import styles from '@/components/circuits/circuits.module.css';

export default function LeagueManagePage(props) {
  const params = use(props.params);
  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPane}>
          <LeagueManage slug={decodeURIComponent(params.slug)} />
        </div>
      </main>
      <BottomMenu />
    </div>
  );
}
