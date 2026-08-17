'use client'

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FaStar, FaBookmark, FaRegBookmark, FaPlay } from 'react-icons/fa';
import { FiArrowLeft } from 'react-icons/fi';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './series.module.css';

function SeriesContent() {
  const searchParams = useSearchParams();
  const seriesId = searchParams.get('id') || 'mngx_0';
  const { data: session } = useSession();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [series, setSeries] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);

  const authHeaders = useMemo(() => ({
    Authorization: session?.user?.sessionToken ? `Bearer ${session.user.sessionToken}` : '',
    'Content-Type': 'application/json',
  }), [session?.user?.sessionToken]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/manga/${seriesId}/`, { headers: authHeaders });
        const data = await res.json();
        if (data?.status === 'success') {
          setSeries(data.data?.series || null);
          setChapters(data.data?.chapters || []);
        }
      } catch (err) {
        console.error('Series fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiUrl, authHeaders, seriesId]);

  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => b.number - a.number),
    [chapters]
  );

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Link href="/anime/manga" className={styles.backLink}>
            <FiArrowLeft /> Back to catalog
          </Link>

          {loading ? (
            <p className={styles.emptyState}>Loading series...</p>
          ) : !series ? (
            <p className={styles.emptyState}>Series not found.</p>
          ) : (
            <>
              {/* Hero */}
              <div className={styles.hero} style={{ backgroundImage: `url(${series.banner})` }}>
                <div className={styles.heroOverlay} />
              </div>

              <div className={styles.detailLayout}>
                <div className={styles.coverCol}>
                  <div className={styles.coverFrame} style={{ backgroundImage: `url(${series.cover})` }} />
                  <Link
                    href={`/anime/read?series=${series.id}&chapter=1`}
                    className={`btn redBTN ${styles.readBtn}`}
                  >
                    <FaPlay /> Start reading
                  </Link>
                  <button
                    type="button"
                    className={`${styles.bookmarkBtn} ${bookmarked ? styles.bookmarkBtnActive : ''}`}
                    onClick={() => setBookmarked((b) => !b)}
                  >
                    {bookmarked ? <FaBookmark /> : <FaRegBookmark />}
                    {bookmarked ? 'Bookmarked' : 'Add to list'}
                  </button>
                </div>

                <div className={styles.infoCol}>
                  <span className={styles.statusPill} data-status={series.status}>{series.status}</span>
                  <h1 className={styles.title}>{series.title}</h1>
                  <p className={styles.byline}>
                    Story: <span>{series.author}</span> · Art: <span>{series.artist}</span>
                  </p>
                  <div className={styles.statRow}>
                    <span className={styles.statItem}>
                      <FaStar className={styles.starIcon} />
                      <strong>{series.rating?.toFixed(1)}</strong>
                      <span className={styles.statLabel}>rating</span>
                    </span>
                    <span className={styles.statItem}>
                      <strong>{series.total_chapters}</strong>
                      <span className={styles.statLabel}>chapters</span>
                    </span>
                    <span className={styles.statItem}>
                      <strong>{series.views?.toLocaleString()}</strong>
                      <span className={styles.statLabel}>views</span>
                    </span>
                    <span className={styles.statItem}>
                      <strong>{series.bookmarks?.toLocaleString()}</strong>
                      <span className={styles.statLabel}>saved</span>
                    </span>
                  </div>
                  <div className={styles.tagRow}>
                    {series.genres?.map((g) => <span key={g} className={styles.tag}>{g}</span>)}
                  </div>
                  <div className={styles.synopsisBlock}>
                    <h3 className={styles.synopsisTitle}>Synopsis</h3>
                    <p className={styles.synopsisText}>{series.description}</p>
                  </div>
                </div>
              </div>

              {/* Chapter list */}
              <div className={styles.chaptersBlock}>
                <h3 className={styles.chaptersTitle}>Chapters ({chapters.length})</h3>
                <div className={styles.chapterTable}>
                  <div className={styles.chapterHead}>
                    <span>Ch.</span>
                    <span>Title</span>
                    <span className={styles.colHidesMobile}>Pages</span>
                    <span className={styles.colHidesMobile}>Released</span>
                    <span></span>
                  </div>
                  {sortedChapters.map((c) => (
                    <Link
                      key={c.id}
                      href={`/anime/read?series=${series.id}&chapter=${c.number}`}
                      className={styles.chapterRow}
                    >
                      <span className={styles.chapterNumber}>#{c.number}</span>
                      <span className={styles.chapterTitle}>{c.title}</span>
                      <span className={`${styles.chapterCol} ${styles.colHidesMobile}`}>{c.page_count} pages</span>
                      <span className={`${styles.chapterCol} ${styles.colHidesMobile}`}>
                        {new Date(c.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                      <span className={styles.chapterReadBtn}>Read</span>
                    </Link>
                  ))}
                  {sortedChapters.length === 0 && (
                    <p className={styles.emptyState}>No chapters yet.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
}

export default function SeriesDetailPage() {
  return (
    <Suspense fallback={<div className={styles.pageContainer} />}>
      <SeriesContent />
    </Suspense>
  );
}
