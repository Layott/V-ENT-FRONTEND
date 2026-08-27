'use client';

import { appLocale } from '@/lib/appLocale';
import { apiMessage } from '@/lib/apiMessage';
import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CiSearch } from 'react-icons/ci';
import { TiArrowSortedDown } from 'react-icons/ti';
import { LuTrophy, LuCalendar, LuUsers, LuRadio, LuTriangleAlert } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { ventFetch, API, tokenFrom, toTournamentArray, entryFeeVc, tournamentStatus, ApiError } from '@/components/tournament-lib/tournamentApi';
import styles from './tournament.module.css';
import useGames from '@/hooks/useGames';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const STATUS_TABS = [{
  id: 'featured',
  label: 'Featured'
}, {
  id: 'upcoming',
  label: 'Upcoming'
}, {
  id: 'live',
  label: 'Live'
}, {
  id: 'completed',
  label: 'Completed'
}, {
  id: 'by_game',
  label: 'By Game'
}];
const FORMATS = ['All Formats', 'single_elimination', 'double_elimination', 'round_robin'];
const ENTRY_TYPES = ['All Entries', 'free', 'paid'];

// Status values are tolerant of both the mock shape (`upcoming` / `in_progress`
// / `completed`) and the real M1 contract (`registration_open` / `published` /
// `ongoing` / `live` / `completed`).
const UPCOMING_STATUSES = ['upcoming', 'registration_open', 'published'];
const LIVE_STATUSES = ['ongoing', 'live', 'in_progress'];
const COMPLETED_STATUSES = ['completed'];
const STATUS_LABELS = {
  upcoming: 'Upcoming',
  registration_open: 'Registration Open',
  published: 'Upcoming',
  ongoing: 'Live',
  live: 'Live',
  in_progress: 'Live',
  completed: 'Completed'
};
const STATUS_BADGE_CLASS = {
  upcoming: 'status_upcoming',
  registration_open: 'status_upcoming',
  published: 'status_upcoming',
  ongoing: 'status_in_progress',
  live: 'status_in_progress',
  in_progress: 'status_in_progress',
  completed: 'status_completed'
};

