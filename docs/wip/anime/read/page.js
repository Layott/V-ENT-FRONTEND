'use client'

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiArrowLeft } from 'react-icons/fi';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import { MdOutlineSettings, MdChatBubbleOutline } from 'react-icons/md';
import { FaBookmark, FaRegBookmark, FaUsers } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './read.module.css';

function ReaderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seriesId = searchParams.get('series') || 'mngx_0';
  const chapterParam = parseInt(searchParams.get('chapter') || '1', 10);

  const { data: session } = useSession();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [series, setSeries] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [currentChapter, setCurrentChapter] = useState(chapterParam);
  const [loading, setLoading] = useState(true);
  const [bookmarked, setBookmarked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState('single'); // 'single' | 'spread' | 'strip'
  const [fitMode, setFitMode] = useState('width'); // 'width' | 'height'
  const [rtl, setRtl] = useState(false);

  const stripRef = useRef(null);

  const authHeaders = useMemo(() => ({
    Authorization: session?.user?.sessionToken ? `Bearer ${session.user.sessionToken}` : '',
    'Content-Type': 'application/json',
  }), [session?.user?.sessionToken]);

  // Fetch series + chapters
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
        console.error('Reader fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiUrl, authHeaders, seriesId]);

  // Sync chapter from URL
  useEffect(() => {
    setCurrentChapter(chapterParam);
    setCurrentPage(0);
    setProgress(0);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }, [chapterParam]);

  const chapter = useMemo(
    () => chapters.find((c) => c.number === currentChapter) || chapters[0],
    [chapters, currentChapter]
  );

  const pages = useMemo(() => chapter?.page_urls || [], [chapter]);
  const totalPages = pages.length;

  // Strip-mode scroll progress
  useEffect(() => {
    if (layoutMode !== 'strip') return;
    const onScroll = () => {
      if (!stripRef.current) return;
      const el = stripRef.current;
      const rect = el.getBoundingClientRect();
      const total = el.scrollHeight - window.innerHeight;
      const scrolled = -rect.top;
      const pct = total > 0 ? Math.max(0, Math.min(100, (scrolled / total) * 100)) : 0;
      setProgress(pct);

      // Approximate "current page" by scroll position
      const pageHeight = el.scrollHeight / Math.max(1, totalPages);
      const idx = Math.min(totalPages - 1, Math.max(0, Math.floor(scrolled / pageHeight)));
      setCurrentPage(idx);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [layoutMode, totalPages, currentChapter]);

  // Single/spread page progress
  useEffect(() => {
    if (layoutMode === 'strip') return;
    if (totalPages > 0) {
      const pageWidth = layoutMode === 'spread' ? 2 : 1;
      const denom = Math.max(1, totalPages - pageWidth);
      setProgress(((currentPage) / denom) * 100);
    }
  }, [currentPage, totalPages, layoutMode]);

  const goPrev = useCallback(() => {
    if (layoutMode === 'strip') return;
    const step = layoutMode === 'spread' ? 2 : 1;
    setCurrentPage((p) => {
      if (p > 0) return Math.max(0, p - step);
      // Jump to previous chapter, last page
      if (currentChapter > 1) {
        const prevCh = currentChapter - 1;
        router.replace(`/anime/read?series=${seriesId}&chapter=${prevCh}`, { scroll: false });
        return 0;
      }
      return 0;
    });
  }, [layoutMode, currentChapter, router, seriesId]);

  const goNext = useCallback(() => {
    if (layoutMode === 'strip') return;
    const step = layoutMode === 'spread' ? 2 : 1;
    setCurrentPage((p) => {
      if (p + step < totalPages) return p + step;
      // Jump to next chapter
      const maxCh = chapters.length || 1;
      if (currentChapter < maxCh) {
        const nextCh = currentChapter + 1;
        router.replace(`/anime/read?series=${seriesId}&chapter=${nextCh}`, { scroll: false });
        return 0;
      }
      return p;
    });
  }, [layoutMode, totalPages, currentChapter, chapters.length, router, seriesId]);

  // Keyboard
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') (rtl ? goNext : goPrev)();
      else if (e.key === 'ArrowRight') (rtl ? goPrev : goNext)();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext, rtl]);

  const visiblePages = useMemo(() => {
    if (layoutMode === 'spread') {
      const arr = [pages[currentPage]];
      if (pages[currentPage + 1]) arr.push(pages[currentPage + 1]);
      return rtl ? arr.reverse() : arr;
    }
    return pages[currentPage] ? [pages[currentPage]] : [];
  }, [layoutMode, pages, currentPage, rtl]);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Top bar */}
          <div className={styles.topBar}>
            <Link href={`/anime/manga/series?id=${seriesId}`} className={styles.backBtn}>
              <FiArrowLeft /> Back
            </Link>
            <div className={styles.topCenter}>
              <h1 className={styles.topTitle}>
                {loading ? 'Loading...' : series?.title || 'Reader'}
              </h1>
              <p className={styles.topSub}>
                {chapter ? `Chapter ${chapter.number} — ${chapter.title}` : ''}
              </p>
            </div>
            <div className={styles.topActions}>
              <button
                type="button"
                className={`${styles.iconBtn} ${bookmarked ? styles.iconBtnActive : ''}`}
                onClick={() => setBookmarked((b) => !b)}
                aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'}
              >
                {bookmarked ? <FaBookmark /> : <FaRegBookmark />}
              </button>
              <Link
                href={`/anime/room?id=roomx_0&series=${seriesId}&chapter=${currentChapter}`}
                className={styles.iconBtn}
                aria-label="Co-read"
                title="Open in co-read room"
              >
                <FaUsers />
              </Link>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setSettingsOpen((s) => !s)}
                aria-label="Settings"
              >
                <MdOutlineSettings />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>

          {/* Settings panel */}
          {settingsOpen && (
            <div className={styles.settingsPanel}>
              <div className={styles.settingsRow}>
                <p className={styles.settingsLabel}>Layout</p>
                <div className={styles.settingsGroup}>
                  {[
                    { id: 'single', label: 'Single page' },
                    { id: 'spread', label: 'Two-page spread' },
                    { id: 'strip', label: 'Vertical strip' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.settingsBtn} ${layoutMode === m.id ? styles.settingsBtnActive : ''}`}
                      onClick={() => { setLayoutMode(m.id); setCurrentPage(0); }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.settingsRow}>
                <p className={styles.settingsLabel}>Fit</p>
                <div className={styles.settingsGroup}>
                  {[{ id: 'width', label: 'Fit width' }, { id: 'height', label: 'Fit height' }].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.settingsBtn} ${fitMode === m.id ? styles.settingsBtnActive : ''}`}
                      onClick={() => setFitMode(m.id)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.settingsRow}>
                <p className={styles.settingsLabel}>Direction</p>
                <div className={styles.settingsGroup}>
                  <button
                    type="button"
                    className={`${styles.settingsBtn} ${!rtl ? styles.settingsBtnActive : ''}`}
                    onClick={() => setRtl(false)}
                  >
                    LTR
                  </button>
                  <button
                    type="button"
                    className={`${styles.settingsBtn} ${rtl ? styles.settingsBtnActive : ''}`}
                    onClick={() => setRtl(true)}
                  >
                    RTL (manga)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Viewer */}
          <div className={`${styles.viewer} ${styles[`viewer_${layoutMode}`]} ${rtl ? styles.viewerRtl : ''}`}>
            {layoutMode === 'strip' ? (
              <div className={styles.stripWrap} ref={stripRef}>
                {pages.map((url, i) => (
                  <div
                    key={i}
                    className={styles.stripImage}
                    style={{ backgroundImage: `url(${url})` }}
                    aria-label={`Page ${i + 1}`}
                  />
                ))}
                {pages.length === 0 && (
                  <p className={styles.emptyText}>No pages loaded.</p>
                )}
              </div>
            ) : (
              <div className={styles.pageWrap}>
                <button
                  type="button"
                  className={`${styles.edgeNav} ${styles.edgeNavLeft}`}
                  onClick={rtl ? goNext : goPrev}
                  aria-label="Previous"
                >
                  <BsChevronLeft />
                </button>
                <div className={styles.pageStage}>
                  {visiblePages.length > 0 ? (
                    visiblePages.map((url, i) => (
                      <div
                        key={i}
                        className={`${styles.pageImage} ${fitMode === 'height' ? styles.pageImageHeight : styles.pageImageWidth}`}
                        style={{ backgroundImage: `url(${url})` }}
                      />
                    ))
                  ) : (
                    <p className={styles.emptyText}>No page available.</p>
                  )}
                </div>
                <button
                  type="button"
                  className={`${styles.edgeNav} ${styles.edgeNavRight}`}
                  onClick={rtl ? goPrev : goNext}
                  aria-label="Next"
                >
                  <BsChevronRight />
                </button>
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className={styles.bottomBar}>
            <button
              type="button"
              className={styles.bottomNavBtn}
              onClick={goPrev}
              disabled={layoutMode === 'strip'}
              aria-label="Previous"
            >
              <BsChevronLeft /> Prev
            </button>
            <span className={styles.pageIndicator}>
              {totalPages === 0 ? '—' : layoutMode === 'strip'
                ? `${currentPage + 1} / ${totalPages}`
                : layoutMode === 'spread'
                  ? `${currentPage + 1}-${Math.min(totalPages, currentPage + 2)} / ${totalPages}`
                  : `${currentPage + 1} / ${totalPages}`}
            </span>
            <button
              type="button"
              className={styles.bottomNavBtn}
              onClick={goNext}
              disabled={layoutMode === 'strip'}
              aria-label="Next"
            >
              Next <BsChevronRight />
            </button>
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense fallback={<div className={styles.pageContainer} />}>
      <ReaderContent />
    </Suspense>
  );
}
