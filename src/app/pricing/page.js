'use client';

// What V-ENT will charge for, and why nothing is charged for yet.
//
// CEO, 7 September 2026: "let do a page that says pricing options will come
// soon, but that they should enjoy it all free for now. But several features
// will soon be locked and will require payment, that in the meantime they
// should enjoy and test."
//
// ## Two things this page has to do at once
//
// Say everything is free, and say some of it will not be. Those pull against
// each other, and a page that only does the first is the reason people feel
// tricked later. So the list of what will need paying for is ON this page,
// named, before anybody has built a season around it.
//
// ## The promise that keeps it honest
//
// From `tasks/pricing-proposal.md`, section 5: "A gate is a new capability or a
// cap above current usage. Never something people already have." Putting a
// paywall in front of a working feature takes it from the people most likely to
// have paid. That is written on the page rather than kept in a document,
// because it is the part a reader actually needs.
//
// No prices, no tiers, no three-column table. There is no price yet, and
// inventing one to fill the layout would be a number somebody plans around.

import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { useT } from '@/i18n/LanguageProvider';
import styles from './pricing.module.css';

// What will eventually need paying for, taken from the premium document rather
// than invented here. Each one is a NEW capability or a cap above what people
// do today, which is the rule that decides whether something may be gated.
const COMING = [
  {
    key: 'hosting',
    title: 'Hosting at scale',
    line: 'Running several tournaments at once, and fields larger than the free cap. Running one tournament of ordinary size stays free.',
  },
  {
    key: 'studio',
    title: 'The production studio',
    line: 'Broadcast graphics bound to live results, the four layers you paste into OBS, and your own uploaded overlays on air.',
  },
  {
    key: 'analytics',
    title: 'Numbers worth keeping',
    line: 'Who came, where they came from, what sold and when, and exports you can take away.',
  },
  {
    key: 'reach',
    title: 'Being found',
    line: 'Boosting a listing, endorsements, and sending to the people who followed you.',
  },
  {
    key: 'money',
    title: 'Money that moves itself',
    line: 'Prizes paid out automatically at the whistle, referral discounts on tickets, and team finances in one place.',
  },
  {
    key: 'identity',
    title: 'Identity',
    line: 'Verification, emblems, and a profile that shows more of what you have done.',
  },
];

// What is free now and is not being taken away. Named explicitly, because "free
// for now" without this list reads as "everything becomes paid later".
const STAYS_FREE = [
  'Creating and running tournaments and events',
  'Selling and scanning tickets',
  'Teams, squads and rosters',
  'The wallet and VENT COINS',
  'Community, clubs and messages',
  'Rankings and player profiles',
];

export default function Pricing() {
  const tt = useT();

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>

          {/* The message, at the size of the message. This page exists to land
              one sentence and the first version buried it in a grey box. */}
          <header className={styles.hero}>
            <span className={styles.eyebrow}>{tt('pricing.tag', 'Free while we build')}</span>
            <h1 className={styles.headline}>
              {tt('pricing.headA', 'Everything on V-ENT is')}{' '}
              <span className={styles.headlineFree}>{tt('pricing.headB', 'free right now')}</span>.
            </h1>
            <p className={styles.lede}>
              {tt('pricing.lede', 'There is nothing to pay for today. We would rather you used it hard and told us what breaks than waited for a price list.')}
            </p>
          </header>

          {/* A list of facts, read downwards. Not six cards in a grid. */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.h2}>{tt('pricing.laterTitle', 'Some of this will cost money later')}</h2>
            </div>
            <p className={styles.sectionNote}>
              {tt('pricing.laterBody', 'We are saying so now rather than after you have built a season around it. Prices are not set and no date is fixed. When both are, you will hear it here first and well before anything changes.')}
            </p>

            <div className={styles.list}>
              {COMING.map((item, i) => (
                <div key={item.key} className={styles.row}>
                  <span className={styles.rowNum}>{String(i + 1).padStart(2, '0')}</span>
                  <h3 className={styles.rowTitle}>
                    {tt(`pricing.coming.${item.key}.title`, item.title)}
                  </h3>
                  <p className={styles.rowLine}>
                    {tt(`pricing.coming.${item.key}.line`, item.line)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* A different kind of statement, on its own ground. */}
          <section className={styles.promise}>
            <h2 className={styles.promiseH}>{tt('pricing.promiseTitle', 'What we will not do')}</h2>
            <p className={styles.promiseBody}>
              {tt('pricing.promiseBody', 'We will not put a price on something you already use. A charge can only ever be for a new capability, or for going past what free accounts do today. Anything you are running when pricing starts keeps working the way it works now.')}
            </p>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.h2}>{tt('pricing.freeTitle', 'Free now, and staying free')}</h2>
            </div>
            <div className={styles.freeRow}>
              {STAYS_FREE.map((line, i) => (
                <span key={line} className={styles.freeChip}>
                  {tt(`pricing.free.${i}`, line)}
                </span>
              ))}
            </div>
          </section>

          <section className={styles.cta}>
            <div className={styles.sectionHead}>
              <h2 className={styles.h2}>{tt('pricing.testTitle', 'Use it, and tell us where it hurts')}</h2>
            </div>
            <p className={styles.sectionNote}>
              {tt('pricing.testBody', 'The things that end up behind a price will be the things enough people rely on. So the most useful thing you can do right now is run a real tournament or a real event on it and tell us what got in your way.')}
            </p>
            <div className={styles.ctaRow}>
              <Link href="/feedback" className={`${styles.ctaBtn} grnBTN`}>
                {tt('pricing.giveFeedback', 'Send feedback')}
              </Link>
              <Link href="/tournaments" className={styles.ctaQuiet}>
                {tt('pricing.browse', 'Browse tournaments')}
              </Link>
            </div>
          </section>

        </div>
      </main>
      <BottomMenu />
    </div>
  );
}
