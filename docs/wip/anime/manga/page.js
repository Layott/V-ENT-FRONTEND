'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CiSearch } from 'react-icons/ci';
import { FaStar } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './manga.module.css';

const STATUSES = [
  { id: '', label: 'All status' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'completed', label: 'Completed' },
  { id: 'hiatus', label: 'Hiatus' },
];

const GENRES = [
  '', 'shonen', 'seinen', 'isekai', 'mecha', 'fantasy', 'cyberpunk',
  'action', 'drama', 'adventure', 'sports', 'romance', 'horror',
];

const SORTS = [
  { id: 'rating', label: 'Top rated' },
  { id: 'newest', label: 'Newest' },
  { id: 'views', label: 'Most viewed' },
  { id: 'title', label: 'A → Z' },
];

function CatalogContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || '');
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
    if (genre) params.set('genre', genre);
    if (sort && sort !== 'rating') params.set('sort', sort);
    const qs = params.toString();
    router.replace(`/anime/manga${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [search, status, genre, sort, router]);

  // Fetch
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        if (status) params.set('status', status);
        const res = await fetch(`${apiUrl}/manga/list/?${params.toString()}`, { headers: authHeaders });
        // Guard against the dev mock layer returning HTML (404) instead of JSON
        // — res.json() throws SyntaxError "Invalid or unexpected token" when the
        // body starts with "<".
        const data = await res.json().catch(() => null);
        if (data?.status === 'success') {
          setSeries(Array.isArray(data.data?.series) ? data.data.series : []);
        } else {
          setSeries([]);
        }
      } catch (err) {
        console.error('Manga catalog fetch error:', err);
        setSeries([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiUrl, authHeaders, search, status]);

  // Filter + sort client-side
  const filtered = useMemo(() => {
    let list = Array.isArray(series) ? [...series] : [];
    if (genre) list = list.filter((m) => m.genres?.includes(genre));
    list.sort((a, b) => {
      if (sort === 'newest') return new Date(b.latest_chapter_at || 0) - new Date(a.latest_chapter_at || 0);
      if (sort === 'views') return (b.views || 0) - (a.views || 0);
      if (sort === 'title') return (a.title || '').localeCompare(b.title || '');
      return (b.rating || 0) - (a.rating || 0);
    });
    return list;
  }, [series, genre, sort]);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Manga catalog</h1>
              <p className={styles.pageSub}>
                Every series available on V-ENT — sorted, filtered, ready to read.
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
                placeholder="Search by title or author..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className={styles.dropdownGroup}>
              <select
                className={styles.dropdown}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                aria-label="Status filter"
              >
                {STATUSES.map((s) => <option key={s.id || 'all'} value={s.id}>{s.label}</option>)}
              </select>
              <select
                className={styles.dropdown}
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort by"
              >
                {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.genreChips}>
            {GENRES.map((g) => (
              <button
                key={g || 'all'}
                type="button"
                className={`${styles.genreChip} ${genre === g ? styles.genreChipActive : ''}`}
                onClick={() => setGenre(g)}
              >
                {g || 'All'}
              </button>
            ))}
          </div>

          <p className={styles.resultsCount}>
            {loading ? 'Loading...' : `${filtered.length} series`}
          </p>

          {/* Grid */}
          {filtered.length === 0 && !loading ? (
            <p className={styles.emptyState}>No manga match your filters.</p>
          ) : (
            <div className={styles.cardGrid}>
              {filtered.map((s) => (
                <Link key={s.id} href={`/anime/manga/series?id=${s.id}`} className={styles.mangaCard}>
                  <div
                    className={styles.mangaCover}
                    style={{ backgroundImage: `url(${s.cover})` }}
                  >
                    <span className={styles.statusPill} data-status={s.status}>{s.status}</span>
                  </div>
                  <div className={styles.mangaBody}>
                    <h4 className={styles.mangaTitle}>{s.title}</h4>
                    <p className={styles.mangaAuthor}>{s.author}</p>
                    <div className={styles.mangaMeta}>
                      <span className={styles.metaItem}>
                        <FaStar className={styles.starIcon} /> {s.rating?.toFixed(1)}
                      </span>
                      <span className={styles.dot}>·</span>
                      <span>{s.total_chapters} ch</span>
                    </div>
                    <div className={styles.mangaTags}>
                      {s.genres?.slice(0, 2).map((g) => (
                        <span key={g} className={styles.mangaTag}>{g}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
}

export default function MangaCatalogPage() {
  return (
    <Suspense fallback={<div className={styles.pageContainer} />}>
      <CatalogContent />
    </Suspense>
  );
}
