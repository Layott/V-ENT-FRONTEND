'use client';

// One reader's own list: what they are reading, what they follow, what they
// pay for and what they marked.
//
// The design is `docs/wip/anime/my-list`, back against the real API. What
// changed: the four tabs are the four real relationships a reader can have with
// a comic, rather than "watching / completed / dropped", which are states this
// platform does not store and would have had to invent.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FaStar } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import { useT } from '@/i18n/LanguageProvider';
import { call, fill, tokenFrom, useAnimeOpen } from '@/lib/anime';
import { formatDate } from '@/lib/datetime';
import { useViewer, signInHref } from '@/lib/gating';
import Banner from '@/components/banner/Banner';
import { mediaUrl } from '@/lib/mediaUrl';
import styles from './my-list.module.css';

const MyList = () => {
  const tt = useT();
  const open = useAnimeOpen();
  const { data: session } = useSession();
  const viewer = useViewer();
  const token = tokenFrom(session);

  const [data, setData] = useState(null);
  const [tab, setTab] = useState('reading');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      setData(await call('/my-list/', { token }));
    } catch (err) {
      setError(err.message || tt('anime.loadFailed', 'We could not load your list.'));
    } finally {
      setLoading(false);
    }
  }, [token, tt]);

  useEffect(() => {
    if (open !== true || viewer.loading) return undefined;
    load();
    return undefined;
  }, [open, viewer.loading, load]);

  if (open === null) return null;
  if (open === false) {
    return <ComingSoon phase="Phase 5"
      title={tt('anime.comingTitle', 'Anime hub')}
      blurb={tt('anime.comingBlurb',
        'Manga reading, co-reading rooms and character battles are built and '
        + 'not open yet. Nothing here is live.')}
      alternatives={[{ href: '/tournaments', label: tt('nav.tournaments', 'Tournaments') }]} />;
  }

  const shell = inner => (
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
            <h1 className={styles.pageTitle}>{tt('anime.myList', 'My list')}</h1>
            <p className={styles.pageSub}>
              {tt('anime.myListSub',
                'Where you got to, what you follow, and what you have paid for.')}
            </p>
          </div>
          {inner}
        </div>
      </main>
      <BottomMenu />
    </div>
  );

  if (viewer.loading || loading) {
    return shell(<p className={styles.emptyState}>{tt('ui.loading.33ce', 'Loading…')}</p>);
  }

  if (!viewer.signedIn) {
    return shell(
      <div className={styles.emptyState}>
        <p>{tt('anime.myListSignedOut',
          'Sign in and your place in every comic is kept here.')}</p>
        <Link href={signInHref('/anime/my-list')} className={styles.emptyLink}>
          {tt('needsAccount.signIn', 'Log in')}
        </Link>
      </div>);
  }

  if (error) {
    return shell(
      <div className={styles.emptyState}>
        <p>{error}</p>
        <button type="button" className={styles.emptyLink} onClick={load}>
          {tt('common.tryAgain', 'Try again')}
        </button>
      </div>);
  }

  const tabs = [
    { id: 'reading', label: tt('anime.tabReading', 'Reading'), rows: data?.reading || [] },
    { id: 'following', label: tt('anime.tabFollowing', 'Following'), rows: data?.following || [] },
    { id: 'subscriptions', label: tt('anime.tabPaid', 'Subscriptions'), rows: data?.subscriptions || [] },
    { id: 'bookmarks', label: tt('anime.tabBookmarks', 'Bookmarks'), rows: data?.bookmarks || [] },
  ];
  const current = tabs.find(t => t.id === tab) || tabs[0];

  return shell(
    <>
      <div className={styles.tabsBar}>
        {tabs.map(t => (
          <button key={t.id} type="button" aria-pressed={tab === t.id}
                  className={tab === t.id ? styles.tabBtnActive : styles.tabBtn}
                  onClick={() => setTab(t.id)}>
            {t.label}
            <span className={styles.tabCount}>{t.rows.length}</span>
          </button>
        ))}
      </div>

      {current.rows.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{tt('anime.nothingHere', 'Nothing here yet.')}</p>
          <Link href="/anime/manga" className={styles.emptyLink}>
            {tt('anime.browseAll', 'Browse all')}
          </Link>
        </div>
      ) : (
        <div className={styles.listWrap}>
          {tab === 'reading' && current.rows.map(row => (
            <div key={row.chapter} className={styles.listItem}>
              <Banner className={styles.itemCover}
                      src={mediaUrl(row.series.cover)}
                      alt={row.series.title} />
              <div className={styles.itemBody}>
                <div className={styles.itemHead}>
                  <Link href={`/anime/manga/${row.series.slug}`}
                        className={styles.itemTitle}>
                    {row.series.title}
                  </Link>
                </div>
                <p className={styles.itemMeta}>
                  {fill(tt('anime.onChapter', 'Chapter {n}, page {p}'),
                    { n: row.chapter_number, p: row.page })}
                </p>
                <div className={styles.itemActions}>
                  <Link className={styles.continueBtn}
                        href={`/anime/read/${row.chapter}`}>
                    {tt('anime.carryOn', 'Carry on reading')}
                  </Link>
                </div>
              </div>
            </div>
          ))}

          {tab === 'following' && current.rows.map(s => (
            <div key={s.slug} className={styles.listItem}>
              <Banner className={styles.itemCover} src={mediaUrl(s.cover)}
                      alt={s.title} />
              <div className={styles.itemBody}>
                <Link href={`/anime/manga/${s.slug}`} className={styles.itemTitle}>
                  {s.title}
                </Link>
                <p className={styles.itemMeta}>
                  {fill(tt('anime.chapterCount', '{n} chapters'), { n: s.chapters })}
                </p>
                {s.rating != null && (
                  <p className={styles.itemRating}>
                    <FaStar /> {s.rating}
                  </p>
                )}
              </div>
            </div>
          ))}

          {tab === 'subscriptions' && current.rows.map(row => (
            <div key={row.series.slug} className={styles.listItem}>
              <Banner className={styles.itemCover}
                      src={mediaUrl(row.series.cover)}
                      alt={row.series.title} />
              <div className={styles.itemBody}>
                <Link href={`/anime/manga/${row.series.slug}`}
                      className={styles.itemTitle}>
                  {row.series.title}
                </Link>
                <p className={styles.itemMeta}>
                  {row.live
                    ? fill(tt('anime.subscribedUntil', 'Subscribed until {d}'),
                      { d: formatDate(row.until) })
                    : fill(tt('anime.lapsedOn', 'Ran out on {d}'),
                      { d: formatDate(row.until) })}
                </p>
              </div>
            </div>
          ))}

          {tab === 'bookmarks' && current.rows.map(b => (
            <div key={`${b.chapter}-${b.page}`} className={styles.listItem}>
              <div className={styles.itemBody}>
                <Link href={`/anime/read/${b.chapter}`} className={styles.itemTitle}>
                  {b.series_title}
                </Link>
                <p className={styles.itemMeta}>
                  {fill(tt('anime.pageN', 'Page {p}'), { p: b.page })}
                  {b.note ? ` ${b.note}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default MyList;
