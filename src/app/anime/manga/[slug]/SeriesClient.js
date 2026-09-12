'use client';

// One comic: what it is, what it costs, and every chapter of it.
//
// The layout is the designed one from `docs/wip/anime/manga/series`, back
// against the real API. What changed: the chapter list is real, each row says
// whether the reader may open it, and the price is `priceLine` rather than a
// sentence written here, so the card, this page and the reader cannot describe
// the same comic differently.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FaStar } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import NeedsAccount from '@/components/needs-account/NeedsAccount';
import UserChip from '@/components/user-chip/UserChip';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { call, fill, priceLine, tokenFrom, useAnimeOpen } from '@/lib/anime';
import { formatDate } from '@/lib/datetime';
import { useViewer } from '@/lib/gating';
import Banner from '@/components/banner/Banner';
import { mediaUrl } from '@/lib/mediaUrl';
import styles from './series.module.css';

const SeriesClient = ({ slug }) => {
  const tt = useT();
  const open = useAnimeOpen();
  const router = useRouter();
  const { data: session } = useSession();
  const viewer = useViewer();
  const token = tokenFrom(session);

  const [series, setSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSeries(await call(`/series/${encodeURIComponent(slug)}/`, { token }));
    } catch (err) {
      if (err.code === 'SLUG_CHANGED' && err.data?.url) {
        // Renamed. Send the browser to the address it has now, rather than
        // showing a 404 for a link somebody shared in June.
        router.replace(err.data.url);
        return;
      }
      setError(err.code === 'NOT_FOUND'
        ? tt('anime.noSuchComic', 'There is no comic here.')
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

  const act = async (path, body, said) => {
    setBusy(true);
    setToast(null);
    try {
      await call(path, { method: 'POST', body, token });
      setToast(said);
      await load();
    } catch (err) {
      setToast(apiMessage(tt, err, 'anime.didNotWork', 'That did not work.'));
    } finally {
      setBusy(false);
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

  const shell = inner => (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <Link href="/anime/manga" className={styles.backLink}>
            {tt('anime.backToComics', 'Back to comics')}
          </Link>
          {inner}
        </div>
      </main>
      <BottomMenu />
      {toast ? <p className={styles.emptyState} role="status">{toast}</p> : null}
    </div>
  );

  if (loading) return shell(<p className={styles.emptyState}>{tt('ui.loading.33ce', 'Loading…')}</p>);
  if (error) {
    return shell(
      <div className={styles.emptyState}>
        <p>{error}</p>
        <button type="button" onClick={load}>{tt('common.tryAgain', 'Try again')}</button>
      </div>);
  }
  if (!series) return shell(null);

  const chapters = series.chapter_list || [];
  const carryOn = series.continue;

  return shell(
    <>
      <div className={styles.detailLayout}>
        <div className={styles.coverCol}>
          <div className={styles.coverFrame}>
            <Banner src={mediaUrl(series.cover)} alt={series.title}
                    label={series.title} />
          </div>

          {chapters.length > 0 && (
            <Link className={styles.readBtn}
                  href={`/anime/read/${carryOn?.chapter || chapters[0].slug}`}>
              {carryOn
                ? tt('anime.carryOn', 'Carry on reading')
                : tt('anime.startReading', 'Start reading')}
            </Link>
          )}

          {viewer.signedIn ? (
            <button type="button" disabled={busy}
                    className={series.following
                      ? styles.bookmarkBtnActive : styles.bookmarkBtn}
                    onClick={() => act(
                      `/series/${series.slug}/follow/`, {},
                      series.following
                        ? tt('anime.unfollowed', 'You are not following it any more.')
                        : tt('anime.followed', 'You will be told when a chapter lands.'))}>
              {series.following
                ? tt('anime.following', 'Following')
                : tt('anime.follow', 'Follow')}
            </button>
          ) : (
            <NeedsAccount action={tt('anime.followAction', 'follow a comic')} />
          )}

          {series.pricing === 'subscription' && viewer.signedIn && !series.mine && (
            <button type="button" className={styles.readBtn} disabled={busy}
                    onClick={() => act(`/series/${series.slug}/subscribe/`,
                      { months: 1 },
                      tt('anime.subscribed', 'You are subscribed.'))}>
              {series.subscribed_until
                ? fill(tt('anime.subscribedUntil', 'Subscribed until {d}'),
                  { d: formatDate(series.subscribed_until) })
                : fill(tt('anime.subscribeFor', 'Subscribe, {n} VC a month'),
                  { n: series.subscription_price_vc })}
            </button>
          )}
        </div>

        <div className={styles.infoCol}>
          <span className={styles.statusPill}>{series.status}</span>
          <h1 className={styles.title}>{series.title}</h1>
          <p className={styles.byline}>
            <UserChip user={series.author} />
          </p>

          <div className={styles.statRow}>
            <span className={styles.statItem}>
              <span className={styles.statLabel}>{tt('anime.kind', 'Kind')}</span>
              {series.kind_label}
            </span>
            <span className={styles.statItem}>
              <span className={styles.statLabel}>{tt('anime.chapters', 'Chapters')}</span>
              {series.chapters}
            </span>
            <span className={styles.statItem}>
              <span className={styles.statLabel}>{tt('anime.rating', 'Rating')}</span>
              {series.rating != null
                ? <><FaStar className={styles.starIcon} />{series.rating}</>
                : tt('anime.unrated', 'Not rated yet')}
            </span>
            <span className={styles.statItem}>
              <span className={styles.statLabel}>{tt('anime.price', 'Price')}</span>
              {priceLine(tt, series)}
            </span>
          </div>

          {viewer.signedIn && !series.mine && (
            <div className={styles.tagRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" className={styles.tag} disabled={busy}
                        aria-pressed={series.my_rating === n}
                        onClick={() => act(`/series/${series.slug}/rate/`,
                          { stars: n }, tt('anime.rated', 'Rated.'))}>
                  {fill(tt('anime.stars', '{n} stars'), { n })}
                </button>
              ))}
            </div>
          )}

          {series.genres?.length > 0 && (
            <div className={styles.tagRow}>
              {series.genres.map(g => (
                <span key={g} className={styles.tag}>{g}</span>
              ))}
            </div>
          )}

          <div className={styles.synopsisBlock}>
            <h2 className={styles.synopsisTitle}>{tt('anime.about', 'About it')}</h2>
            <p className={styles.synopsisText}>
              {series.synopsis || tt('anime.noSynopsis',
                'The author has not written a description yet.')}
            </p>
          </div>

          <div className={styles.chaptersBlock}>
            <h2 className={styles.chaptersTitle}>
              {tt('anime.chaptersTitle', 'Chapters')}
            </h2>
            {chapters.length === 0 ? (
              <p className={styles.emptyState}>
                {tt('anime.noChapters', 'No chapters yet.')}
              </p>
            ) : (
              <div className={styles.chapterTable}>
                <div className={styles.chapterHead}>
                  <span>{tt('anime.number', 'No.')}</span>
                  <span>{tt('anime.chapterTitle', 'Title')}</span>
                  <span className={styles.colHidesMobile}>
                    {tt('anime.pages', 'Pages')}
                  </span>
                  <span />
                </div>
                {chapters.map(ch => (
                  <div key={ch.slug} className={styles.chapterRow}>
                    <span className={styles.chapterNumber}>{ch.number}</span>
                    <span className={styles.chapterTitle}>
                      {ch.title || fill(tt('anime.chapterN', 'Chapter {n}'),
                        { n: ch.number })}
                      {ch.early && (
                        <> {tt('anime.earlyTag', '(early access)')}</>
                      )}
                    </span>
                    <span className={styles.colHidesMobile}>{ch.pages}</span>
                    <Link className={styles.chapterReadBtn}
                          href={`/anime/read/${ch.slug}`}>
                      {ch.can_read
                        ? tt('anime.read', 'Read')
                        : tt('anime.locked', 'Locked')}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SeriesClient;
