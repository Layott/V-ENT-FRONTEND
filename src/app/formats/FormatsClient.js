'use client';

import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import FormatExplainer, { explainerWords } from '@/components/format-explainer/FormatExplainer';
import { EXPLAINER_KEYS } from '@/lib/explainers';
import { useT } from '@/i18n/LanguageProvider';
import shell from '@/components/coming-soon/coming-soon.module.css';
import styles from './formats.module.css';

// Every format, each with its explainer (inbox 476). The explainers wait on
// the finished picture until somebody presses play: thirteen playing at once
// is noise, and the finished bracket is already the most useful still. Each
// format's three sentences are ordinary text under its picture, so the page
// reads completely without watching anything.

const anchor = (key) => key.replace(/_/g, '-');

const FormatsClient = () => {
  const tt = useT();
  return (
    <div className={shell.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={shell.mainContainer}>
        <Sidebar />
        <div className={`${shell.rightPaneContainer} ${styles.pane}`}>
          <div className={styles.page}>
            <h1 className={styles.title}>{tt('formats.pageTitle', 'How each format works')}</h1>
            <p className={styles.intro}>
              {tt('formats.intro', 'Every way to run a tournament on V-ENT, each shown as a short moving bracket with three plain sentences. Press play on any of them, or read the sentences under it.')}
            </p>

            <nav className={styles.jump} aria-label={tt('formats.jumpTo', 'Go to a format')}>
              {EXPLAINER_KEYS.map((key) => (
                <a key={key} href={`#${anchor(key)}`} className={styles.jumpChip}>
                  {explainerWords(tt, key).title}
                </a>
              ))}
            </nav>

            <div className={styles.list}>
              {EXPLAINER_KEYS.map((key) => (
                <section key={key} id={anchor(key)} className={styles.format}>
                  <h2 className={styles.formatTitle}>{explainerWords(tt, key).title}</h2>
                  <FormatExplainer format={key} showLines />
                </section>
              ))}
            </div>

            <section className={styles.create}>
              <h2 className={styles.createTitle}>{tt('formats.createTitle', 'Ready to run one?')}</h2>
              <p className={styles.createBody}>
                {tt('formats.createBody', 'Choose any of these when you create a tournament. The same explainer sits beside each format while you choose.')}
              </p>
              <Link href="/tournaments/create-tournament" className={`btn goldBTN ${styles.createBtn}`}>
                {tt('formats.create', 'Create a tournament')}
              </Link>
            </section>
          </div>
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

export default FormatsClient;
