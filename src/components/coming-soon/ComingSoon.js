'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ImageViewer from '@/components/image-viewer/ImageViewer';
import styles from './coming-soon.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { roadmapFor } from '@/lib/roadmap';
import NotifyWhenOpen from './NotifyWhenOpen';

/**
 * The page a module shows while it is not open.
 *
 * These pages once rendered hardcoded sample content, which read as real data
 * to anyone clicking through. They state plainly what is coming and point at
 * what works today.
 *
 * With `module` (inbox 421, CEO 8 October 2026: "put something there that will
 * show what we want to build in the future"), the page also says what the
 * module will do, line by line from the product spec, shows real screenshots
 * where it is built and closed, and offers "Tell me when it opens". The words
 * come from src/lib/roadmap.js, the same list /roadmap reads.
 */
const ComingSoon = ({
  module,
  title,
  blurb,
  phase,
  alternatives = []
}) => {
  const tx = useTx();
  const tt = useT();
  const plan = module ? roadmapFor(module) : null;
  const [shot, setShot] = useState(null);
  const shots = (plan?.screenshots || []).map((s) => ({ url: s.src, alt: tt(s.alt[0], s.alt[1]) }));

  return <div className={styles.pageContainer}>
    <Header />
    <MobileHeader />

    <main className={styles.mainContainer}>
      <Sidebar />

      <div className={styles.rightPaneContainer}>
        <div className={`${styles.card} ${plan ? styles.cardPlan : ''}`}>
          {plan
            ? <p className={styles.phase}>{tt('roadmap.phase', 'Phase {n}').replace('{n}', plan.phase)}</p>
            : phase && <p className={styles.phase}>{tx(phase)}</p>}
          <h1 className={styles.title}>{plan ? tt(plan.title[0], plan.title[1]) : tx(title)}</h1>
          <p className={styles.blurb}>{plan ? tt(plan.blurb[0], plan.blurb[1]) : tx(blurb)}</p>

          {plan && <>
            <h2 className={styles.planTitle}>{tt('roadmap.planned', 'What it will do')}</h2>
            <ol className={styles.planList}>
              {plan.features.map(([key, fallback]) => <li key={key}>{tt(key, fallback)}</li>)}
            </ol>

            {shots.length > 0 && <>
              <h2 className={styles.planTitle}>{tt('roadmap.soFar', 'What it looks like so far')}</h2>
              <div className={styles.shots}>
                {shots.map((s, i) => (
                  <button type="button" key={s.url} className={styles.shot} onClick={() => setShot(i)}
                          aria-label={`${s.alt}. ${tt('slots.tapToEnlarge', 'Tap to enlarge')}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.url} alt={s.alt} loading="lazy" />
                  </button>
                ))}
              </div>
              {shot !== null && <ImageViewer images={shots} start={shot} onClose={() => setShot(null)} />}
            </>}

            <NotifyWhenOpen module={plan.id} />
            <p className={styles.roadmapLink}>
              <Link href="/roadmap">{tt('roadmap.seeAll', 'Everything on the roadmap')}</Link>
            </p>
          </>}

          {alternatives.length > 0 && <div className={styles.links}>
              <p className={styles.linksLabel}>{tt("ui.available.now.bb37", "Available now")}</p>
              <div className={styles.linkRow}>
                {alternatives.map(a => <Link key={a.href} href={a.href} className={styles.linkPill}>
                    {tx(a.label)}
                  </Link>)}
              </div>
            </div>}
        </div>
      </div>
    </main>

    <BottomMenu />
  </div>;
};
export default ComingSoon;
