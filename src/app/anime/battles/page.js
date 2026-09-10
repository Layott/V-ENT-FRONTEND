'use client';

// Character battles: the list of them.
//
// No wip design for this one, so it is built on the shape of the tournaments
// listing: a card per battle saying what state it is in, because "nominations
// are open" and "decided" are what somebody is choosing between.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import { useT } from '@/i18n/LanguageProvider';
import { call, fill, tokenFrom, useAnimeOpen } from '@/lib/anime';
import styles from '../studio/studio.module.css';

const Battles = () => {
  const tt = useT();
  const open = useAnimeOpen();
  const { data: session } = useSession();
  const token = tokenFrom(session);

  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await call('/battles/', { token });
      setBattles(data.battles || []);
    } catch (err) {
      setError(err.message || tt('anime.loadFailed', 'We could not load the battles.'));
    } finally {
      setLoading(false);
    }
  }, [token, tt]);

  useEffect(() => {
    if (open !== true) return undefined;
    load();
    return undefined;
  }, [open, load]);

  if (open === null) return null;
  if (open === false) {
    return <ComingSoon phase="Phase 5"
      title={tt('anime.comingTitle', 'Anime hub')}
      blurb={tt('anime.comingBlurb',
        'Manga reading, co-reading rooms and character battles are built and '
        + 'not open yet. Nothing here is live.')}
      alternatives={[{ href: '/tournaments', label: tt('nav.tournaments', 'Tournaments') }]} />;
  }

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <Link href="/anime" className={styles.backLink}>
            {tt('anime.backToHub', 'Back to anime')}
          </Link>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              {tt('anime.battlesTitle', 'Character battles')}
            </h1>
            <p className={styles.pageSub}>
              {tt('anime.battlesPageSub',
                'Nominate a character, score five attributes out of ten, and '
                + 'the average of every vote decides it.')}
            </p>
          </div>

          {loading ? (
            <div className={styles.skeleton} />
          ) : error ? (
            <div className={styles.empty}>
              <p>{error}</p>
              <button type="button" className={styles.quietBtn} onClick={load}>
                {tt('common.tryAgain', 'Try again')}
              </button>
            </div>
          ) : battles.length === 0 ? (
            <div className={styles.empty}>
              <p>{tt('anime.noBattles',
                'No battles yet. V-ENT opens them.')}</p>
            </div>
          ) : (
            <ul className={styles.list}>
              {battles.map(b => (
                <li key={b.slug}>
                  <Link href={`/anime/battles/${b.slug}`} className={styles.row}>
                    <span className={styles.rowTitle}>{b.title}</span>
                    <span className={styles.rowMeta}>
                      {b.state_label}
                      {' '}
                      {fill(tt('anime.charactersIn', '{n} characters'),
                        { n: b.characters })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

export default Battles;
