'use client';

// /circuits/<slug>/manage: running a circuit (P5). The owner and admins; the
// server refuses anybody else, and the screen shows them the public link.

import { use } from 'react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import CircuitManage from '@/components/circuits/CircuitManage';
import styles from '@/components/circuits/circuits.module.css';

export default function CircuitManagePage(props) {
  const params = use(props.params);
  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPane}>
          <CircuitManage slug={decodeURIComponent(params.slug)} />
        </div>
      </main>
      <BottomMenu />
    </div>
  );
}
