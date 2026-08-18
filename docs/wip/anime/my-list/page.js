'use client'

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FaStar, FaTrash } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './my-list.module.css';

const TABS = [
  { id: 'reading', label: 'Reading', defaultStatus: 'in_progress' },
  { id: 'plan', label: 'Plan to read' },
  { id: 'completed', label: 'Completed' },
  { id: 'dropped', label: 'Dropped' },
];

// Mock per-user list — kept locally; persists across tab switches in the session.
const initialListBySeries = (series) =>
  series.slice(0, 8).map((s, i) => ({
    series_id: s.id,
    series: s,
    status: ['reading', 'reading', 'plan', 'completed', 'reading', 'dropped', 'plan', 'completed'][i] || 'reading',
    total_chapters: s.total_chapters,
    progress: i % 4 === 0 ? Math.min(s.total_chapters, 4 + i) : Math.floor(s.total_chapters * (0.1 + (i % 5) * 0.18)),
    rating: i % 3 === 0 ? 4 + (i % 2) : null,
    added_at: Date.now() - i * 60_000_000,
  }));

function MyListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const initialTab = TABS.find((t) => t.id === searchParams.get('tab'))?.id || 'reading';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = useMemo(() => ({
    Authorization: session?.user?.sessionToken ? `Bearer ${session.user.sessionToken}` : '',
    'Content-Type': 'application/json',
  }), [session?.user?.sessionToken]);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'reading') params.set('tab', activeTab);
    const qs = params.toString();
    router.replace(`/anime/my-list${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [activeTab, router]);

  // Load
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/manga/list/`, { headers: authHeaders });
        const data = await res.json();
        if (data?.status === 'success') {
          setList(initialListBySeries(data.data?.series || []));
        }
      } catch (err) {
        console.error('My-list fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiUrl, authHeaders]);

  const filtered = useMemo(
    () => list.filter((it) => it.status === activeTab),
    [list, activeTab]
  );

  const counts = useMemo(() => {
    const c = { reading: 0, plan: 0, completed: 0, dropped: 0 };
    list.forEach((it) => { if (c[it.status] !== undefined) c[it.status] += 1; });
    return c;
  }, [list]);

  const updateProgress = (seriesId, chapter) => {
    setList((arr) =>
      arr.map((it) =>
        it.series_id === seriesId ? { ...it, progress: chapter } : it
      )
    );
  };

  const moveTo = (seriesId, target) => {
    setList((arr) =>
      arr.map((it) =>
        it.series_id === seriesId ? { ...it, status: target } : it
      )
    );
  };

  const remove = (seriesId) => {
    setList((arr) => arr.filter((it) => it.series_id !== seriesId));
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>My list</h1>
              <p className={styles.pageSub}>
                Track every series you&apos;re reading or watching. Update progress, rate, manage shelves.
              </p>
            </div>
            <Link href="/anime" className={styles.backLink}>← Back to hub</Link>
          </div>

          <div className={styles.tabsBar}>
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                <span className={styles.tabCount}>{counts[t.id] || 0}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <p className={styles.emptyState}>Loading your list...</p>
          ) : filtered.length === 0 ? (
            <p className={styles.emptyState}>
              Nothing in this shelf yet. <Link href="/anime/manga" className={styles.emptyLink}>Browse manga →</Link>
            </p>
          ) : (
            <div className={styles.listWrap}>
              {filtered.map((it) => (
                <ListItem
                  key={it.series_id}
                  item={it}
                  onProgress={(ch) => updateProgress(it.series_id, ch)}
                  onMove={(target) => moveTo(it.series_id, target)}
                  onRemove={() => remove(it.series_id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
}

function ListItem({ item, onProgress, onMove, onRemove }) {
  const pct = Math.round((item.progress / Math.max(1, item.total_chapters)) * 100);

  return (
    <div className={styles.listItem}>
      <Link
        href={`/anime/manga/series?id=${item.series_id}`}
        className={styles.itemCover}
        style={{ backgroundImage: `url(${item.series?.cover})` }}
      />
      <div className={styles.itemBody}>
        <div className={styles.itemHead}>
          <Link href={`/anime/manga/series?id=${item.series_id}`} className={styles.itemTitle}>
            {item.series?.title}
          </Link>
          <button
            type="button"
            className={styles.removeBtn}
            onClick={onRemove}
            aria-label="Remove from list"
            title="Remove"
          >
            <FaTrash />
          </button>
        </div>
        <p className={styles.itemMeta}>
          {item.series?.author} · {item.total_chapters} chapters
        </p>
        {item.rating && (
          <p className={styles.itemRating}>
            <FaStar /> Your rating: {item.rating}/5
          </p>
        )}

        <div className={styles.progressBlock}>
          <div className={styles.progressLabel}>
            <span>Progress</span>
            <span>{item.progress} / {item.total_chapters} ({pct}%)</span>
          </div>
          <input
            type="range"
            min="0"
            max={item.total_chapters}
            value={item.progress}
            onChange={(e) => onProgress(parseInt(e.target.value, 10))}
            className={styles.progressSlider}
            aria-label="Update progress"
          />
          <div className={styles.progressBarTrack}>
            <div className={styles.progressBarFill} style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className={styles.itemActions}>
          <Link
            href={`/anime/read?series=${item.series_id}&chapter=${Math.max(1, item.progress)}`}
            className={`btn redBTN ${styles.continueBtn}`}
          >
            Continue reading
          </Link>
          <select
            className={styles.moveSelect}
            value={item.status}
            onChange={(e) => onMove(e.target.value)}
            aria-label="Move to shelf"
          >
            <option value="reading">Reading</option>
            <option value="plan">Plan to read</option>
            <option value="completed">Completed</option>
            <option value="dropped">Dropped</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default function MyListPage() {
  return (
    <Suspense fallback={<div className={styles.pageContainer} />}>
      <MyListContent />
    </Suspense>
  );
}
