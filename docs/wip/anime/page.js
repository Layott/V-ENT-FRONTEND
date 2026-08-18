'use client'

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { FaPlay, FaStar, FaUsers, FaBookmark } from 'react-icons/fa';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './anime.module.css';

function HubContent() {
  const { data: session } = useSession();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  const [series, setSeries] = useState([]);
  const [amvs, setAmvs] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [heroIdx, setHeroIdx] = useState(0);

  const authHeaders = useMemo(() => ({
    Authorization: session?.user?.sessionToken ? `Bearer ${session.user.sessionToken}` : '',
    'Content-Type': 'application/json',
  }), [session?.user?.sessionToken]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      try {
        const [s, a, r] = await Promise.all([
          fetch(`${apiUrl}/manga/list/?limit=12`, { headers: authHeaders }).then((x) => x.json()),
          fetch(`${apiUrl}/amv/list/?limit=8`, { headers: authHeaders }).then((x) => x.json()),
          fetch(`${apiUrl}/room/list/?active=true`, { headers: authHeaders }).then((x) => x.json()),
        ]);
        if (s?.status === 'success') setSeries(s.data?.series || []);
        if (a?.status === 'success') setAmvs(a.data?.amvs || []);
        if (r?.status === 'success') setRooms(r.data?.rooms || []);
      } catch (err) {
        console.error('Anime hub fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [apiUrl, authHeaders]);

  // Featured = first 3 by `featured` flag if present, else first 3
  const featured = useMemo(() => series.slice(0, 3), [series]);
  const trending = useMemo(() => series.slice(0, 4), [series]);
  const newAmvs = useMemo(() => [...amvs].sort((a, b) => new Date(b.uploaded_at) - new Date(a.uploaded_at)).slice(0, 4), [amvs]);
  const liveRooms = useMemo(() => rooms.filter((r) => r.is_active).slice(0, 3), [rooms]);
  const topRated = useMemo(() => [...series].sort((a, b) => b.rating - a.rating).slice(0, 4), [series]);

  // Hero auto-advance
  useEffect(() => {
    if (featured.length < 2) return;
    const id = setInterval(() => setHeroIdx((i) => (i + 1) % featured.length), 6000);
    return () => clearInterval(id);
  }, [featured.length]);

  const advance = useCallback((dir) => {
    if (featured.length === 0) return;
    setHeroIdx((i) => (i + dir + featured.length) % featured.length);
  }, [featured.length]);

  const heroSeries = featured[heroIdx];

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Anime Hub</h1>
              <p className={styles.pageSub}>
                Read manga, watch fan-made AMVs, jump into live co-reading rooms — Africa-first anime culture, all in V-ENT.
              </p>
            </div>
          </div>

          {/* ── Hero Carousel ── */}
          <section className={styles.heroBlock}>
            {heroSeries ? (
              <div
                className={styles.heroBanner}
                style={{ backgroundImage: `url(${heroSeries.banner})` }}
              >
                <div className={styles.heroOverlay}>
                  <div className={styles.heroContent}>
                    <span className={styles.heroPill}>Featured Manga</span>
                    <h2 className={styles.heroTitle}>{heroSeries.title}</h2>
                    <p className={styles.heroDesc}>{heroSeries.description}</p>
                    <div className={styles.heroMeta}>
                      <span className={styles.heroMetaItem}>
                        <FaStar /> {heroSeries.rating?.toFixed(1)}
                      </span>
                      <span className={styles.heroMetaItem}>{heroSeries.total_chapters} chapters</span>
                      <span className={`${styles.heroMetaItem} ${styles.heroMetaPill}`}>{heroSeries.status}</span>
                    </div>
                    <div className={styles.heroActions}>
                      <Link
                        href={`/anime/manga/series?id=${heroSeries.id}`}
                        className={`btn redBTN ${styles.heroPrimaryBtn}`}
                      >
                        Read now
                      </Link>
                      <Link
                        href={`/anime/manga/series?id=${heroSeries.id}`}
                        className={styles.heroSecondaryBtn}
                      >
                        See details
                      </Link>
                    </div>
                  </div>
                </div>

                {featured.length > 1 && (
                  <>
                    <button
                      type="button"
                      className={`${styles.heroNav} ${styles.heroNavLeft}`}
                      onClick={() => advance(-1)}
                      aria-label="Previous featured"
                    >
                      <BsChevronLeft />
                    </button>
                    <button
                      type="button"
                      className={`${styles.heroNav} ${styles.heroNavRight}`}
                      onClick={() => advance(1)}
                      aria-label="Next featured"
                    >
                      <BsChevronRight />
                    </button>
                    <div className={styles.heroDots}>
                      {featured.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`${styles.heroDot} ${i === heroIdx ? styles.heroDotActive : ''}`}
                          onClick={() => setHeroIdx(i)}
                          aria-label={`Slide ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className={styles.heroSkeleton}>{loading ? 'Loading featured manga...' : 'No featured manga.'}</div>
            )}
          </section>

          {/* ── Trending Manga ── */}
          <section className={styles.section}>
            <SectionHeader
              title="Trending manga"
              subtitle="Most-read titles right now"
              href="/anime/manga"
            />
            <div className={styles.cardGrid4}>
              {trending.map((m) => <MangaCard key={m.id} series={m} />)}
              {!loading && trending.length === 0 && <p className={styles.emptyState}>No manga available.</p>}
            </div>
          </section>

          {/* ── New AMVs ── */}
          <section className={styles.section}>
            <SectionHeader
              title="New AMVs"
              subtitle="Fan-edited drops from the community"
              href="/anime/amv"
            />
            <div className={styles.cardGrid4}>
              {newAmvs.map((a) => <AmvCard key={a.id} amv={a} />)}
              {!loading && newAmvs.length === 0 && <p className={styles.emptyState}>No AMVs yet.</p>}
            </div>
          </section>

          {/* ── Live Co-Read Rooms ── */}
          <section className={styles.section}>
            <SectionHeader
              title="Live co-read rooms"
              subtitle="Read together, theorise live"
              href="/anime?tab=coread"
            />
            <div className={styles.cardGrid3}>
              {liveRooms.map((r) => <RoomCard key={r.id} room={r} />)}
              {!loading && liveRooms.length === 0 && <p className={styles.emptyState}>No live rooms — start your own.</p>}
            </div>
          </section>

          {/* ── Top Rated Series ── */}
          <section className={styles.section}>
            <SectionHeader
              title="Top-rated series"
              subtitle="Critic + community favourites"
              href="/anime/manga"
            />
            <div className={styles.cardGrid4}>
              {topRated.map((m) => <MangaCard key={m.id} series={m} />)}
              {!loading && topRated.length === 0 && <p className={styles.emptyState}>No rated series yet.</p>}
            </div>
          </section>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
}

function SectionHeader({ title, subtitle, href }) {
  return (
    <div className={styles.sectionHeader}>
      <div>
        <h3 className={styles.sectionTitle}>{title}</h3>
        {subtitle && <p className={styles.sectionSub}>{subtitle}</p>}
      </div>
      {href && <Link href={href} className={styles.sectionLink}>See all →</Link>}
    </div>
  );
}

function MangaCard({ series }) {
  return (
    <Link href={`/anime/manga/series?id=${series.id}`} className={styles.mangaCard}>
      <div
        className={styles.mangaCover}
        style={{ backgroundImage: `url(${series.cover})` }}
      >
        <span className={styles.mangaStatusPill} data-status={series.status}>
          {series.status}
        </span>
      </div>
      <div className={styles.mangaBody}>
        <h4 className={styles.mangaTitle}>{series.title}</h4>
        <p className={styles.mangaMeta}>
          <span><FaStar className={styles.starIcon} /> {series.rating?.toFixed(1)}</span>
          <span className={styles.dot}>·</span>
          <span>{series.total_chapters} ch</span>
        </p>
        <div className={styles.mangaTags}>
          {series.genres?.slice(0, 2).map((g) => (
            <span key={g} className={styles.mangaTag}>{g}</span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function AmvCard({ amv }) {
  return (
    <Link href={`/anime/amv/detail?id=${amv.id}`} className={styles.amvCard}>
      <div className={styles.amvThumb} style={{ backgroundImage: `url(${amv.thumbnail})` }}>
        <span className={styles.amvPlayIcon}><FaPlay /></span>
        <span className={styles.amvDuration}>{amv.duration}</span>
      </div>
      <div className={styles.amvBody}>
        <h4 className={styles.amvTitle}>{amv.title}</h4>
        <p className={styles.amvUploader}>@{amv.uploader?.username}</p>
        <p className={styles.amvStats}>
          {amv.views?.toLocaleString()} views · {amv.likes?.toLocaleString()} likes
        </p>
      </div>
    </Link>
  );
}

function RoomCard({ room }) {
  return (
    <Link href={`/anime/room?id=${room.id}`} className={styles.roomCard}>
      <div className={styles.roomCover} style={{ backgroundImage: `url(${room.series?.cover})` }}>
        <span className={styles.roomLivePill}>
          <span className={styles.roomLiveDot} /> Live
        </span>
      </div>
      <div className={styles.roomBody}>
        <h4 className={styles.roomTitle}>{room.name}</h4>
        <p className={styles.roomMeta}>
          Ch. {room.current_chapter} · {room.topic}
        </p>
        <div className={styles.roomFooter}>
          <span className={styles.roomHostName}>@{room.host?.username}</span>
          <span className={styles.roomReaders}>
            <FaUsers /> {room.participants?.length || 0}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AnimeHub() {
  return (
    <Suspense fallback={<div className={styles.pageContainer} />}>
      <HubContent />
    </Suspense>
  );
}
