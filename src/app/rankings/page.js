'use client';

import { Suspense } from 'react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import RankingsView from './RankingsView';
import styles from './ranking.module.css';
import { useT } from '@/i18n/LanguageProvider';
const Rankings = () => {
  const tt = useT();
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Suspense fallback={<p className={styles.loadingText}>{tt("ui.loading.rankings.fdb4", "Loading rankings…")}</p>}>
            <RankingsView />
          </Suspense>
        </div>
      </main>

      <BottomMenu />
    </div>;
};
export default Rankings;