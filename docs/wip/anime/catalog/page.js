'use client'

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CiSearch } from 'react-icons/ci';
import { FaStar, FaPlay } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './catalog.module.css';

const STATUSES = ['', 'airing', 'completed', 'upcoming'];
const SEASONS = ['', 'Winter', 'Spring', 'Summer', 'Fall'];
const SORTS = [
  { id: 'rating', label: 'Top rated' },
  { id: 'newest', label: 'Newest' },
  { id: 'episodes', label: 'Episode count' },
  { id: 'title', label: 'A → Z' },
];

// Build mock anime series from manga catalog (since they parallel)
const buildAnimeFromManga = (mangaList) =>
  mangaList.map((m, i) => ({
    id: `anm_${m.id}`,
    title: m.title,
    cover: m.cover,
    banner: m.banner,
    description: m.description,
    rating: m.rating,
    genres: m.genres,
    status: ['airing', 'completed', 'upcoming'][i % 3],
    season: ['Winter', 'Spring', 'Summer', 'Fall'][i % 4],
    year: 2024 + (i % 3),
    episodes: 12 + (i % 4) * 4,
    studio: ['MAPPA', 'Bones', 'A-1 Pictures', 'Wit Studio'][i % 4],
    aired_at: m.latest_chapter_at,
  }));

function CatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [season, setSeason] = useState(searchParams.get('season') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'rating');

  const authHeaders = useMemo(() => ({
    Authorization: session?.user?.sessionToken ? `Bearer ${session.user.sessionToken}` : '',
    'Content-Type': 'application/json',
  }), [session?.user?.sessionToken]);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (status) params.set('status', status);
    if (season) params.set('season', season);
    if (sort && sort !== 'rating') params.set('sort', sort);
    const qs = params.toString();
    router.replace(`/anime/catalog${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [search, status, season, sort, router]);

  // Fetch (re-uses /manga/list/ since the mock layer doesn't have a separate anime catalog yet)
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        const res = await fetch(`${apiUrl}/manga/list/?${params.toString()}`, { headers: authHeaders });
        const data = await res.json();
        if (data?.status === 'success') {
          setSeries(buildAnimeFromManga(data.data?.series || []));
        }
      } catch (err) {
        console.error('Anime catalog fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiUrl, authHeaders, search]);

  const filtered = useMemo(() => {
    let list = [...series];
    if (status) list = list.filter((s) => s.status === status);
    if (season) list = list.filter((s) => s.season === season);
    list.sort((a, b) => {
      if (sort === 'newest') return b.year - a.year;
      if (sort === 'episodes') return b.episodes - a.episodes;
      if (sort === 'title') return a.title.localeCompare(b.title);
      return (b.rating || 0) - (a.rating || 0);
    });
    return list;
  }, [series, status, season, sort]);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Anime catalog</h1>
              <p className={styles.pageSub}>
                Watch episodes from every anime tracked on V-ENT — airing, finished and upcoming.
              </p>
            </div>
            <Link href="/anime" className={styles.backLink}>← Back to hub</Link>
          </div>

          {/* Filters */}
          <div className={styles.filtersBar}>
            <div className={styles.searchBar}>
              <CiSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search anime..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className={styles.dropdownGroup}>
              <select
                className={styles.dropdown}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">All status</option>
                {STATUSES.filter(Boolean).map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <select
                className={styles.dropdown}
                value={season}
                onChange={(e) => setSeason(e.target.value)}
              >
                <option value="">All seasons</option>
                {SEASONS.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                className={styles.dropdown}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <p className={styles.resultsCount}>
            {loading ? 'Loading...' : `${filtered.length} anime`}
          </p>

          {filtered.length === 0 && !loading ? (
            <p className={styles.emptyState}>No anime match your filters.</p>
          ) : (
            <div className={styles.cardGrid}>
              {filtered.map((s) => (
                <div key={s.id} className={styles.animeCard}>
                  <div
                    className={styles.animeCover}
                    style={{ backgroundImage: `url(${s.cover})` }}
                  >
                    <span className={styles.statusPill} data-status={s.status}>{s.status}</span>
                    <button type="button" className={styles.playBtn} aria-label="Watch trailer">
                      <FaPlay />
                    </button>
                  </div>
                  <div className={styles.animeBody}>
                    <h4 className={styles.animeTitle}>{s.title}</h4>
                    <p className={styles.animeMeta}>
                      {s.studio} · {s.season} {s.year}
                    </p>
                    <div className={styles.animeStats}>
                      <span><FaStar className={styles.starIcon} /> {s.rating?.toFixed(1)}</span>
                      <span className={styles.dot}>·</span>
                      <span>{s.episodes} eps</span>
                    </div>
                    <div className={styles.animeTags}>
                      {s.genres?.slice(0, 2).map((g) => (
                        <span key={g} className={styles.animeTag}>{g}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
}

export default function AnimeCatalogPage() {
  return (
    <Suspense fallback={<div className={styles.pageContainer} />}>
      <CatalogContent />
    </Suspense>
  );
}
