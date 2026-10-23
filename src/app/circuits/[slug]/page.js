'use client';

// /circuits/<slug>: one circuit, its ranking and how points work (P5).

import { use } from 'react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import CircuitView from '@/components/circuits/CircuitView';
import styles from '@/components/circuits/circuits.module.css';

export default function CircuitPage(props) {
  const params = use(props.params);
  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPane}>
          <CircuitView slug={decodeURIComponent(params.slug)} />
        </div>
      </main>
      <BottomMenu />
    </div>
  );
}
