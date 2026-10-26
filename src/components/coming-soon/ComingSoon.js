'use client';

import Link from 'next/link';
import BackLink from '@/components/back-link/BackLink';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import RoadmapMap from '@/components/roadmap-map/RoadmapMap';
import styles from './coming-soon.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import { roadmapFor } from '@/lib/roadmap';

/**
 * The page a module shows while it is not open.
 *
 * These pages once rendered hardcoded sample content, which read as real data
 * to anyone clicking through. They state plainly what is coming and point at
 * what works today.
 *
 * With `module` (inbox 421, CEO 8 October 2026: "put something there that will
 * show what we want to build in the future"), the page also draws its own
 * branch of the roadmap (inbox 426): the climb from what is live today up to
 * this module, with what it will do for you, real screenshots where it is
 * built and closed, and "Tell me when it opens". The words come from
 * src/lib/roadmap.js, the same list /roadmap reads.
 */
const ComingSoon = ({
  module,
  title,
  blurb,
  phase,
  alternatives = [],
  back
}) => {
  const tx = useTx();
  const tt = useT();
  const plan = module ? roadmapFor(module) : null;
  // Every closed page has a way back. A caller may name its own; otherwise it
  // is the front door, which is safe signed in or out.
  const way = back || { href: '/', label: tt('common.back', 'Back') };

  return <div className={styles.pageContainer}>
    <Header />
    <MobileHeader />

    <main className={styles.mainContainer}>
      <Sidebar />

      <div className={styles.rightPaneContainer}>
        <BackLink href={way.href}>{way.label}</BackLink>
        <div className={`${styles.card} ${plan ? styles.cardPlan : ''}`}>
          {!plan && phase && <p className={styles.phase}>{tx(phase)}</p>}
          <h1 className={styles.title}>{plan ? tt(plan.title[0], plan.title[1]) : tx(title)}</h1>
          <p className={styles.blurb}>{plan ? tt(plan.blurb[0], plan.blurb[1]) : tx(blurb)}</p>

          {plan && <>
            <p className={styles.branchIntro}>
              {tt('roadmap.branchIntro', 'Here is how it gets built, from what is live today.')}
            </p>
            <RoadmapMap focus={plan.id} />
            <p className={styles.roadmapLink}>
              <Link href="/roadmap">{tt('roadmap.seeAll', 'Everything on the roadmap')}</Link>
            </p>
          </>}

          {alternatives.length > 0 && <div className={styles.links}>
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
