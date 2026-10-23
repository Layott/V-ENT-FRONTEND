'use client';

// /circuits: every published circuit (P5). The shell is /rankings'.

import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import CircuitsView from '@/components/circuits/CircuitsView';
import styles from '@/components/circuits/circuits.module.css';

export default function Circuits() {
  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPane}>
          <CircuitsView />
        </div>
      </main>
      <BottomMenu />
    </div>
  );
}
