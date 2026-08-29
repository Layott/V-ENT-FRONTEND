'use client';

import { appLocale } from '@/lib/appLocale';
import FounderBadge from '@/components/founder-badge/FounderBadge';
import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect, useMemo, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { CiSearch } from 'react-icons/ci';
import { TiArrowSortedDown } from 'react-icons/ti';
import { MdOutlineClose, MdOutlineFilterList, MdOutlineLocationOn, MdOutlineEvent, MdBusiness } from 'react-icons/md';
import { LuGamepad2, LuTrophy, LuCalendar, LuUsers } from 'react-icons/lu';
import { FaUsers, FaUserCircle, FaStar, FaRegCommentAlt, FaTv, FaShoppingBag, FaHistory } from 'react-icons/fa';
import { RiShoppingCart2Line } from 'react-icons/ri';
import { FiBookOpen, FiPlayCircle } from 'react-icons/fi';
import { HiOutlineUserGroup } from 'react-icons/hi2';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './search.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
import UserChip from '@/components/user-chip/UserChip';

// Categories whose backend does not exist yet. Their tabs stay visible (so the
// roadmap is honest) but they report "not available yet" instead of results.
const UNAVAILABLE_TABS = new Set(['listings', 'products', 'threads', 'clubs', 'manga', 'amvs', 'organizations']);

// ── Tab definitions ──────────────────────────────────────────────────────
const TABS = [{
  id: 'all',
  label: 'All',
  icon: <CiSearch />
}, {
  id: 'tournaments',
  label: 'Tournaments',
  icon: <LuGamepad2 />
}, {
  id: 'events',
  label: 'Events',
  icon: <MdOutlineEvent />
}, {
  id: 'teams',
  label: 'Teams',
  icon: <FaUsers />
}, {
  id: 'users',
  label: 'Users',
  icon: <FaUserCircle />
}, {
  id: 'listings',
  label: 'Listings',
  icon: <RiShoppingCart2Line />
}, {
  id: 'products',
  label: 'Products',
  icon: <FaShoppingBag />
}, {
  id: 'threads',
  label: 'Threads',
  icon: <FaRegCommentAlt />
}, {
  id: 'clubs',
  label: 'Clubs',
  icon: <HiOutlineUserGroup />
}, {
  id: 'manga',
  label: 'Manga',
  icon: <FiBookOpen />
}, {
  id: 'amvs',
  label: 'AMVs',
  icon: <FiPlayCircle />
}, {
  id: 'organizations',
  label: 'Organizations',
  icon: <MdBusiness />
}];
const POPULAR_TAGS = ['FIFA', 'PUBG', 'Anime', 'Tournament', 'Lagos'];
const RECENT_KEY = 'vent_recent_searches';
const RECENT_MAX = 8;
const ALL_PREVIEW_LIMIT = 4;

// ── Helpers ──────────────────────────────────────────────────────────────
const fmtDate = iso => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(appLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '';
  }
};
const fmtFormat = f => ({
  single_elimination: 'Single Elim',
  double_elimination: 'Double Elim',
  round_robin: 'Round Robin'
})[f] || f || '';
const matches = (haystack, needle) => {
  if (!haystack || !needle) return false;
  return String(haystack).toLowerCase().includes(needle);
};
const API = process.env.NEXT_PUBLIC_API_URL;