// Best-effort mapping from a tab id to a single backend `status` value. Some
// tabs (upcoming/live) actually correspond to several possible status strings
// - the client-side filter below is what's authoritative, this is only used
// to narrow the SEARCH request server-side when possible.
const TAB_STATUS_HINT = {
  upcoming: 'upcoming',
  live: 'in_progress',
  completed: 'completed'
};
const formatDate = d => d ? new Date(d).toLocaleDateString(appLocale(), {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
}) : '-';
const formatDateRange = (s, e) => `${formatDate(s)} - ${formatDate(e)}`;
// The API has historically returned hyphens, underscores or title case for the
// same format, so normalise before labelling.
const formatLabel = f => {
  const slug = String(f || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  return {
    single_elimination: 'Single Elim',
    double_elimination: 'Double Elim',
    round_robin: 'Round Robin',
    swiss: 'Swiss'
  }[slug] || (f ? String(f).replace(/[_-]+/g, ' ').replace(/\w/g, c => c.toUpperCase()) : '-');
};
const TournamentsContent = () => {
  const tx = useTx();
  const tt = useT();
  const {
    gameTitles
  } = useGames();
  const gameOptions = ['All Games', ...gameTitles];
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: session
  } = useSession();
  const token = tokenFrom(session);

  // ── State driven by URL ──
  const [tab, setTab] = useState(searchParams.get('tab') || 'featured');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [game, setGame] = useState(searchParams.get('game') || 'All Games');
  const [format, setFormat] = useState(searchParams.get('format') || 'All Formats');
  const [entryType, setEntryType] = useState(searchParams.get('entry') || 'All Entries');
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '');
  const [prizeMin, setPrizeMin] = useState(searchParams.get('pmin') || '');
  const [prizeMax, setPrizeMax] = useState(searchParams.get('pmax') || '');

  // ── Data state ──
  const [tournaments, setTournaments] = useState([]);
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

  // Debounce the free-text search so we don't hammer the SEARCH endpoint on
  // every keystroke. Filter dropdowns/date/prize fields fetch immediately.
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  // Persist filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== 'featured') params.set('tab', tab);
    if (search) params.set('q', search);
    if (game !== 'All Games') params.set('game', game);
    if (format !== 'All Formats') params.set('format', format);
    if (entryType !== 'All Entries') params.set('entry', entryType);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    if (prizeMin) params.set('pmin', prizeMin);
    if (prizeMax) params.set('pmax', prizeMax);
    const qs = params.toString();
    router.replace(`/tournaments${qs ? `?${qs}` : ''}`, {
      scroll: false
    });
  }, [tab, search, game, format, entryType, dateFrom, dateTo, prizeMin, prizeMax, router]);

  // ── Fetch tournaments ──
  // Plain listing (no search text, no active filter) -> LIST endpoint.
  // Any search text or active filter -> SEARCH endpoint with a query string.
  // Tab is intentionally NOT a dependency here: switching tabs only re-slices
  // the already-fetched data client-side (see `filtered` below), it never
  // triggers a new network call on its own.
  useEffect(() => {
    const hasActiveFilter = Boolean(debouncedSearch.trim() || game !== 'All Games' || format !== 'All Formats' || entryType !== 'All Entries' || dateFrom || dateTo || prizeMin || prizeMax);
    const controller = new AbortController();
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let data;
        if (!hasActiveFilter) {
          data = await ventFetch(API.TOURNAMENT.LIST, {
            token,
            signal: controller.signal
          });
        } else {
          const qp = new URLSearchParams();
          if (debouncedSearch.trim()) qp.set('q', debouncedSearch.trim());
          if (game !== 'All Games') {
            qp.set('game', game);
            qp.set('game_id', game);
          }
          if (format !== 'All Formats') qp.set('format', format);
          if (entryType !== 'All Entries') qp.set('entry', entryType);
          if (dateFrom) qp.set('from', dateFrom);
          if (dateTo) qp.set('to', dateTo);
          if (prizeMin) qp.set('pmin', prizeMin);
          if (prizeMax) qp.set('pmax', prizeMax);
          if (TAB_STATUS_HINT[tab]) qp.set('status', TAB_STATUS_HINT[tab]);
          if (tab && tab !== 'featured') qp.set('tab', tab);
          const qs = qp.toString();
          data = await ventFetch(`${API.TOURNAMENT.SEARCH}?${qs}`, {
            token,
            signal: controller.signal
          });
        }
        if (cancelled) return;
        setRawData(data);
        setTournaments(toTournamentArray(data));
      } catch (err) {
        if (cancelled || err?.name === 'AbortError') return;
        setError(err instanceof ApiError ? err : new ApiError(apiMessage(tt, err, "api.failedToLoadTournaments", "Failed to load tournaments.")));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, game, format, entryType, dateFrom, dateTo, prizeMin, prizeMax, token, retryKey]);
  const handleRetry = () => setRetryKey(k => k + 1);

  // ── Filter (client-side; mirrors the params sent to SEARCH so the page
  // still narrows correctly even when the backend/mock doesn't) ──
  const filtered = useMemo(() => {
    let list = [...tournaments];
    if (tab === 'upcoming') list = list.filter(t => UPCOMING_STATUSES.includes(tournamentStatus(t)));else if (tab === 'live') list = list.filter(t => LIVE_STATUSES.includes(tournamentStatus(t)));else if (tab === 'completed') list = list.filter(t => COMPLETED_STATUSES.includes(tournamentStatus(t)));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t => (t?.name || '').toLowerCase().includes(q) || (t?.game || '').toLowerCase().includes(q));
    }
    if (game !== 'All Games') list = list.filter(t => t?.game === game);
    if (format !== 'All Formats') {
      const want = String(format).toLowerCase().replace(/[-\s]+/g, '_');
      list = list.filter(t => String(t?.format || '').toLowerCase().replace(/[-\s]+/g, '_') === want);
    }
    if (entryType === 'free') list = list.filter(t => entryFeeVc(t) === 0);
    if (entryType === 'paid') list = list.filter(t => entryFeeVc(t) > 0);
    if (dateFrom) list = list.filter(t => t?.start_date && new Date(t.start_date) >= new Date(dateFrom));
    if (dateTo) list = list.filter(t => t?.start_date && new Date(t.start_date) <= new Date(dateTo));
    if (prizeMin) list = list.filter(t => Number(t?.prize_pool || 0) >= parseInt(prizeMin, 10));
    if (prizeMax) list = list.filter(t => Number(t?.prize_pool || 0) <= parseInt(prizeMax, 10));
    return list;
  }, [tournaments, tab, search, game, format, entryType, dateFrom, dateTo, prizeMin, prizeMax]);

  // Group by game when "By Game" tab selected
  const grouped = useMemo(() => {
    if (tab !== 'by_game') return null;
    const map = {};
    filtered.forEach(t => {
      const g = t?.game || 'Unknown Game';
      (map[g] = map[g] || []).push(t);
    });
    return map;
  }, [filtered, tab]);

  // Featured: prefer the backend's curated `data.featured` list, else the
  // first few tournaments from whatever we fetched.
  const featured = useMemo(() => {
    if (rawData && Array.isArray(rawData.featured) && rawData.featured.length > 0) {
      return rawData.featured;
    }
    return tournaments.slice(0, 3);
  }, [rawData, tournaments]);
  const isFeaturedTab = tab === 'featured';
  const clearFilters = () => {
    setSearch('');
    setGame('All Games');
    setFormat('All Formats');
    setEntryType('All Entries');
    setDateFrom('');
    setDateTo('');
    setPrizeMin('');
    setPrizeMax('');
  };
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Page header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>{tt("ui.tournaments.fee2", "Tournaments")}</h1>
              <p className={styles.pageSubtitle}>{tt("ui.compete.climb.cash.out.a183", "Compete. Climb. Cash out in VENT COINS.")}</p>
            </div>
            <div className={styles.pageActions}>
              <Link href="/tournaments/my-tournaments">
                <button className={styles.secondaryBtn}>{tt("ui.my.tournaments.3780", "My Tournaments")}</button>
              </Link>
              <Link href="/tournaments/create-tournament">
                <button className={`${styles.primaryBtn} goldBTN`}>{tt("ui.create.tournament.23d0", "+ Create Tournament")}</button>
              </Link>
            </div>
          </div>

          {/* Featured carousel */}
          {isFeaturedTab && !loading && !error && featured.length > 0 && <div className={styles.featuredRow}>
              {featured.map((t, i) => <Link key={t?.id ?? i} href={`/tournaments/${t?.slug || t?.id || ''}`} className={styles.featuredCard}>
                  <div className={styles.featuredBanner} style={t?.banner_image || t?.banner ? {
              backgroundImage: `url(${t.banner_image || t.banner})`
            } : undefined}>
                    <span className={styles.featuredPill}>{tt("ui.featured.c005", "FEATURED")}</span>
                    <div className={styles.featuredOverlay}>
                      <span className={styles.gameTag}>{t?.game || tx("Unknown Game")}</span>
                      <h2 className={styles.featuredTitle}>{t?.name || tx("Untitled Tournament")}</h2>
                      <div className={styles.featuredMeta}>
                        <span><LuTrophy /> {Number(t?.prize_pool || 0).toLocaleString()} VC</span>
                        <span><LuCalendar /> {formatDate(t?.start_date)}</span>
                        <span><LuUsers /> {t?.current_participants ?? 0}/{t?.max_participants ?? 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>)}
            </div>}

          {/* Tab nav */}
          <div className={styles.tabBar}>
            {STATUS_TABS.map(t => <button key={t.id} className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`} onClick={() => setTab(t.id)}>
                {tx(t.label)}
              </button>)}
          </div>

          {/* Filter bar */}
          <div className={styles.filterBar}>
            <div className={styles.searchBar}>
              <CiSearch className={styles.searchIcon} />
              <input type="text" placeholder={tt("ui.search.tournaments.5b1b", "Search tournaments...")} className={styles.searchInput} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className={styles.filterSelect}>
              <select value={game} onChange={e => setGame(e.target.value)} className={styles.select}>
                {gameOptions.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <TiArrowSortedDown className={styles.selectCaret} />
            </div>
            <div className={styles.filterSelect}>
              <select value={format} onChange={e => setFormat(e.target.value)} className={styles.select}>
                {FORMATS.map(f => <option key={f} value={f}>{f === 'All Formats' ? f : formatLabel(f)}</option>)}
              </select>
              <TiArrowSortedDown className={styles.selectCaret} />
            </div>
            <div className={styles.filterSelect}>
              <select value={entryType} onChange={e => setEntryType(e.target.value)} className={styles.select}>
                {ENTRY_TYPES.map(e => <option key={e} value={e}>{e === 'All Entries' ? e : e === 'free' ? tx("Free Entry") : tx("Paid Entry")}</option>)}
              </select>
              <TiArrowSortedDown className={styles.selectCaret} />
            </div>
            <div className={styles.dateRange}>
              <input type="date" className={styles.dateInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <span className={styles.dateSep}>-</span>
              <input type="date" className={styles.dateInput} value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className={styles.prizeRange}>
              <input type="number" placeholder={tt("ui.min.vc.cd35", "Min VC")} className={styles.prizeInput} value={prizeMin} onChange={e => setPrizeMin(e.target.value)} />
              <span className={styles.dateSep}>-</span>
              <input type="number" placeholder={tt("ui.max.vc.c5b8", "Max VC")} className={styles.prizeInput} value={prizeMax} onChange={e => setPrizeMax(e.target.value)} />
            </div>
            <button className={styles.clearBtn} onClick={clearFilters}>{tt("ui.clear.719e", "Clear")}</button>
          </div>

          {/* Result count */}
          <p className={styles.resultCount}>
            {loading ? tx("Loading tournaments…") : `${filtered.length} tournament${filtered.length !== 1 ? 's' : ''} found`}
          </p>

          {/* Loading / error / empty / grid */}
          {loading ? <TournamentSkeletonGrid /> : error ? <div className={styles.inlineErrorCard}>
              <LuTriangleAlert className={styles.inlineErrorIcon} />
              <p className={styles.inlineErrorTitle}>{tt("ui.couldn't.load.tournaments.fd5f", "Couldn't load tournaments")}</p>
              <p className={styles.inlineErrorSub}>{error.message || tx("Something went wrong. Please try again.")}</p>
              <button className={`${styles.primaryBtn} goldBTN`} onClick={handleRetry}>{tt("ui.retry.9f5c", "Retry")}</button>
            </div> : filtered.length === 0 ? <div className={styles.emptyState}>
              <LuTrophy className={styles.emptyIcon} />
              <p className={styles.emptyTitle}>{tt("ui.no.tournaments.match.filters.b99b", "No tournaments match your filters")}</p>
              <p className={styles.emptySub}>{tt("ui.try.clearing.some.filters.833a", "Try clearing some filters or check back later.")}</p>
              <button className={`${styles.primaryBtn} goldBTN`} onClick={clearFilters}>{tt("ui.clear.filters.381c", "Clear Filters")}</button>
            </div> : tab === 'by_game' && grouped ? Object.entries(grouped).map(([gameName, list]) => <div key={gameName} className={styles.gameGroup}>
                <h2 className={styles.gameGroupTitle}>{gameName}<span className={styles.gameGroupCount}>{list.length}</span></h2>
                <div className={styles.cardGrid}>
                  {list.map((t, i) => <TournamentCard key={t?.id ?? i} t={t} />)}
                </div>
              </div>) : <div className={styles.cardGrid}>
              {filtered.map((t, i) => <TournamentCard key={t?.id ?? i} t={t} />)}
            </div>}
        </div>
      </main>

      <BottomMenu />
    </div>;
};
const TournamentSkeletonGrid = () => <div className={styles.cardGrid} aria-hidden="true">
    {Array.from({
    length: 8
  }).map((_, i) => <div key={i} className={styles.skeletonCard}>
        <div className={styles.skeletonBanner} />
        <div className={styles.skeletonBody}>
          <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
          <div className={styles.skeletonLine} />
          <div className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
        </div>
      </div>)}
  </div>;
const TournamentCard = ({
  t
}) => {
  const tx = useTx();
  const tt = useT();
  const status = tournamentStatus(t);
  const statusLabel = STATUS_LABELS[status] || (status && status !== 'unknown' ? status : 'Upcoming');
  const badgeClass = styles[STATUS_BADGE_CLASS[status]] || styles.status_upcoming;
  const isLive = LIVE_STATUSES.includes(status);
  const banner = t?.banner_image || t?.banner || '';
  const fee = entryFeeVc(t);
  const prize = Number(t?.prize_pool || 0);
  const current = t?.current_participants ?? 0;
  const max = t?.max_participants ?? 0;
  return <Link href={`/tournaments/${t?.slug || t?.id || ''}`} className={styles.tCard}>
      <div className={styles.tCardBanner} style={banner ? {
      backgroundImage: `url(${banner})`
    } : undefined}>
        <span className={`${styles.statusBadge} ${badgeClass}`}>
          {isLive && <LuRadio className={styles.liveDot} />} {statusLabel}
        </span>
        {fee === 0 && <span className={styles.freeBadge}>{tt("ui.free.entry.2e48", "FREE ENTRY")}</span>}
      </div>
      <div className={styles.tCardBody}>
        <span className={styles.gameTag}>{t?.game || tx("Unknown Game")}</span>
        <h2 className={styles.tCardTitle}>{t?.name || tx("Untitled Tournament")}</h2>
        <div className={styles.tCardMeta}>
          <div className={styles.metaRow}>
            <LuTrophy className={styles.metaIcon} />
            <span className={styles.metaPrize}>{prize.toLocaleString()} VC</span>
          </div>
          <div className={styles.metaRow}>
            <LuCalendar className={styles.metaIcon} />
            <span>{formatDateRange(t?.start_date, t?.end_date)}</span>
          </div>
          <div className={styles.metaRow}>
            <LuUsers className={styles.metaIcon} />
            <span>{current}/{max} {t?.participant_type === 'team' ? 'teams' : 'players'}</span>
          </div>
        </div>
        <div className={styles.tCardFooter}>
          <span className={styles.formatTag}>{formatLabel(t?.format)}</span>
          {fee > 0 ? <span className={styles.entryFee}>{fee.toLocaleString()} {tt("ui.vc.entry.454e", "VC entry")}</span> : <span className={styles.entryFreeText}>{tt("ui.free.75f5", "Free")}</span>}
        </div>
      </div>
    </Link>;
};
const Tournaments = () => <Suspense fallback={<div style={{
  minHeight: '100vh',
  backgroundColor: '#131316'
}} />}>
    <TournamentsContent />
  </Suspense>;
export default Tournaments;