'use client'

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CiSearch } from 'react-icons/ci';
import { FaPlay, FaHeart, FaPlus } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './amv.module.css';

const TAGS = ['', 'action', 'edit', 'fan-made', 'anime', 'romance', 'comedy'];

const SORTS = [
  { id: 'top', label: 'Top liked' },
  { id: 'new', label: 'Newest' },
  { id: 'views', label: 'Most viewed' },
];

function GalleryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [amvs, setAmvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [tag, setTag] = useState(searchParams.get('tag') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'top');

  const authHeaders = useMemo(() => ({
    Authorization: session?.user?.sessionToken ? `Bearer ${session.user.sessionToken}` : '',
    'Content-Type': 'application/json',
  }), [session?.user?.sessionToken]);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (tag) params.set('tag', tag);
    if (sort && sort !== 'top') params.set('sort', sort);
    const qs = params.toString();
    router.replace(`/anime/amv${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [search, tag, sort, router]);

  // Fetch
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('q', search);
        const res = await fetch(`${apiUrl}/amv/list/?${params.toString()}`, { headers: authHeaders });
        const data = await res.json();
        if (data?.status === 'success') {
          setAmvs(data.data?.amvs || []);
        }
      } catch (err) {
        console.error('AMV gallery fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiUrl, authHeaders, search]);

  const filtered = useMemo(() => {
    let list = [...amvs];
    if (tag) list = list.filter((a) => a.tags?.includes(tag));
    list.sort((a, b) => {
      if (sort === 'new') return new Date(b.uploaded_at) - new Date(a.uploaded_at);
      if (sort === 'views') return (b.views || 0) - (a.views || 0);
      return (b.likes || 0) - (a.likes || 0);
    });
    return list;
  }, [amvs, tag, sort]);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>AMV Gallery</h1>
              <p className={styles.pageSub}>
                Fan-edited drops from the V-ENT community. Discover, like, share — submit your own.
              </p>
            </div>
            <button
              type="button"
              className={`btn redBTN ${styles.uploadBtn}`}
              onClick={() => alert('AMV upload — coming with Phase 5 launch.')}
            >
              <FaPlus /> Upload AMV
            </button>
          </div>

          {/* Filters */}
          <div className={styles.filtersBar}>
            <div className={styles.searchBar}>
              <CiSearch className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search AMVs by title, editor or anime..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={styles.dropdown}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort by"
            >
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <div className={styles.tagChips}>
            {TAGS.map((t) => (
              <button
                key={t || 'all'}
                type="button"
                className={`${styles.tagChip} ${tag === t ? styles.tagChipActive : ''}`}
                onClick={() => setTag(t)}
              >
                {t ? `#${t}` : 'All'}
              </button>
            ))}
          </div>

          <p className={styles.resultsCount}>
            {loading ? 'Loading...' : `${filtered.length} videos`}
          </p>

          {filtered.length === 0 && !loading ? (
            <p className={styles.emptyState}>No AMVs match your filters.</p>
          ) : (
            <div className={styles.cardGrid}>
              {filtered.map((a) => (
                <Link key={a.id} href={`/anime/amv/detail?id=${a.id}`} className={styles.amvCard}>
                  <div className={styles.amvThumb} style={{ backgroundImage: `url(${a.thumbnail})` }}>
                    <span className={styles.amvPlayIcon}><FaPlay /></span>
                    <span className={styles.amvDuration}>{a.duration}</span>
                  </div>
                  <div className={styles.amvBody}>
                    <h4 className={styles.amvTitle}>{a.title}</h4>
                    <p className={styles.amvUploader}>@{a.uploader?.username}</p>
                    <div className={styles.amvStats}>
                      <span>{a.views?.toLocaleString()} views</span>
                      <span className={styles.dot}>·</span>
                      <span className={styles.likeStat}>
                        <FaHeart /> {a.likes?.toLocaleString()}
                      </span>
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

export default function AmvGalleryPage() {
  return (
    <Suspense fallback={<div className={styles.pageContainer} />}>
      <GalleryContent />
    </Suspense>
  );
}
