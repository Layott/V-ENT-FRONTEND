'use client';

// The anime hub: what you were reading, what is new, and where people are
// reading together.
//
// The layout is the one drawn in August and kept in `docs/wip/anime` when the
// mock layer was deleted for having no API behind it. The API exists now, so it
// comes back pointed at real data. Three things changed on the way back, and
// each is a correction rather than a preference:
//
//   * the hero rotated through invented titles with invented view counts. It
//     shows the comics that are actually BOOSTED now, which is a real state an
//     author paid for, and nothing at all when none are.
//   * the AMV rail called `/amv/list/`, which was never built and is not in the
//     spec the CEO sent. It is gone rather than drawn empty.
//   * "Continue reading" was a static row. It is the reader's own progress.
//
// While the module is closed this page is a ComingSoon and nothing else. One
// answer decides that, from `/auth/platform/modules/`, which is the same answer
// the navigation and the endpoints use.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FaStar } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import UserChip from '@/components/user-chip/UserChip';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { call, fill, tokenFrom, useAnimeOpen } from '@/lib/anime';
import Banner from '@/components/banner/Banner';
import { mediaUrl } from '@/lib/mediaUrl';
import styles from './anime.module.css';

const AnimeHub = () => {
  const tt = useT();
  const open = useAnimeOpen();
  const { data: session } = useSession();
  const token = tokenFrom(session);

  const [series, setSeries] = useState([]);
  const [reading, setReading] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [browse, live] = await Promise.all([
        call('/series/?sort=newest', { token }),
        call('/rooms/', { token }),
      ]);
      setSeries(browse.series || []);
      setRooms(live.rooms || []);
      if (token) {
        // Only for somebody signed in, and a failure here must not empty the
        // page: the rest of it is public and works without this.
        try {
          const mine = await call('/my-list/', { token });
          setReading(mine.reading || []);
        } catch { setReading([]); }
      } else {
        setReading([]);
      }
    } catch (err) {
      setError(apiMessage(tt, err, 'anime.loadFailed',
        'We could not load the anime hub just now.'));
    } finally {
      setLoading(false);
    }
  }, [token, tt]);

  useEffect(() => {
    if (open !== true) return undefined;
    load();
    return undefined;
  }, [open, load]);

  // Null means the flags have not answered yet. Rendering either screen now
  // would be a guess, and both guesses are wrong half the time.
  if (open === null) return null;

  if (open === false) {
    return <ComingSoon
      phase="Phase 5"
      title={tt('anime.comingTitle', 'Anime hub')}
      blurb={tt('anime.comingBlurb',
        'Manga reading, co-reading rooms and character battles are built and '
        + 'not open yet. Nothing here is live.')}
      alternatives={[
        { href: '/tournaments', label: tt('nav.tournaments', 'Tournaments') },
        { href: '/events', label: tt('nav.events', 'Events') },
      ]} />;
  }

  const boosted = series.filter(s => s.boosted);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{tt('anime.title', 'Anime')}</h1>
            <p className={styles.pageSub}>
              {tt('anime.sub',
                'Comics people here drew, read together and argued about.')}
            </p>
          </div>

          {loading ? (
            <div className={styles.heroSkeleton} />
          ) : error ? (
            <div className={styles.emptyState}>
              <p>{error}</p>
              <button type="button" className={styles.heroSecondaryBtn}
                      onClick={load}>
                {tt('common.tryAgain', 'Try again')}
              </button>
            </div>
          ) : (
            <>
              {/* Where somebody left off. Nothing at all when there is nowhere
                  to carry on, rather than an empty rail with a heading. */}
              {reading.length > 0 && (
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                      {tt('anime.continue', 'Carry on reading')}
                    </h2>
                    <Link href="/anime/my-list" className={styles.sectionLink}>
                      {tt('anime.myList', 'My list')}
                    </Link>
                  </div>
                  <div className={styles.cardGrid}>
                    {reading.map(row => (
                      <Link key={row.chapter} href={`/anime/read/${row.chapter}`}
                            className={styles.mangaCard}>
                        <Banner className={styles.mangaCover}
                                src={mediaUrl(row.series.cover)}
                                alt={row.series.title}
                                label={row.series.title} />
                        <div className={styles.mangaBody}>
                          <p className={styles.mangaTitle}>{row.series.title}</p>
                          <p className={styles.mangaMeta}>
                            {fill(tt('anime.onChapter', 'Chapter {n}, page {p}'),
                              { n: row.chapter_number, p: row.page })}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {boosted.length > 0 && (
                <section className={styles.section}>
                  <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                      {tt('anime.featured', 'Featured by their authors')}
                    </h2>
                  </div>
                  <div className={styles.cardGrid}>
                    {boosted.map(s => <SeriesCard key={s.slug} series={s} tt={tt} />)}
                  </div>
                </section>
              )}

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    {tt('anime.newest', 'Newest comics')}
                  </h2>
                  <Link href="/anime/manga" className={styles.sectionLink}>
                    {tt('anime.browseAll', 'Browse all')}
                  </Link>
                </div>
                {series.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>{tt('anime.noneYet',
                      'Nobody has published a comic yet. Yours would be the first.')}</p>
                    <Link href="/anime/studio" className={styles.heroPrimaryBtn}>
                      {tt('anime.upload', 'Upload a comic')}
                    </Link>
                  </div>
                ) : (
                  <div className={styles.cardGrid}>
                    {series.slice(0, 12).map(s =>
                      <SeriesCard key={s.slug} series={s} tt={tt} />)}
                  </div>
                )}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    {tt('anime.rooms', 'Reading rooms')}
                  </h2>
                  <Link href="/anime/rooms" className={styles.sectionLink}>
                    {tt('anime.allRooms', 'All rooms')}
                  </Link>
                </div>
                {rooms.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>{tt('anime.noRooms',
                      'No rooms are open. Open one and read with somebody.')}</p>
                  </div>
                ) : (
                  <div className={styles.cardGrid}>
                    {rooms.slice(0, 6).map(room => (
                      <Link key={room.token} href={`/anime/room/${room.token}`}
                            className={styles.roomCard}>
                        <div className={styles.roomBody}>
                          <p className={styles.roomTitle}>{room.name}</p>
                          <p className={styles.roomMeta}>{room.series_title}</p>
                          <div className={styles.roomFooter}>
                            <span className={styles.roomHostName}>
                              <UserChip user={room.host} />
                            </span>
                            <span className={styles.roomReaders}>
                              {fill(tt('anime.reading', '{n} reading'),
                                { n: room.people })}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    {tt('anime.battles', 'Character battles')}
                  </h2>
                  <Link href="/anime/battles" className={styles.sectionLink}>
                    {tt('anime.allBattles', 'Every battle')}
                  </Link>
                </div>
                <div className={styles.emptyState}>
                  <p>{tt('anime.battlesSub',
                    'Nominate a character, score their attributes, and the '
                    + 'numbers decide it.')}</p>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
      <BottomMenu />
    </div>
  );
};

/** One comic, drawn the same way everywhere it appears. */
export const SeriesCard = ({ series, tt }) => (
  <Link href={`/anime/manga/${series.slug}`} className={styles.mangaCard}>
    <Banner className={styles.mangaCover} src={mediaUrl(series.cover)}
            alt={series.title} label={series.title} />
    <div className={styles.mangaBody}>
      <p className={styles.mangaTitle}>{series.title}</p>
      <div className={styles.mangaMeta}>
        {series.rating != null ? (
          <>
            <FaStar className={styles.starIcon} />
            <span>{series.rating}</span>
            <span className={styles.dot} />
          </>
        ) : null}
        <span>{fill(tt('anime.chapterCount', '{n} chapters'),
          { n: series.chapters })}</span>
      </div>
      {series.genres?.length > 0 && (
        <div className={styles.mangaTags}>
          {series.genres.slice(0, 3).map(g => (
            <span key={g} className={styles.mangaTag}>{g}</span>
          ))}
        </div>
      )}
    </div>
  </Link>
);

export default AnimeHub;
