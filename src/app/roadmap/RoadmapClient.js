'use client';

import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import RoadmapMap from '@/components/roadmap-map/RoadmapMap';
import { useT } from '@/i18n/LanguageProvider';
import shell from '@/components/coming-soon/coming-soon.module.css';
import styles from './roadmap.module.css';

// What V-ENT opens next, drawn as one climb from what is live today (inbox
// 426). The words are the same list each module's own page reads
// (src/lib/roadmap.js).

const RoadmapClient = () => {
  const tt = useT();
  return (
    <div className={shell.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={shell.mainContainer}>
        <Sidebar />
        <div className={`${shell.rightPaneContainer} ${styles.pane}`}>
          <div className={styles.page}>
            <h1 className={styles.title}>{tt('roadmap.pageTitle', 'What is coming to V-ENT')}</h1>
            <p className={styles.intro}>
              {tt('roadmap.intro', 'Everything here grows out of what is live today. Each step opens when it is ready, so there are no dates. Press a step to see what it brings you.')}
            </p>
            <RoadmapMap />
          </div>
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

export default RoadmapClient;
