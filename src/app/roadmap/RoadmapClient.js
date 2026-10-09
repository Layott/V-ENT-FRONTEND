'use client';

import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import NotifyWhenOpen from '@/components/coming-soon/NotifyWhenOpen';
import { useT } from '@/i18n/LanguageProvider';
import { ROADMAP } from '@/lib/roadmap';
import shell from '@/components/coming-soon/coming-soon.module.css';
import styles from './roadmap.module.css';

// What V-ENT opens next, one section per module in the order they open. The
// words are the same list each module's own page reads (src/lib/roadmap.js).

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
              {tt('roadmap.intro', 'Tournaments, events and tickets, teams, organisations, the production studio and the wallet are live today. These open next, in this order. There are no dates: each opens when it is ready.')}
            </p>

            {ROADMAP.map((m) => (
              <section key={m.id} className={styles.module} aria-labelledby={`roadmap-${m.id}`}>
                <div className={styles.moduleHead}>
                  <span className={styles.phase}>{tt('roadmap.phase', 'Phase {n}').replace('{n}', m.phase)}</span>
                  {m.built && <span className={styles.built}>{tt('roadmap.builtClosed', 'Built, not open yet')}</span>}
                </div>
                <h2 id={`roadmap-${m.id}`} className={styles.moduleTitle}>{tt(m.title[0], m.title[1])}</h2>
                <p className={styles.blurb}>{tt(m.blurb[0], m.blurb[1])}</p>
                <ol className={styles.features}>
                  {m.features.map(([key, fallback]) => <li key={key}>{tt(key, fallback)}</li>)}
                </ol>
                <div className={styles.actions}>
                  <Link href={m.href} className={styles.more}>
                    {tt('roadmap.openPage', 'Its page')}
                  </Link>
                  <NotifyWhenOpen module={m.id} />
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

export default RoadmapClient;
