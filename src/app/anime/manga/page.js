'use client';

// Browse every comic: search, genre, status, kind, and how to sort them.
//
// The design is the one from `docs/wip/anime/manga`, back against the real API.
// The genres come from `/anime/catalogue/` rather than a list typed into this
// file, so a genre on a chip is one a comic can actually have. The format
// catalogue drifted into five copies on this platform once already.

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CiSearch } from 'react-icons/ci';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { call, fill, tokenFrom, useAnimeCatalogue, useAnimeOpen } from '@/lib/anime';
import { SeriesCard } from '../page';
import styles from './manga.module.css';

const SORTS = [
  { id: 'rating', word: ['anime.topRated', 'Top rated'] },
  { id: 'newest', word: ['anime.newestSort', 'Newest'] },
  { id: 'views', word: ['anime.mostRead', 'Most read'] },
  { id: 'title', word: ['anime.aToZ', 'A to Z'] },
];

function BrowseInner() {
  const tt = useT();
  const open = useAnimeOpen();
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = useSession();
  const token = tokenFrom(session);
  const { catalogue } = useAnimeCatalogue(open === true);

  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState(params.get('q') || '');
  const [genre, setGenre] = useState(params.get('genre') || '');
  const [status, setStatus] = useState(params.get('status') || '');
  const [sort, setSort] = useState(params.get('sort') || 'rating');

  // The address carries the filters, so a search can be shared and a back
  // button lands where somebody was rather than at the top of everything.
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set('q', search);
    if (genre) next.set('genre', genre);
    if (status) next.set('status', status);
    if (sort && sort !== 'rating') next.set('sort', sort);
    const qs = next.toString();
    router.replace(`/anime/manga${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [search, genre, status, sort, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (search) query.set('q', search);
      if (genre) query.set('genre', genre);
      if (status) query.set('status', status);
      if (sort) query.set('sort', sort);
      const data = await call(`/series/?${query.toString()}`, { token });
      setSeries(data.series || []);
    } catch (err) {
      setError(apiMessage(tt, err, 'anime.loadFailed',
        'We could not load the comics just now.'));
    } finally {
      setLoading(false);
    }
  }, [search, genre, status, sort, token, tt]);

  useEffect(() => {
    if (open !== true) return undefined;
    const id = setTimeout(load, 250);   // one request per pause, not per keypress
    return () => clearTimeout(id);
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

  const genres = Object.entries(catalogue?.genres || {});
  const statuses = Object.entries(catalogue?.statuses || {});

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
            <h1 className={styles.pageTitle}>{tt('anime.comics', 'Comics')}</h1>
            <p className={styles.pageSub}>
              {tt('anime.comicsSub',
                'Manga, manhwa and webcomics uploaded by people here.')}
            </p>
          </div>

          <div className={styles.filtersBar}>
            <div className={styles.searchBar}>
              <CiSearch className={styles.searchIcon} />
              <input className={styles.searchInput} value={search}
                     onChange={e => setSearch(e.target.value)}
                     placeholder={tt('anime.searchPlaceholder',
                       'Search by title')} />
            </div>
            <div className={styles.dropdownGroup}>
              <select className={styles.dropdown} value={status}
                      onChange={e => setStatus(e.target.value)}
                      aria-label={tt('anime.status', 'Status')}>
                <option value="">{tt('anime.allStatus', 'Any status')}</option>
                {statuses.map(([key, word]) => (
                  <option key={key} value={key}>{word}</option>
                ))}
              </select>
              <select className={styles.dropdown} value={sort}
                      onChange={e => setSort(e.target.value)}
                      aria-label={tt('anime.sort', 'Sort')}>
                {SORTS.map(s => (
                  <option key={s.id} value={s.id}>{tt(s.word[0], s.word[1])}</option>
                ))}
              </select>
            </div>
          </div>

          {genres.length > 0 && (
            <div className={styles.genreChips}>
              <button type="button" aria-pressed={genre === ''}
                      className={genre === '' ? styles.genreChipActive : styles.genreChip}
                      onClick={() => setGenre('')}>
                {tt('anime.allGenres', 'Everything')}
              </button>
              {genres.map(([key, word]) => (
                <button key={key} type="button" aria-pressed={genre === key}
                        className={genre === key ? styles.genreChipActive : styles.genreChip}
                        onClick={() => setGenre(genre === key ? '' : key)}>
                  {word}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <p className={styles.resultsCount}>{tt('ui.loading.33ce', 'Loading…')}</p>
          ) : error ? (
            <div className={styles.emptyState}>
              <p>{error}</p>
              <button type="button" onClick={load}>
                {tt('common.tryAgain', 'Try again')}
              </button>
            </div>
          ) : series.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{tt('anime.noneMatch', 'Nothing matches that.')}</p>
            </div>
          ) : (
            <>
              <p className={styles.resultsCount}>
                {fill(tt('anime.results', '{n} comics'), { n: series.length })}
              </p>
              <div className={styles.cardGrid}>
                {series.map(s => <SeriesCard key={s.slug} series={s} tt={tt} />)}
              </div>
            </>
          )}
        </div>
      </main>
      <BottomMenu />
    </div>
  );
}

const Browse = () => (
  <Suspense fallback={null}>
    <BrowseInner />
  </Suspense>
);

export default Browse;
