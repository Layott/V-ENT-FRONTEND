'use client';

// The reader: pages, in three modes, with a way through them.
//
// The design is `docs/wip/anime/read`, back against the real API. What the
// walk-back changed:
//
//   * the mode was a local toggle over hardcoded images. It comes from the
//     reader's saved settings now, and the DEFAULT comes from the comic's kind,
//     because a manhwa opened two pages side by side is unreadable and asking
//     every author to know that is asking the wrong person.
//   * there was no refusal state at all. A chapter somebody may not open now
//     draws the cover, says what it costs and offers the press, which is the
//     "tell them before they spend effort" rule.
//   * progress was not saved. It is, once per page turn, and it is what
//     "Carry on reading" reads.
//
// Themes are premium and the MODES ARE NOT. The modes are how somebody reads at
// all; the look is a decoration. Getting that backwards would put a paywall in
// front of a manhwa being legible.

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { LuBookmark, LuChevronLeft, LuChevronRight, LuSettings } from 'react-icons/lu';
import Header from '@/components/header/Header';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { call, fill, refusalLine, tokenFrom, useAnimeOpen } from '@/lib/anime';
import { useViewer } from '@/lib/gating';
import { mediaUrl } from '@/lib/mediaUrl';
import styles from './read.module.css';

const MODES = [
  { id: 'single', word: ['anime.modeSingle', 'One page'] },
  { id: 'double', word: ['anime.modeDouble', 'Two pages'] },
  { id: 'vertical', word: ['anime.modeVertical', 'Keep scrolling'] },
];