// Live search sources. Tournaments, events, teams and users have real
// endpoints; everything else is still unbuilt (see UNAVAILABLE_TABS).
const fetchJson = async (path, signal) => {
  const res = await fetch(`${API}${path}`, {
    signal
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const body = await res.json();
  return body?.data ?? body;
};

// The teams endpoint returns cards keyed slightly differently from the search
// UI's expectations; normalise once here rather than at every render site.
const normaliseTeam = t => ({
  ...t,
  id: t.id ?? t.team_id,
  name: t.name ?? t.team_name,
  bio: t.bio ?? t.description ?? '',
  game: t.game ?? t.core_game,
  is_accepting_members: t.open_to_join ?? t.is_accepting_members ?? false
});

// entry_fee is the label ("Paid"/"Free"); the amount lives in entry_fee_vc.
const feeVc = t => Number(t?.entry_fee_vc ?? t?.entry_fee_price ?? 0) || 0;
const normaliseUser = p => ({
  id: p.id,
  username: p.username || p.name,
  full_name: p.name,
  avatar: p.avatar,
  region: p.region,
  country: p.country,
  favorite_game: p.favorite_game,
  points: p.points,
  rank: p.rank,
  wins: p.wins,
  is_session_user: !!p.is_session_user
});

// ── Per-entity filter functions ──────────────────────────────────────────
const filterByQuery = (list, q, fields) => {
  if (!q) return list;
  const needle = q.toLowerCase();
  return list.filter(item => fields.some(f => matches(item[f], needle)));
};

// ── Main component ──────────────────────────────────────────────────────
const SearchPageInner = () => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Core state ──
  const initialQuery = searchParams.get('q') || '';
  const initialTab = TABS.some(t => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'all';
  const [query, setQuery] = useState(initialQuery); // committed query (drives results)
  const [inputValue, setInputValue] = useState(initialQuery); // raw input
  const [tab, setTab] = useState(initialTab);
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile filter drawer
  const [recentSearches, setRecentSearches] = useState([]);

  // ── Per-tab filter state ──
  const [tournamentGame, setTournamentGame] = useState(searchParams.get('tgame') || '');
  const [tournamentFormat, setTournamentFormat] = useState(searchParams.get('tformat') || '');
  const [tournamentStatus, setTournamentStatus] = useState(searchParams.get('tstatus') || '');
  const [eventType, setEventType] = useState(searchParams.get('etype') || '');
  const [eventStatus, setEventStatus] = useState(searchParams.get('estatus') || '');
  const [teamGame, setTeamGame] = useState(searchParams.get('teamgame') || '');
  const [teamOpen, setTeamOpen] = useState(searchParams.get('teamopen') || '');
  const [userGame, setUserGame] = useState(searchParams.get('ugame') || '');
  const [userRegion, setUserRegion] = useState(searchParams.get('uregion') || '');
  const [listingCategory, setListingCategory] = useState(searchParams.get('lcat') || '');
  const [listingCondition, setListingCondition] = useState(searchParams.get('lcond') || '');
  const [listingPriceMax, setListingPriceMax] = useState(searchParams.get('lmax') || '');
  const [productCategory, setProductCategory] = useState(searchParams.get('pcat') || '');
  const [productPriceMax, setProductPriceMax] = useState(searchParams.get('pmax') || '');
  const [threadCategory, setThreadCategory] = useState(searchParams.get('tcat') || '');
  const [clubGame, setClubGame] = useState(searchParams.get('cgame') || '');
  const [mangaStatus, setMangaStatus] = useState(searchParams.get('mstatus') || '');
  const [mangaGenre, setMangaGenre] = useState(searchParams.get('mgenre') || '');
  const [amvFeatured, setAmvFeatured] = useState(searchParams.get('afeat') === 'true');
  const [orgRegion, setOrgRegion] = useState(searchParams.get('oregion') || '');
  const [orgVerified, setOrgVerified] = useState(searchParams.get('overified') === 'true');

  // ── Load recent searches from localStorage ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecentSearches(parsed.slice(0, RECENT_MAX));
      }
    } catch {
      // ignore
    }
  }, []);
  const saveRecent = useCallback(q => {
    if (!q || !q.trim()) return;
    const trimmed = q.trim();
    setRecentSearches(prev => {
      const next = [trimmed, ...prev.filter(r => r.toLowerCase() !== trimmed.toLowerCase())].slice(0, RECENT_MAX);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);
  const clearRecent = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // ignore
    }
  }, []);

  // ── Debounce input → committed query ──
  useEffect(() => {
    const handle = setTimeout(() => {
      setQuery(inputValue.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [inputValue]);

  // ── Persist q + tab + filters to URL ──
  useEffect(() => {
    const p = new URLSearchParams();
    if (query) p.set('q', query);
    if (tab !== 'all') p.set('tab', tab);
    if (tournamentGame) p.set('tgame', tournamentGame);
    if (tournamentFormat) p.set('tformat', tournamentFormat);
    if (tournamentStatus) p.set('tstatus', tournamentStatus);
    if (eventType) p.set('etype', eventType);
    if (eventStatus) p.set('estatus', eventStatus);
    if (teamGame) p.set('teamgame', teamGame);
    if (teamOpen) p.set('teamopen', teamOpen);
    if (userGame) p.set('ugame', userGame);
    if (userRegion) p.set('uregion', userRegion);
    if (listingCategory) p.set('lcat', listingCategory);
    if (listingCondition) p.set('lcond', listingCondition);
    if (listingPriceMax) p.set('lmax', listingPriceMax);
    if (productCategory) p.set('pcat', productCategory);
    if (productPriceMax) p.set('pmax', productPriceMax);
    if (threadCategory) p.set('tcat', threadCategory);
    if (clubGame) p.set('cgame', clubGame);
    if (mangaStatus) p.set('mstatus', mangaStatus);
    if (mangaGenre) p.set('mgenre', mangaGenre);
    if (amvFeatured) p.set('afeat', 'true');
    if (orgRegion) p.set('oregion', orgRegion);
    if (orgVerified) p.set('overified', 'true');
    const qs = p.toString();
    router.replace(qs ? `/search?${qs}` : '/search', {
      scroll: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, tab, tournamentGame, tournamentFormat, tournamentStatus, eventType, eventStatus, teamGame, teamOpen, userGame, userRegion, listingCategory, listingCondition, listingPriceMax, productCategory, productPriceMax, threadCategory, clubGame, mangaStatus, mangaGenre, amvFeatured, orgRegion, orgVerified]);

  // Save query to recents when it commits via the debounce.
  useEffect(() => {
    if (query) saveRecent(query);
  }, [query, saveRecent]);

  // ── Live data ──
  const [liveTournaments, setLiveTournaments] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [liveTeams, setLiveTeams] = useState([]);
  const [liveUsers, setLiveUsers] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [gameNames, setGameNames] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const body = await fetchJson('/auth/games/', controller.signal);
        setGameNames((body?.games || []).map(g => g.name));
      } catch {
        setGameNames([]);
      }
    })();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const {
      signal
    } = controller;
    let cancelled = false;
    (async () => {
      setDataLoading(true);
      const q = query ? `?q=${encodeURIComponent(query)}` : '';
      const search = query ? `?search=${encodeURIComponent(query)}` : '';
      const [tournaments, events, teams, rankings] = await Promise.all([fetchJson(`/tournament/search-tournament/${q}`, signal).catch(() => []), fetchJson('/event/get-all-events/', signal).catch(() => []), fetchJson(`/team/get-all-teams/${search}`, signal).catch(() => []), fetchJson(`/ranking/${search}`, signal).catch(() => ({}))]);
      if (cancelled) return;
      setLiveTournaments(Array.isArray(tournaments) ? tournaments : tournaments?.tournaments || []);
      setLiveEvents(Array.isArray(events) ? events : events?.events || []);
      setLiveTeams((Array.isArray(teams) ? teams : teams?.teams || []).map(normaliseTeam));
      setLiveUsers((rankings?.players || []).map(normaliseUser));
      setDataLoading(false);
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [query]);

  // ── Filtered datasets per category ──
  const tournamentResults = useMemo(() => {
    let list = filterByQuery(liveTournaments, query, ['name', 'game', 'format', 'status', 'description']);
    if (tournamentGame) list = list.filter(t => t.game === tournamentGame);
    if (tournamentFormat) list = list.filter(t => t.format === tournamentFormat);
    if (tournamentStatus) list = list.filter(t => t.status === tournamentStatus);
    return list;
  }, [liveTournaments, query, tournamentGame, tournamentFormat, tournamentStatus]);
  const eventResults = useMemo(() => {
    let list = filterByQuery(liveEvents, query, ['name', 'location', 'event_type', 'status', 'description']);
    if (eventType) list = list.filter(e => e.event_type === eventType);
    if (eventStatus) list = list.filter(e => e.status === eventStatus);
    return list;
  }, [liveEvents, query, eventType, eventStatus]);
  const teamResults = useMemo(() => {
    let list = filterByQuery(liveTeams, query, ['name', 'tag', 'game', 'bio']);
    if (teamGame) list = list.filter(t => t.game === teamGame);
    if (teamOpen === 'open') list = list.filter(t => t.is_accepting_members);
    if (teamOpen === 'closed') list = list.filter(t => !t.is_accepting_members);
    return list;
  }, [liveTeams, query, teamGame, teamOpen]);
  const userResults = useMemo(() => {
    let list = filterByQuery(liveUsers, query, ['username', 'full_name', 'country', 'region', 'favorite_game']);
    if (userGame) list = list.filter(u => u.favorite_game === userGame);
    if (userRegion) list = list.filter(u => u.region === userRegion);
    return list;
  }, [liveUsers, query, userGame, userRegion]);
  const listingResults = useMemo(() => {
    let list = filterByQuery([], query, ['title', 'description', 'category', 'location']);
    if (listingCategory) list = list.filter(l => l.category === listingCategory);
    if (listingCondition) list = list.filter(l => l.condition === listingCondition);
    if (listingPriceMax) list = list.filter(l => l.price_vc <= Number(listingPriceMax));
    return list;
  }, [query, listingCategory, listingCondition, listingPriceMax]);
  const productResults = useMemo(() => {
    let list = filterByQuery([], query, ['name', 'description', 'category']);
    if (productCategory) list = list.filter(p => p.category === productCategory);
    if (productPriceMax) list = list.filter(p => p.price_vent_coins <= Number(productPriceMax));
    return list;
  }, [query, productCategory, productPriceMax]);
  const threadResults = useMemo(() => {
    let list = filterByQuery([], query, ['title', 'category', 'body']);
    if (threadCategory) list = list.filter(t => t.category === threadCategory);
    return list;
  }, [query, threadCategory]);
  const clubResults = useMemo(() => {
    let list = filterByQuery([], query, ['name', 'game', 'description']);
    if (clubGame) list = list.filter(c => c.game === clubGame);
    return list;
  }, [query, clubGame]);
  const mangaResults = useMemo(() => {
    let list = filterByQuery([], query, ['title', 'description', 'author', 'artist', '_genre_str']);
    if (mangaStatus) list = list.filter(m => m.status === mangaStatus);
    if (mangaGenre) list = list.filter(m => (m.genres || []).includes(mangaGenre));
    return list;
  }, [query, mangaStatus, mangaGenre]);
  const amvResults = useMemo(() => {
    let list = filterByQuery([], query, ['title', 'description', 'anime_referenced', 'song_used', '_tags_str', '_uploader']);
    if (amvFeatured) list = list.filter(a => a.featured);
    return list;
  }, [query, amvFeatured]);
  const orgResults = useMemo(() => {
    let list = filterByQuery([], query, ['name', 'tag', 'bio', 'description', 'region']);
    if (orgRegion) list = list.filter(o => o.region === orgRegion);
    if (orgVerified) list = list.filter(o => o.verified);
    return list;
  }, [query, orgRegion, orgVerified]);

  // ── Counts (drive tab badges) ──
  const counts = useMemo(() => ({
    tournaments: tournamentResults.length,
    events: eventResults.length,
    teams: teamResults.length,
    users: userResults.length,
    listings: listingResults.length,
    products: productResults.length,
    threads: threadResults.length,
    clubs: clubResults.length,
    manga: mangaResults.length,
    amvs: amvResults.length,
    organizations: orgResults.length
  }), [tournamentResults, eventResults, teamResults, userResults, listingResults, productResults, threadResults, clubResults, mangaResults, amvResults, orgResults]);
  const totalCount = useMemo(() => Object.values(counts).reduce((s, n) => s + n, 0), [counts]);

  // ── Handlers ──
  const handleSubmit = e => {
    e.preventDefault();
    setQuery(inputValue.trim());
  };
  const handleClear = () => {
    setInputValue('');
    setQuery('');
  };
  const handleSuggestion = term => {
    setInputValue(term);
    setQuery(term);
  };
  const handleRecent = term => {
    setInputValue(term);
    setQuery(term);
  };
  const switchTab = next => {
    setTab(next);
    setFiltersOpen(false);
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };
  const clearTabFilters = () => {
    if (tab === 'tournaments') {
      setTournamentGame('');
      setTournamentFormat('');
      setTournamentStatus('');
    } else if (tab === 'events') {
      setEventType('');
      setEventStatus('');
    } else if (tab === 'teams') {
      setTeamGame('');
      setTeamOpen('');
    } else if (tab === 'users') {
      setUserGame('');
      setUserRegion('');
    } else if (tab === 'listings') {
      setListingCategory('');
      setListingCondition('');
      setListingPriceMax('');
    } else if (tab === 'products') {
      setProductCategory('');
      setProductPriceMax('');
    } else if (tab === 'threads') {
      setThreadCategory('');
    } else if (tab === 'clubs') {
      setClubGame('');
    } else if (tab === 'manga') {
      setMangaStatus('');
      setMangaGenre('');
    } else if (tab === 'amvs') {
      setAmvFeatured(false);
    } else if (tab === 'organizations') {
      setOrgRegion('');
      setOrgVerified(false);
    }
  };

  // Listings, products, threads, clubs, manga, AMVs and organizations have no
  // backend yet - say so plainly rather than showing an empty result set that
  // reads as "nothing matched your search".
  const showUnavailable = UNAVAILABLE_TABS.has(tab);
  const showEmpty = !query && !showUnavailable;
  const showNoResults = !showUnavailable && query && totalCount === 0;

  // ── Per-tab filter blocks ──
  const renderTabFilters = () => {
    if (tab === 'all') {
      return <div className={styles.filtersHelp}>
          <p className={styles.filtersHelpTitle}>{tt("ui.refine.search.2f87", "Refine your search")}</p>
          <p className={styles.filtersHelpBody}>
            {tt("ui.pick.category.tab.apply.0974", "Pick a category tab to apply filters specific to that result type.")}
          </p>
        </div>;
    }
    if (tab === 'tournaments') {
      return <>
          <FilterGroup label={tt("ui.game.e3e8", "Game")}>
            <Select value={tournamentGame} onChange={setTournamentGame}>
              <option value="">{tt("ui.all.games.f0ae", "All games")}</option>
              {gameNames.map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          </FilterGroup>
          <FilterGroup label={tt("ui.format.041a", "Format")}>
            <Select value={tournamentFormat} onChange={setTournamentFormat}>
              <option value="">{tt("ui.all.formats.6394", "All formats")}</option>
              <option value="single_elimination">{tt("ui.single.elim.6083", "Single Elim")}</option>
              <option value="double_elimination">{tt("ui.double.elim.89ab", "Double Elim")}</option>
              <option value="round_robin">{tt("ui.round.robin.b15b", "Round Robin")}</option>
            </Select>
          </FilterGroup>
          <FilterGroup label={tt("ui.status.bae7", "Status")}>
            <Select value={tournamentStatus} onChange={setTournamentStatus}>
              <option value="">{tt("ui.all.statuses.6405", "All statuses")}</option>
              <option value="upcoming">{tt("ui.upcoming.523b", "Upcoming")}</option>
              <option value="in_progress">{tt("ui.live.65c8", "Live")}</option>
              <option value="completed">{tt("ui.completed.1798", "Completed")}</option>
            </Select>
          </FilterGroup>
        </>;
    }
    if (tab === 'events') {
      return <>
          <FilterGroup label={tt("ui.type.3deb", "Type")}>
            <Select value={eventType} onChange={setEventType}>
              <option value="">{tt("ui.all.types.30c8", "All types")}</option>
              <option value="virtual">{tt("ui.virtual.8e7d", "Virtual")}</option>
              <option value="physical">{tt("ui.physical.919b", "Physical")}</option>
              <option value="hybrid">{tt("ui.hybrid.8e01", "Hybrid")}</option>
            </Select>
          </FilterGroup>
          <FilterGroup label={tt("ui.status.bae7", "Status")}>
            <Select value={eventStatus} onChange={setEventStatus}>
              <option value="">{tt("ui.all.statuses.6405", "All statuses")}</option>
              <option value="upcoming">{tt("ui.upcoming.523b", "Upcoming")}</option>
              <option value="in_progress">{tt("ui.live.65c8", "Live")}</option>
              <option value="completed">{tt("ui.completed.1798", "Completed")}</option>
            </Select>
          </FilterGroup>
        </>;
    }
    if (tab === 'teams') {
      return <>
          <FilterGroup label={tt("ui.game.e3e8", "Game")}>
            <Select value={teamGame} onChange={setTeamGame}>
              <option value="">{tt("ui.all.games.f0ae", "All games")}</option>
              {gameNames.map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          </FilterGroup>
          <FilterGroup label={tt("ui.recruitment.baa4", "Recruitment")}>
            <Select value={teamOpen} onChange={setTeamOpen}>
              <option value="">{tt("ui.any.3224", "Any")}</option>
              <option value="open">{tt("ui.open.join.f8e3", "Open to join")}</option>
              <option value="closed">{tt("ui.closed.88d8", "Closed")}</option>
            </Select>
          </FilterGroup>
        </>;
    }
    if (tab === 'users') {
      return <>
          <FilterGroup label={tt("ui.favourite.game.b0c0", "Favourite game")}>
            <Select value={userGame} onChange={setUserGame}>
              <option value="">{tt("ui.any.game.c080", "Any game")}</option>
              {gameNames.map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          </FilterGroup>
          <FilterGroup label={tt("ui.region.0f21", "Region")}>
            <Select value={userRegion} onChange={setUserRegion}>
              <option value="">{tt("ui.any.region.880d", "Any region")}</option>
              {['West Africa', 'East Africa', 'Southern Africa', 'North Africa', 'Europe', 'North America', 'Asia'].map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </FilterGroup>
        </>;
    }
    if (tab === 'listings') {
      return <>
          <FilterGroup label={tt("ui.category.a3c6", "Category")}>
            <Select value={listingCategory} onChange={setListingCategory}>
              <option value="">{tt("ui.any.category.5f31", "Any category")}</option>
              {['Gaming Hardware', 'Apparel', 'Collectibles', 'Tickets', 'Services', 'Digital'].map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FilterGroup>
          <FilterGroup label={tt("ui.condition.2f49", "Condition")}>
            <Select value={listingCondition} onChange={setListingCondition}>
              <option value="">{tt("ui.any.3224", "Any")}</option>
              <option value="new">{tt("ui.new.6403", "New")}</option>
              <option value="like_new">{tt("ui.like.new.2372", "Like new")}</option>
              <option value="good">{tt("ui.good.61de", "Good")}</option>
              <option value="fair">{tt("ui.fair.64b9", "Fair")}</option>
            </Select>
          </FilterGroup>
          <FilterGroup label={tt("ui.max.price.vc.831a", "Max price (VC)")}>
            <input type="number" className={styles.priceInput} placeholder={tt("ui.no.max.96dd", "No max")} value={listingPriceMax} onChange={e => setListingPriceMax(e.target.value)} />
          </FilterGroup>
        </>;
    }
    if (tab === 'products') {
      return <>
          <FilterGroup label={tt("ui.category.a3c6", "Category")}>
            <Select value={productCategory} onChange={setProductCategory}>
              <option value="">{tt("ui.any.category.5f31", "Any category")}</option>
              {['Apparel', 'Accessories', 'Gaming Gear', 'Anime Merch', 'Digital Goods'].map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FilterGroup>
          <FilterGroup label={tt("ui.max.price.vc.831a", "Max price (VC)")}>
            <input type="number" className={styles.priceInput} placeholder={tt("ui.no.max.96dd", "No max")} value={productPriceMax} onChange={e => setProductPriceMax(e.target.value)} />
          </FilterGroup>
        </>;
    }
    if (tab === 'threads') {
      return <FilterGroup label={tt("ui.category.a3c6", "Category")}>
          <Select value={threadCategory} onChange={setThreadCategory}>
            <option value="">{tt("ui.all.categories.060b", "All categories")}</option>
            {['General', 'Tournaments', 'Anime', 'Marketplace', 'Support'].map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </FilterGroup>;
    }
    if (tab === 'clubs') {
      return <FilterGroup label={tt("ui.game.e3e8", "Game")}>
          <Select value={clubGame} onChange={setClubGame}>
            <option value="">{tt("ui.all.games.f0ae", "All games")}</option>
            {gameNames.map(g => <option key={g} value={g}>{g}</option>)}
          </Select>
        </FilterGroup>;
    }
    if (tab === 'manga') {
      return <>
          <FilterGroup label={tt("ui.status.bae7", "Status")}>
            <Select value={mangaStatus} onChange={setMangaStatus}>
              <option value="">{tt("ui.any.status.5520", "Any status")}</option>
              <option value="ongoing">{tt("ui.ongoing.2e02", "Ongoing")}</option>
              <option value="completed">{tt("ui.completed.1798", "Completed")}</option>
              <option value="hiatus">{tt("ui.hiatus.f6eb", "Hiatus")}</option>
            </Select>
          </FilterGroup>
          <FilterGroup label={tt("ui.genre.2aa3", "Genre")}>
            <Select value={mangaGenre} onChange={setMangaGenre}>
              <option value="">{tt("ui.any.genre.a2ae", "Any genre")}</option>
              {['shonen', 'seinen', 'isekai', 'mecha', 'fantasy', 'historical', 'cyberpunk', 'supernatural', 'ninja', 'romance', 'action', 'adventure', 'drama', 'horror', 'sci-fi', 'samurai', 'mystery', 'comedy', 'sports'].map(g => <option key={g} value={g}>{g}</option>)}
            </Select>
          </FilterGroup>
        </>;
    }
    if (tab === 'amvs') {
      return <FilterGroup label={tt("ui.visibility.7d9f", "Visibility")}>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={amvFeatured} onChange={e => setAmvFeatured(e.target.checked)} />
            <span>{tt("ui.featured.amvs.only.2a3d", "Featured AMVs only")}</span>
          </label>
        </FilterGroup>;
    }
    if (tab === 'organizations') {
      return <>
          <FilterGroup label={tt("ui.region.0f21", "Region")}>
            <Select value={orgRegion} onChange={setOrgRegion}>
              <option value="">{tt("ui.any.region.880d", "Any region")}</option>
              {['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Egypt'].map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </FilterGroup>
          <FilterGroup label={tt("ui.verification.0312", "Verification")}>
            <label className={styles.checkRow}>
              <input type="checkbox" checked={orgVerified} onChange={e => setOrgVerified(e.target.checked)} />
              <span>{tt("ui.verified.orgs.only.b2ec", "Verified orgs only")}</span>
            </label>
          </FilterGroup>
        </>;
    }
    return null;
  };

  // ── Per-section result renderers ──
  const renderSection = (key, title, list, full = false) => {
    if (list.length === 0) return null;
    const items = full ? list : list.slice(0, ALL_PREVIEW_LIMIT);
    return <section className={styles.section} key={key}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            {title}
            <span className={styles.countBadge}>{list.length}</span>
          </h2>
          {!full && list.length > ALL_PREVIEW_LIMIT && <button type="button" className={styles.viewAllLink} onClick={() => switchTab(key)}>
              {tt("ui.view.all.fe48", "View all →")}
            </button>}
        </div>
        <div className={`${styles.cardGrid} ${styles[`grid_${key}`] || ''}`}>
          {items.map(item => renderCard(key, item))}
        </div>
      </section>;
  };
  const renderCard = (kind, item) => {
    if (kind === 'tournaments') return <TournamentCard key={item.id} t={item} />;
    if (kind === 'events') return <EventCard key={item.id} e={item} />;
    if (kind === 'teams') return <TeamCard key={item.id} t={item} />;
    if (kind === 'users') return <UserCard key={item.id} u={item} />;
    if (kind === 'listings') return <ListingCard key={item.id} l={item} />;
    if (kind === 'products') return <ProductCard key={item.id} p={item} />;
    if (kind === 'threads') return <ThreadCard key={item.id} t={item} />;
    if (kind === 'clubs') return <ClubCard key={item.id} c={item} />;
    if (kind === 'manga') return <MangaCard key={item.id} m={item} />;
    if (kind === 'amvs') return <AmvCard key={item.id} a={item} />;
    if (kind === 'organizations') return <OrgCard key={item.id} o={item} />;
    return null;
  };
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Hero / search */}
          <section className={styles.hero}>
            <div className={styles.heroTop}>
              <div className={styles.heroText}>
                <h1 className={styles.heroTitle}>{tt("ui.search.v.ent.6327", "Search V-ENT")}</h1>
                <p className={styles.heroSubtitle}>
                  {tt("ui.find.tournaments.events.teams.f234", "Find tournaments, events, teams, users, marketplace listings, products, threads,\n                  clubs, manga, AMVs and organizations across the platform.")}
                </p>
              </div>
            </div>

            <form className={styles.searchForm} onSubmit={handleSubmit}>
              <CiSearch className={styles.searchIcon} aria-hidden />
              <input type="text" className={styles.searchInput} placeholder={tt("ui.search.anything.across.v.0910", "Search anything across V-ENT…")} value={inputValue} onChange={e => setInputValue(e.target.value)} autoFocus />
              {inputValue && <button type="button" className={styles.clearBtn} onClick={handleClear} aria-label={tt("ui.clear.search.6730", "Clear search")}>
                  <MdOutlineClose />
                </button>}
              <button type="submit" className={styles.submitBtn}>{tt("ui.search.bce0", "Search")}</button>
            </form>

            {query && <p className={styles.summary}>
                <span className={styles.totalCount}>{totalCount}</span>
                {totalCount === 1 ? ' result' : ' results'} for{' '}
                <span className={styles.queryText}>&ldquo;{query}&rdquo;</span>
              </p>}
          </section>

          {/* Tabs row with counts */}
          <div className={styles.tabsRow}>
            {TABS.map(t => {
            const count = t.id === 'all' ? totalCount : counts[t.id];
            return <button key={t.id} type="button" className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`} onClick={() => switchTab(t.id)}>
                  <span className={styles.tabIcon}>{t.icon}</span>
                  <span className={styles.tabLabel}>{tx(t.label)}</span>
                  {query && <span className={styles.tabBadge}>{count}</span>}
                </button>;
          })}
          </div>

          {/* Mobile filter toggle */}
          <button type="button" className={styles.mobileFilterToggle} onClick={() => setFiltersOpen(v => !v)}>
            <MdOutlineFilterList /> {filtersOpen ? tx("Hide filters") : tx("Show filters")}
          </button>

          {/* Layout: filter sidebar + results */}
          <div className={styles.contentLayout}>
            <aside className={`${styles.filterSidebar} ${filtersOpen ? styles.filterSidebarOpen : ''}`}>
              <div className={styles.filterHeader}>
                <h2 className={styles.filterTitle}>{tt("ui.filters.96e5", "Filters")}</h2>
                {tab !== 'all' && <button type="button" className={styles.clearFiltersBtn} onClick={clearTabFilters}>
                    {tt("ui.clear.719e", "Clear")}
                  </button>}
              </div>
              {renderTabFilters()}
            </aside>

            <div className={styles.resultsPane}>
              {showUnavailable && <div className={styles.emptyState}>
                  <CiSearch className={styles.emptyIcon} />
                  <h2 className={styles.emptyTitle}>
                    {TABS.find(t => t.id === tab)?.label} {tt("ui.search.isn.t.live.04f6", "search isn’t live yet")}
                  </h2>
                  <p className={styles.emptyBody}>
                    {tt("ui.this.part.v.ent.1e99", "This part of V-ENT is still being built. Tournaments, events, teams and\n                    players are searchable now.")}
                  </p>
                  <div className={styles.suggestionsRow}>
                    {['tournaments', 'events', 'teams', 'users'].map(id => <button key={id} type="button" className={styles.suggestionPill} onClick={() => setTab(id)}>
                        {TABS.find(t => t.id === id)?.label}
                      </button>)}
                  </div>
                </div>}

              {showEmpty && <div className={styles.emptyState}>
                  <CiSearch className={styles.emptyIcon} />
                  <h2 className={styles.emptyTitle}>{tt("ui.start.searching.v.ent.d641", "Start searching V-ENT")}</h2>
                  <p className={styles.emptyBody}>
                    {tt("ui.type.tournament.event.team.1df8", "Type a tournament, event, team, user, listing, product, thread, club, manga, AMV\n                    or organization name above to begin.")}
                  </p>

                  <div className={styles.suggestionsBlock}>
                    <p className={styles.suggestionsLabel}>{tt("ui.popular.searches.2321", "Popular searches")}</p>
                    <div className={styles.suggestionsRow}>
                      {POPULAR_TAGS.map(tag => <button key={tag} type="button" className={styles.suggestionPill} onClick={() => handleSuggestion(tag)}>
                          {tag}
                        </button>)}
                    </div>
                  </div>

                  {recentSearches.length > 0 && <div className={styles.recentBlock}>
                      <div className={styles.recentHeader}>
                        <p className={styles.suggestionsLabel}>
                          <FaHistory className={styles.recentIcon} /> {tt("ui.recent.searches.a73d", "Recent searches")}
                        </p>
                        <button type="button" className={styles.clearRecentsBtn} onClick={clearRecent}>
                          {tt("ui.clear.719e", "Clear")}
                        </button>
                      </div>
                      <ul className={styles.recentList}>
                        {recentSearches.map(r => <li key={r}>
                            <button type="button" className={styles.recentItem} onClick={() => handleRecent(r)}>
                              <CiSearch className={styles.recentItemIcon} />
                              <span>{r}</span>
                            </button>
                          </li>)}
                      </ul>
                    </div>}
                </div>}

              {showNoResults && <div className={styles.emptyState}>
                  <CiSearch className={styles.emptyIcon} />
                  <h2 className={styles.emptyTitle}>
                    {tt("ui.no.results.2a5f", "No results for “")}{query}&rdquo;
                  </h2>
                  <p className={styles.emptyBody}>{tt("ui.try.one.these.instead.965c", "Try one of these instead:")}</p>
                  <div className={styles.suggestionsRow}>
                    {POPULAR_TAGS.map(tag => <button key={tag} type="button" className={styles.suggestionPill} onClick={() => handleSuggestion(tag)}>
                        {tag}
                      </button>)}
                  </div>
                </div>}

              {!showUnavailable && !showEmpty && !showNoResults && tab === 'all' && <>
                  {renderSection('tournaments', <><LuGamepad2 className={styles.sectionIcon} /> {tt("ui.tournaments.fee2", "Tournaments")}</>, tournamentResults)}
                  {renderSection('events', <><MdOutlineEvent className={styles.sectionIcon} /> {tt("ui.events.c549", "Events")}</>, eventResults)}
                  {renderSection('teams', <><FaUsers className={styles.sectionIcon} /> {tt("ui.teams.cbfd", "Teams")}</>, teamResults)}
                  {renderSection('users', <><FaUserCircle className={styles.sectionIcon} /> {tt("ui.users.57f2", "Users")}</>, userResults)}
                  {/* Listings, products, threads, clubs, manga, AMVs and organizations
                      have no backend yet - omitted from "All" rather than shown empty. */}
                </>}

              {!showUnavailable && !showEmpty && !showNoResults && tab !== 'all' && <section className={styles.section}>
                  <p className={styles.tabResultCount}>
                    {counts[tab]} {counts[tab] === 1 ? 'result' : 'results'}
                  </p>
                  {counts[tab] === 0 ? <div className={styles.tabEmpty}>
                      {tt("ui.no.816c", "No")} {tab} {tt("ui.match.filters.try.adjusting.2733", "match your filters. Try adjusting them or broaden your query.")}
                    </div> : <div className={`${styles.cardGrid} ${styles[`grid_${tab}`] || ''}`}>
                      {tab === 'tournaments' && tournamentResults.map(it => renderCard('tournaments', it))}
                      {tab === 'events' && eventResults.map(it => renderCard('events', it))}
                      {tab === 'teams' && teamResults.map(it => renderCard('teams', it))}
                      {tab === 'users' && userResults.map(it => renderCard('users', it))}
                      {tab === 'listings' && listingResults.map(it => renderCard('listings', it))}
                      {tab === 'products' && productResults.map(it => renderCard('products', it))}
                      {tab === 'threads' && threadResults.map(it => renderCard('threads', it))}
                      {tab === 'clubs' && clubResults.map(it => renderCard('clubs', it))}
                      {tab === 'manga' && mangaResults.map(it => renderCard('manga', it))}
                      {tab === 'amvs' && amvResults.map(it => renderCard('amvs', it))}
                      {tab === 'organizations' && orgResults.map(it => renderCard('organizations', it))}
                    </div>}
                </section>}
            </div>
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>;
};

// ── Reusable filter primitives ──
const FilterGroup = ({
  label,
  children
}) => <div className={styles.filterGroup}>
    <p className={styles.filterLabel}>{label}</p>
    {children}
  </div>;
const Select = ({
  value,
  onChange,
  children
}) => <div className={styles.selectWrap}>
    <select className={styles.select} value={value} onChange={e => onChange(e.target.value)}>
      {children}
    </select>
    <TiArrowSortedDown className={styles.selectCaret} />
  </div>;

// ── Card renderers ────────────────────────────────────────────────────────
const TournamentCard = ({
  t
}) => {
  const tt = useT();
  const statusLabel = {
    upcoming: 'Upcoming',
    in_progress: 'Live',
    completed: 'Completed'
  }[t.status] || t.status;
  return <Link href={`/tournaments/${t.slug || t.id}`} className={styles.tCard}>
      <div className={styles.tCardBanner} style={{
      backgroundImage: `url(${t.banner_image})`
    }}>
        <span className={`${styles.statusBadge} ${styles[`status_${t.status}`] || ''}`}>
          {statusLabel}
        </span>
        {feeVc(t) === 0 && <span className={styles.freeBadge}>{tt("ui.free.4a97", "FREE")}</span>}
      </div>
      <div className={styles.tCardBody}>
        <span className={styles.gameTag}>{t.game}</span>
        <h3 className={styles.tCardTitle}>{t.name}</h3>
        <div className={styles.tCardMeta}>
          <div className={styles.metaRow}>
            <LuTrophy className={styles.metaIcon} />
            <span className={styles.metaPrize}>{(t.prize_pool || 0).toLocaleString()} VC</span>
          </div>
          <div className={styles.metaRow}>
            <LuCalendar className={styles.metaIcon} />
            <span>{fmtDate(t.start_date)}</span>
          </div>
          <div className={styles.metaRow}>
            <LuUsers className={styles.metaIcon} />
            <span>{t.current_participants}/{t.max_participants}</span>
          </div>
        </div>
        <div className={styles.tCardFooter}>
          <span className={styles.formatTag}>{fmtFormat(t.format)}</span>
          {feeVc(t) > 0 ? <span className={styles.entryFee}>{feeVc(t).toLocaleString()} VC</span> : <span className={styles.entryFreeText}>{tt("ui.free.75f5", "Free")}</span>}
        </div>
      </div>
    </Link>;
};
const EventCard = ({
  e
}) => {
  const tt = useT();
  const statusLabel = {
    upcoming: 'Upcoming',
    in_progress: 'Live',
    completed: 'Completed'
  }[e.status] || e.status;
  return <Link href={`/events/${e.slug || e.id}`} className={styles.tCard}>
      <div className={styles.tCardBanner} style={{
      backgroundImage: `url(${e.banner_image})`
    }}>
        <span className={`${styles.statusBadge} ${styles[`status_${e.status}`] || ''}`}>
          {statusLabel}
        </span>
        <span className={styles.typeBadge}>{e.event_type}</span>
      </div>
      <div className={styles.tCardBody}>
        <h3 className={styles.tCardTitle}>{e.name}</h3>
        <div className={styles.tCardMeta}>
          <div className={styles.metaRow}>
            <MdOutlineLocationOn className={styles.metaIcon} />
            <span>{e.location}</span>
          </div>
          <div className={styles.metaRow}>
            <LuCalendar className={styles.metaIcon} />
            <span>{fmtDate(e.start_date)}</span>
          </div>
          <div className={styles.metaRow}>
            <LuUsers className={styles.metaIcon} />
            <span>{e.attendees_count} {tt("ui.attending.5ae7", "attending")}</span>
          </div>
        </div>
      </div>
    </Link>;
};
const TeamCard = ({
  t
}) => {
  const tt = useT();
  return <Link href={`/teams/${t.slug || t.id}`} className={styles.teamCard}>
    <div className={styles.teamHeader}>
      <div className={styles.teamLogo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(t.logo)} alt={t.name} />
      </div>
      <div className={styles.teamHeaderText}>
        <h3 className={styles.teamName}>{t.name}</h3>
        <span className={styles.teamMeta}>{t.tag} · {t.game}</span>
      </div>
      {t.is_accepting_members && <span className={styles.openBadge}>{tt("ui.open.cf9b", "Open")}</span>}
    </div>
    <p className={styles.teamBio}>{t.bio}</p>
    <div className={styles.teamFooter}>
      <span className={styles.metaPair}>
        <FaUsers /> {t.member_count} {tt("ui.members.f13e", "members")}
      </span>
      <span className={styles.metaPair}>
        <LuTrophy /> {t.tournaments_won} {tt("ui.wins.cc60", "wins")}
      </span>
    </div>
  </Link>;
};
const UserCard = ({
  u
}) => {
  const tt = useT();
  return <Link href={`/u/${u.username || u.id}`} className={styles.userCard}>
    <div className={styles.userAvatar}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl(u.avatar)} alt={u.full_name} />
    </div>
    <div className={styles.userBody}>
      <UserChip user={u} size={0} secondary link={false}
                nameClassName={styles.userName}
                handleClassName={styles.userHandle} />
      <div className={styles.userMetaRow}>
        <span className={styles.metaPair}>
          <MdOutlineLocationOn /> {u.country || u.region}
        </span>
        <span className={styles.metaPair}>
          <LuGamepad2 /> {u.favorite_game}
        </span>
      </div>
      <div className={styles.userStatRow}>
        <span className={styles.userStat}>{tt("ui.rank.71c5", "Rank #")}{u.rank}</span>
        <span className={styles.userStat}>{u.points} {tt("ui.pts.4abd", "pts")}</span>
      </div>
    </div>
  </Link>;
};

// The four cards below still address by id, and are the only links on the site
// that do. Marketplace, Shop and Anime are behind ComingSoon - there is no page
// to land on and no model to carry a slug - so they are exempt under the slug
// rule until they are built, and then they are built to it. Grepping for
// "?id=" in src should return these four and nothing else.
const ListingCard = ({
  l
}) => {
  const tx = useTx();
  return <Link href={`/marketplace/listing?id=${l.id}`} className={styles.listingCard}>
    <div className={styles.listingImageWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl((l.images || [])[0])} alt={tx(l.title)} className={styles.listingImage} />
      <span className={styles.listingCategory}>{l.category}</span>
      <span className={styles.listingCondition}>{(l.condition || '').replace('_', ' ')}</span>
    </div>
    <div className={styles.listingBody}>
      <h3 className={styles.listingTitle}>{tx(l.title)}</h3>
      <div className={styles.listingPriceRow}>
        <span className={styles.listingPrice}>{(l.price_vc || 0).toLocaleString()}</span>
        <span className={styles.listingPriceUnit}>VC</span>
      </div>
      <div className={styles.listingSeller}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(l.seller?.avatar)} alt={l.seller?.username} className={styles.sellerAvatar} />
        <span className={styles.sellerHandle}>@{l.seller?.username}</span>
        <span className={styles.sellerRating}><FaStar /> {Number(l.seller?.rating || 0).toFixed(1)}</span>
      </div>
    </div>
  </Link>;
};
const ProductCard = ({
  p
}) => {
  const tt = useT();
  return <Link href={`/shop/product?id=${p.id}`} className={styles.listingCard}>
    <div className={styles.listingImageWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl((p.images || [])[0])} alt={p.name} className={styles.listingImage} />
      <span className={styles.listingCategory}>{p.category}</span>
      {p.sale_price && <span className={styles.salePill}>{tt("ui.sale.3809", "SALE")}</span>}
    </div>
    <div className={styles.listingBody}>
      <h3 className={styles.listingTitle}>{p.name}</h3>
      <div className={styles.listingPriceRow}>
        <span className={styles.listingPrice}>
          {(p.sale_price || p.price_vent_coins || 0).toLocaleString()}
        </span>
        <span className={styles.listingPriceUnit}>VC</span>
        {p.sale_price && <span className={styles.priceStrike}>{p.price_vent_coins.toLocaleString()}</span>}
      </div>
      <div className={styles.productMeta}>
        <span className={styles.metaPair}><FaStar /> {p.rating}</span>
        <span className={styles.metaPair}>{p.review_count} {tt("ui.reviews.7b2c", "reviews")}</span>
      </div>
    </div>
  </Link>;
};
const ThreadCard = ({
  t
}) => {
  const tx = useTx();
  const tt = useT();
  return <Link href={`/community/thread/${t.slug || t.id}`} className={styles.threadCard}>
    <div className={styles.threadHead}>
      <span className={styles.threadCategory}>{t.category}</span>
      <span className={styles.threadReplies}>{t.reply_count} {tt("ui.replies.6f56", "replies")}</span>
    </div>
    <h3 className={styles.threadTitle}>{tx(t.title)}</h3>
    <div className={styles.threadAuthor}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl(t.author?.avatar)} alt={t.author?.username} className={styles.threadAvatar} />
      <span className={styles.threadAuthorName}>@{t.author?.username}</span>
      <span className={styles.threadDate}>{fmtDate(t.created_at)}</span>
    </div>
  </Link>;
};
const ClubCard = ({
  c
}) => {
  const tx = useTx();
  const tt = useT();
  return <Link href={`/community?tab=clubs&id=${c.id}`} className={styles.clubCard}>
    <div className={styles.clubBanner} style={{
      backgroundImage: `url(${c.banner})`
    }} />
    <div className={styles.clubBody}>
      <h3 className={styles.clubName}>{c.name}</h3>
      <p className={styles.clubGame}>{c.game}</p>
      <p className={styles.clubDesc}>{tx(c.description)}</p>
      <div className={styles.clubFooter}>
        <span className={styles.metaPair}><FaUsers /> {c.members} {tt("ui.members.f13e", "members")}</span>
        {c.joined && <span className={styles.joinedPill}>{tt("ui.joined.43a1", "Joined")}</span>}
      </div>
    </div>
  </Link>;
};
const MangaCard = ({
  m
}) => {
  const tx = useTx();
  const tt = useT();
  return <Link href={`/anime/reader?id=${m.id}`} className={styles.mangaCard}>
    <div className={styles.mangaCoverWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl(m.cover)} alt={tx(m.title)} className={styles.mangaCover} />
      <span className={styles.mangaStatus}>{m.status}</span>
    </div>
    <div className={styles.mangaBody}>
      <h3 className={styles.mangaTitle}>{tx(m.title)}</h3>
      <p className={styles.mangaGenres}>{(m.genres || []).join(', ')}</p>
      <div className={styles.mangaFooter}>
        <span className={styles.metaPair}><FaStar /> {m.rating}</span>
        <span className={styles.metaPair}>{m.total_chapters} {tt("ui.chapters.1fb0", "chapters")}</span>
      </div>
    </div>
  </Link>;
};
const AmvCard = ({
  a
}) => {
  const tx = useTx();
  const tt = useT();
  return <Link href={`/anime/amv?id=${a.id}`} className={styles.amvCard}>
    <div className={styles.amvThumbWrap}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.thumbnail} alt={tx(a.title)} className={styles.amvThumb} />
      <span className={styles.amvDuration}>{a.duration}</span>
      {a.featured && <span className={styles.amvFeatured}>{tt("ui.featured.c005", "FEATURED")}</span>}
      <FiPlayCircle className={styles.amvPlay} />
    </div>
    <div className={styles.amvBody}>
      <h3 className={styles.amvTitle}>{tx(a.title)}</h3>
      <span className={styles.amvUploader}>@{a.uploader?.username}</span>
      <div className={styles.amvFooter}>
        <span className={styles.metaPair}>{(a.views || 0).toLocaleString()} {tt("ui.views.81f3", "views")}</span>
        <span className={styles.metaPair}>{(a.likes || 0).toLocaleString()} {tt("ui.likes.aecb", "likes")}</span>
      </div>
    </div>
  </Link>;
};
const OrgCard = ({
  o
}) => {
  const tt = useT();
  return <Link href={`/organizations/${o.slug || o.id}`} className={styles.orgCard}>
    <div className={styles.orgBanner} style={{
      backgroundImage: `url(${o.banner})`
    }}>
      <div className={styles.orgLogoWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(o.logo)} alt={o.name} className={styles.orgLogo} />
      </div>
      {o.verified && <span className={styles.orgVerified}>{tt("ui.verified.aed3", "Verified")}</span>}
    </div>
    <div className={styles.orgBody}>
      <h3 className={styles.orgName}>{o.name}</h3>
      <span className={styles.orgRegion}>{o.region}</span>
      <p className={styles.orgBio}>{o.bio}</p>
      <div className={styles.orgFooter}>
        <span className={styles.metaPair}><FaUsers /> {o.stats?.total_members || 0}</span>
        <span className={styles.metaPair}><LuTrophy /> {o.stats?.total_tournaments_hosted || 0}</span>
      </div>
    </div>
  </Link>;
};

// ── Suspense wrapper ──
const SearchPage = () => {
  const tt = useT();
  return <Suspense fallback={<div className={styles.pageContainer}>
        <div className={styles.rightPaneContainer}>
          <p className={styles.summary}>{tt("ui.loading.search.4f09", "Loading search…")}</p>
        </div>
      </div>}>
    <SearchPageInner />
  </Suspense>;
};
export default SearchPage;