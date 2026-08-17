'use client'

import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FiArrowLeft } from 'react-icons/fi';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import { MdOutlineSettings, MdChatBubbleOutline } from 'react-icons/md';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './reader.module.css';

const PAGES_PER_CHAPTER = 6;

function MangaReader() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mangaId = searchParams.get('manga') || 'mng_0';
  const chapterParam = parseInt(searchParams.get('chapter') || '1', 10);

  const { data: session } = useSession();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [manga, setManga] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState('paginated'); // 'paginated' | 'strip'
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chapter, setChapter] = useState(chapterParam);

  useEffect(() => {
    setChapter(chapterParam);
    setCurrentPage(0);
  }, [chapterParam]);

  useEffect(() => {
    const headers = session?.user?.sessionToken
      ? { Authorization: `Bearer ${session.user.sessionToken}` }
      : {};

    const fetchManga = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/anime/manga/${mangaId}/`, { headers });
        const data = await res.json();
        if (data.status === 'success') setManga(data.data.manga || null);
      } catch (err) {
        console.error('Manga fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchManga();
  }, [mangaId, apiUrl, session?.user?.sessionToken]);

  const goPrev = useCallback(() => {
    if (viewMode === 'strip') return;
    setCurrentPage((p) => {
      if (p > 0) return p - 1;
      if (chapter > 1) {
        const newCh = chapter - 1;
        setChapter(newCh);
        router.replace(`/anime/reader?manga=${mangaId}&chapter=${newCh}`, { scroll: false });
        return PAGES_PER_CHAPTER - 1;
      }
      return 0;
    });
  }, [viewMode, chapter, mangaId, router]);

  const goNext = useCallback(() => {
    if (viewMode === 'strip') return;
    setCurrentPage((p) => {
      if (p < PAGES_PER_CHAPTER - 1) return p + 1;
      const newCh = chapter + 1;
      setChapter(newCh);
      router.replace(`/anime/reader?manga=${mangaId}&chapter=${newCh}`, { scroll: false });
      return 0;
    });
  }, [viewMode, chapter, mangaId, router]);

  const goNextChapter = () => {
    const newCh = chapter + 1;
    setChapter(newCh);
    setCurrentPage(0);
    router.replace(`/anime/reader?manga=${mangaId}&chapter=${newCh}`, { scroll: false });
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goPrev, goNext]);

  const pages = Array.from({ length: PAGES_PER_CHAPTER }).map((_, i) => ({
    id: `${mangaId}-${chapter}-${i}`,
    seed: `${mangaId}-ch${chapter}-p${i}`,
  }));

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Top bar */}
          <div className={styles.topBar}>
            <Link href="/anime" className={styles.backBtn}>
              <FiArrowLeft /> Back
            </Link>
            <div className={styles.topCenter}>
              <h1 className={styles.topTitle}>
                {loading ? 'Loading...' : manga?.title || 'Manga Reader'}
              </h1>
              <p className={styles.topSub}>
                {loading ? '' : `${manga?.author || ''} · Chapter ${chapter}`}
              </p>
            </div>
            <div className={styles.topActions}>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setChapter((c) => Math.max(1, c - 1))}
                aria-label="Previous chapter"
              >
                <BsChevronLeft />
              </button>
              <span className={styles.chapterLabel}>Ch. {chapter}</span>
              <button
                type="button"
                className={styles.iconBtn}
                onClick={() => setChapter((c) => c + 1)}
                aria-label="Next chapter"
              >
                <BsChevronRight />
              </button>
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

          {/* Settings */}
          {settingsOpen && (
            <div className={styles.settingsPanel}>
              <p className={styles.settingsLabel}>View mode</p>
              <div className={styles.settingsGroup}>
                <button
                  type="button"
                  className={`${styles.settingsBtn} ${viewMode === 'paginated' ? styles.settingsBtnActive : ''}`}
                  onClick={() => { setViewMode('paginated'); setCurrentPage(0); }}
                >
                  Single page
                </button>
                <button
                  type="button"
                  className={`${styles.settingsBtn} ${viewMode === 'strip' ? styles.settingsBtnActive : ''}`}
                  onClick={() => setViewMode('strip')}
                >
                  Continuous strip
                </button>
              </div>
            </div>
          )}

          {/* Viewer */}
          <div className={styles.viewerFrame}>
            {viewMode === 'paginated' ? (
              <div className={styles.pageWrap}>
                <button
                  type="button"
                  className={`${styles.edgeNav} ${styles.edgeNavLeft}`}
                  onClick={goPrev}
                  aria-label="Previous page"
                >
                  <BsChevronLeft />
                </button>
                <div
                  className={styles.pageImage}
                  style={{ backgroundImage: `url(https://picsum.photos/seed/${pages[currentPage].seed}/800/1200)` }}
                  aria-label={`Page ${currentPage + 1} of ${PAGES_PER_CHAPTER}`}
                />
                <button
                  type="button"
                  className={`${styles.edgeNav} ${styles.edgeNavRight}`}
                  onClick={goNext}
                  aria-label="Next page"
                >
                  <BsChevronRight />
                </button>
              </div>
            ) : (
              <div className={styles.stripWrap}>
                {pages.map((p) => (
                  <div
                    key={p.id}
                    className={styles.stripImage}
                    style={{ backgroundImage: `url(https://picsum.photos/seed/${p.seed}/800/1200)` }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className={styles.bottomBar}>
            {viewMode === 'paginated' && (
              <p className={styles.pageCounter}>
                Page {currentPage + 1} / {PAGES_PER_CHAPTER}
              </p>
            )}
            <div className={styles.bottomActions}>
              <Link href={`/anime/reader?manga=${mangaId}&chapter=${chapter}#comments`} className={styles.bottomCommentsBtn}>
                <MdChatBubbleOutline /> Comments
              </Link>
              <button type="button" className={`${styles.bottomNextBtn} goldBTN`} onClick={goNextChapter}>
                Next chapter
              </button>
            </div>
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={<div className={styles.pageContainer} />}>
      <MangaReader />
    </Suspense>
  );
}