const ReaderClient = ({ slug }) => {
  const tt = useT();
  const open = useAnimeOpen();
  const router = useRouter();
  const { data: session } = useSession();
  const viewer = useViewer();
  const token = tokenFrom(session);

  const [chapter, setChapter] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await call(`/chapters/${encodeURIComponent(slug)}/`, { token });
      setChapter(data);
      if (data.series_row?.continue?.chapter === data.slug) {
        setPage(data.series_row.continue.page || 1);
      }
      if (token) {
        try {
          const [mine, marks] = await Promise.all([
            call('/reader-settings/', { token }),
            call(`/chapters/${encodeURIComponent(slug)}/bookmarks/`, { token }),
          ]);
          setSettings(mine);
          setBookmarks(marks.bookmarks || []);
        } catch { /* the reader still works without them */ }
      }
    } catch (err) {
      if (err.code === 'SLUG_CHANGED' && err.data?.url) {
        router.replace(err.data.url);
        return;
      }
      setError(err.code === 'NOT_FOUND'
        ? tt('anime.noSuchChapter', 'There is no chapter here.')
        : (apiMessage(tt, err, 'anime.loadFailed', 'We could not load it.')));
    } finally {
      setLoading(false);
    }
  }, [slug, token, router, tt]);

  useEffect(() => {
    if (open !== true) return undefined;
    load();
    return undefined;
  }, [open, load]);

  // Where somebody got to, saved as they turn. Once per page rather than on a
  // timer: a timer that fires while the tab is in the background records a
  // page nobody was reading.
  const lastSaved = useRef(0);
  useEffect(() => {
    if (!token || !chapter?.can_read || page === lastSaved.current) return;
    lastSaved.current = page;
    call(`/chapters/${encodeURIComponent(slug)}/progress/`, {
      method: 'POST', body: { page }, token,
    }).catch(() => { /* a lost place is not worth an error on screen */ });
  }, [page, token, slug, chapter]);

  const mode = settings?.mode
    || chapter?.series_row?.default_mode
    || 'single';

  const setMode = async (next) => {
    setSettings(s => ({ ...(s || {}), mode: next }));
    if (!token) return;
    try {
      setSettings(await call('/reader-settings/', {
        method: 'POST', body: { mode: next }, token }));
    } catch (err) {
      setToast(apiMessage(tt, err, 'anime.didNotWork', 'That did not work.'));
    }
  };

  const setTheme = async (next) => {
    if (!token) return;
    try {
      setSettings(await call('/reader-settings/', {
        method: 'POST', body: { theme: next }, token }));
      setToast(null);
    } catch (err) {
      setToast(err.code === 'PREMIUM_REQUIRED'
        ? tt('anime.themePremium',
          'Reader themes are a premium feature.')
        : err.message);
    }
  };

  const buy = async () => {
    setBusy(true);
    setToast(null);
    try {
      await call(`/chapters/${encodeURIComponent(slug)}/buy/`, {
        method: 'POST', body: {}, token });
      setToast(tt('anime.bought', 'It is yours to read.'));
      await load();
    } catch (err) {
      setToast(apiMessage(tt, err, 'anime.didNotWork', 'That did not work.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleBookmark = async () => {
    if (!token) return;
    try {
      const res = await call(`/chapters/${encodeURIComponent(slug)}/bookmarks/`, {
        method: 'POST', body: { page }, token });
      setToast(res.bookmarked
        ? tt('anime.bookmarked', 'Bookmarked.')
        : tt('anime.bookmarkRemoved', 'Bookmark removed.'));
      const marks = await call(`/chapters/${encodeURIComponent(slug)}/bookmarks/`,
        { token });
      setBookmarks(marks.bookmarks || []);
    } catch (err) {
      setToast(apiMessage(tt, err, 'anime.didNotWork', 'That did not work.'));
    }
  };

  if (open === null) return null;
  if (open === false) {
    return <ComingSoon phase="Phase 5"
      title={tt('anime.comingTitle', 'Anime hub')}
      blurb={tt('anime.comingBlurb',
        'Manga reading, co-reading rooms and character battles are built and '
        + 'not open yet. Nothing here is live.')}
      alternatives={[{ href: '/tournaments', label: tt('nav.tournaments', 'Tournaments') }]} />;
  }

  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <p className={styles.emptyText}>{tt('ui.loading.33ce', 'Loading…')}</p>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <div className={styles.emptyText}>
          <p>{error}</p>
          <button type="button" className={styles.bottomNavBtn} onClick={load}>
            {tt('common.tryAgain', 'Try again')}
          </button>
        </div>
      </div>
    );
  }

  const pages = chapter.page_list || [];
  const total = pages.length || chapter.pages || 0;
  const marked = bookmarks.some(b => b.page === page);

  return (
    <div className={styles.pageContainer} data-theme={settings?.theme || 'dark'}>
      <Header />
      <main className={styles.mainContainer}>
        <div className={styles.rightPaneContainer}>
          <div className={styles.topBar}>
            <Link className={styles.backBtn}
                  href={`/anime/manga/${chapter.series}`}>
              <LuChevronLeft /> {tt('anime.backToComic', 'Back to the comic')}
            </Link>
            <div className={styles.topCenter}>
              <p className={styles.topTitle}>{chapter.series_title}</p>
              <p className={styles.topSub}>
                {fill(tt('anime.chapterN', 'Chapter {n}'), { n: chapter.number })}
                {chapter.title ? ` ${chapter.title}` : ''}
              </p>
            </div>
            <div className={styles.topActions}>
              {chapter.can_read && viewer.signedIn && (
                <button type="button"
                        className={marked ? styles.iconBtnActive : styles.iconBtn}
                        aria-pressed={marked} onClick={toggleBookmark}
                        aria-label={tt('anime.bookmark', 'Bookmark this page')}>
                  <LuBookmark />
                </button>
              )}
              <button type="button" className={styles.iconBtn}
                      aria-expanded={showSettings}
                      onClick={() => setShowSettings(v => !v)}
                      aria-label={tt('anime.readerSettings', 'Reader settings')}>
                <LuSettings />
              </button>
            </div>
          </div>

          {showSettings && (
            <div className={styles.settingsPanel}>
              <div className={styles.settingsRow}>
                <span className={styles.settingsLabel}>
                  {tt('anime.howToRead', 'How to read it')}
                </span>
                <div className={styles.settingsGroup}>
                  {MODES.map(m => (
                    <button key={m.id} type="button" aria-pressed={mode === m.id}
                            className={mode === m.id
                              ? styles.settingsBtnActive : styles.settingsBtn}
                            onClick={() => setMode(m.id)}>
                      {tt(m.word[0], m.word[1])}
                    </button>
                  ))}
                </div>
              </div>

              {/* Themes are premium and say so BEFORE the press, as well as
                  being refused by the API. Both halves. */}
              <div className={styles.settingsRow}>
                <span className={styles.settingsLabel}>
                  {settings?.may_theme
                    ? tt('anime.theme', 'Theme')
                    : tt('anime.themeIsPremium', 'Theme (premium)')}
                </span>
                <div className={styles.settingsGroup}>
                  {['dark', 'light', 'sepia', 'black'].map(t => (
                    <button key={t} type="button"
                            aria-pressed={(settings?.theme || 'dark') === t}
                            disabled={!settings?.may_theme && t !== 'dark'}
                            className={(settings?.theme || 'dark') === t
                              ? styles.settingsBtnActive : styles.settingsBtn}
                            onClick={() => setTheme(t)}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {!settings?.may_theme && (
                <p className={styles.settingsLabel}>
                  <Link href="/premium">
                    {tt('premium.seeWhatItCosts', 'See what premium costs')}
                  </Link>
                </p>
              )}
            </div>
          )}

          <div className={styles.progressTrack}>
            <div className={styles.progressFill}
                 style={{ width: total ? `${(page / total) * 100}%` : '0%' }} />
          </div>

          {!chapter.can_read ? (
            <div className={styles.emptyText}>
              <p>{refusalLine(tt, chapter.refusal)}</p>
              {viewer.signedIn && chapter.refusal?.needs_coins > 0 && (
                <button type="button" className={styles.bottomNavBtn}
                        disabled={busy} onClick={buy}>
                  {fill(tt('anime.payToRead', 'Pay {n} VENT COINS'),
                    { n: chapter.refusal.needs_coins })}
                </button>
              )}
              {!viewer.signedIn && (
                <Link href="/login" className={styles.bottomNavBtn}>
                  {tt('needsAccount.signIn', 'Log in')}
                </Link>
              )}
            </div>
          ) : total === 0 ? (
            <p className={styles.emptyText}>
              {tt('anime.noPages', 'This chapter has no pages in it yet.')}
            </p>
          ) : mode === 'vertical' ? (
            <div className={styles.stripWrap}>
              {pages.map(p => (mediaUrl(p.image) ? (
                <img key={p.number} className={styles.stripImage}
                     src={mediaUrl(p.image)} alt={p.alt || ''} loading="lazy" />
              ) : null))}
            </div>
          ) : (
            <div className={`${styles.viewer} ${mode === 'double'
              ? styles.viewer_spread : styles.viewer_single}`}>
              <button type="button" className={styles.edgeNavLeft}
                      onClick={() => setPage(p => Math.max(1, p - (mode === 'double' ? 2 : 1)))}
                      aria-label={tt('anime.previousPage', 'Previous page')}>
                <LuChevronLeft />
              </button>
              <div className={styles.pageWrap}>
                <div className={styles.pageStage}>
                  {(mode === 'double'
                    ? pages.slice(page - 1, page + 1)
                    : pages.slice(page - 1, page)
                  ).map(p => (
                    // BOTH classes. `pageImage` carries the look and no size at
                    // all, and the designed sheet expects a sizing class beside
                    // it. With only the first the image collapsed to a thin
                    // band on a phone, which is how this was found.
                    mediaUrl(p.image) ? (
                      <img key={p.number}
                           className={`${styles.pageImage} ${styles.pageImageWidth}`}
                           src={mediaUrl(p.image)} alt={p.alt || ''} />
                    ) : null
                  ))}
                </div>
              </div>
              <button type="button" className={styles.edgeNavRight}
                      onClick={() => setPage(p => Math.min(total, p + (mode === 'double' ? 2 : 1)))}
                      aria-label={tt('anime.nextPage', 'Next page')}>
                <LuChevronRight />
              </button>
            </div>
          )}

          {/* Real advertisements an admin created, and nothing at all when
              there are none. Premium readers are sent none by the API. */}
          {(chapter.ads || []).map(ad => (
            <a key={ad.title} className={styles.emptyText} href={ad.url}
               rel="nofollow noopener" target="_blank">
              {ad.image
                ? <img src={mediaUrl(ad.image)} alt={ad.title} />
                : ad.title}
            </a>
          ))}

          <div className={styles.bottomBar}>
            {chapter.neighbours?.previous ? (
              <Link className={styles.bottomNavBtn}
                    href={`/anime/read/${chapter.neighbours.previous}`}>
                {tt('anime.previousChapter', 'Previous chapter')}
              </Link>
            ) : <span />}
            <span className={styles.pageIndicator}>
              {total ? fill(tt('anime.pageOf', 'Page {p} of {n}'),
                { p: page, n: total }) : ''}
            </span>
            {chapter.neighbours?.next ? (
              <Link className={styles.bottomNavBtn}
                    href={`/anime/read/${chapter.neighbours.next}`}>
                {tt('anime.nextChapter', 'Next chapter')}
              </Link>
            ) : <span />}
          </div>

          {toast ? <p className={styles.emptyText} role="status">{toast}</p> : null}
        </div>
      </main>
    </div>
  );
};

export default ReaderClient;
