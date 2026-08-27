'use client';

import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { CiSearch } from 'react-icons/ci';
import { TiArrowSortedDown } from 'react-icons/ti';
import { HiPlus } from 'react-icons/hi';
import { MdOutlineClose, MdOutlineEvent } from 'react-icons/md';
import { IoCalendarOutline, IoLocationOutline, IoTicketOutline } from 'react-icons/io5';
import { FaUsers, FaFire } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { extractEventList } from '@/components/events/normalizeEvents';
import styles from './events.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const TABS = [{
  id: 'all',
  label: 'All'
}, {
  id: 'featured',
  label: 'Featured'
}, {
  id: 'upcoming',
  label: 'Upcoming'
}, {
  id: 'weekend',
  label: 'This Weekend'
}, {
  id: 'anime',
  label: 'Anime'
}, {
  id: 'esports',
  label: 'Esports'
}, {
  id: 'concerts',
  label: 'Concerts'
}];
const TYPE_OPTIONS = [{
  id: '',
  label: 'All types'
}, {
  id: 'virtual',
  label: 'Virtual'
}, {
  id: 'physical',
  label: 'Physical'
}, {
  id: 'hybrid',
  label: 'Hybrid'
}];
const PRICE_OPTIONS = [{
  id: '',
  label: 'Any price'
}, {
  id: 'free',
  label: 'Free'
}, {
  id: 'low',
  label: 'Under 5,000'
}, {
  id: 'mid',
  label: '5,000 - 25,000'
}, {
  id: 'high',
  label: '25,000+'
}];
const isThisWeekend = iso => {
  if (!iso) return false;
  const d = new Date(iso);
  const day = d.getDay();
  const today = new Date();
  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= -1 && diff <= 9 && (day === 5 || day === 6 || day === 0);
};
const formatDate = iso => {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};
const priceTier = event => {
  const tiers = event.ticket_types || [];
  if (!tiers.length) return {
    lo: 0,
    hi: 0,
    label: 'Free'
  };
  const prices = tiers.map(t => Number(t.price || 0));
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  if (lo === 0 && hi === 0) return {
    lo: 0,
    hi: 0,
    label: 'Free'
  };
  if (lo === hi) return {
    lo,
    hi,
    label: `₦${lo.toLocaleString()}`
  };
  return {
    lo,
    hi,
    label: `₦${lo.toLocaleString()} - ₦${hi.toLocaleString()}`
  };
};
const tagFor = event => {
  const name = (event.name || '').toLowerCase();
  if (name.includes('anime') || name.includes('manga')) return 'anime';
  if (name.includes('concert') || name.includes('music') || name.includes('live')) return 'concerts';
  return 'esports';
};
const EventsListingContent = () => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: session
  } = useSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialTab = searchParams.get('tab') || 'all';
  const initialType = searchParams.get('type') || '';
  const initialQuery = searchParams.get('q') || '';
  const initialLocation = searchParams.get('loc') || '';
  const initialPrice = searchParams.get('price') || '';
  const initialFrom = searchParams.get('from') || '';
  const initialTo = searchParams.get('to') || '';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [locationFilter, setLocationFilter] = useState(initialLocation);
  const [priceFilter, setPriceFilter] = useState(initialPrice);
  const [dateFrom, setDateFrom] = useState(initialFrom);
  const [dateTo, setDateTo] = useState(initialTo);
  const [showFilters, setShowFilters] = useState(false);
  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${session?.user?.sessionToken || ''}`,
    'Content-Type': 'application/json'
  }), [session?.user?.sessionToken]);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/get-all-events/`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (data.status === 'success') {
          // Handles both the mock shape ({ events, featured, upcoming, by_game })
          // and the real backend shape ({ featured, upcoming, by_game } with thin
          // field names). extractEventList merges + normalizes to the canonical
          // shape the cards below expect.
          setEvents(extractEventList(data.data));
        }
      } catch (err) {
        console.error('Events fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [authHeaders]);

  // Sync URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab && activeTab !== 'all') params.set('tab', activeTab);
    if (typeFilter) params.set('type', typeFilter);
    if (searchQuery) params.set('q', searchQuery);
    if (locationFilter) params.set('loc', locationFilter);
    if (priceFilter) params.set('price', priceFilter);
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    const qs = params.toString();
    router.replace(qs ? `/events?${qs}` : '/events', {
      scroll: false
    });
  }, [activeTab, typeFilter, searchQuery, locationFilter, priceFilter, dateFrom, dateTo, router]);
  const filtered = useMemo(() => {
    let out = [...events];

    // Tab filtering
    if (activeTab === 'featured') {
      out = out.filter((e, i) => i < 3 || e.is_featured);
    } else if (activeTab === 'upcoming') {
      out = out.filter(e => e.status === 'upcoming' || new Date(e.start_date) > new Date());
    } else if (activeTab === 'weekend') {
      out = out.filter(e => isThisWeekend(e.start_date));
    } else if (activeTab === 'anime' || activeTab === 'esports' || activeTab === 'concerts') {
      out = out.filter(e => tagFor(e) === activeTab);
    }

    // Type filter
    if (typeFilter) out = out.filter(e => e.event_type === typeFilter);

    // Location filter
    if (locationFilter) {
      const q = locationFilter.toLowerCase();
      out = out.filter(e => (e.location || '').toLowerCase().includes(q));
    }

    // Date range
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      out = out.filter(e => new Date(e.start_date).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      out = out.filter(e => new Date(e.start_date).getTime() <= to);
    }

    // Price filter
    if (priceFilter) {
      out = out.filter(e => {
        const {
          lo,
          hi
        } = priceTier(e);
        if (priceFilter === 'free') return lo === 0 && hi === 0;
        if (priceFilter === 'low') return lo < 5000;
        if (priceFilter === 'mid') return lo >= 5000 && lo <= 25000;
        if (priceFilter === 'high') return lo > 25000;
        return true;
      });
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      out = out.filter(e => (e.name || '').toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q));
    }
    return out;
  }, [events, activeTab, typeFilter, locationFilter, priceFilter, dateFrom, dateTo, searchQuery]);
  const featured = useMemo(() => events.slice(0, 3), [events]);
  const clearFilters = () => {
    setTypeFilter('');
    setLocationFilter('');
    setPriceFilter('');
    setDateFrom('');
    setDateTo('');
    setSearchQuery('');
  };
  const hasActiveFilters = typeFilter || locationFilter || priceFilter || dateFrom || dateTo || searchQuery;
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Page header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>
                <MdOutlineEvent className={styles.titleIcon} /> {tt("ui.events.c549", "Events")}
              </h1>
              <p className={styles.pageSub}>
                {tt("ui.concerts.anime.cons.esports.f4bc", "Concerts, anime cons, esports finals, conventions - find your next plug.")}
              </p>
            </div>

            <div className={styles.headerActions}>
              <Link href="/events/my-tickets" className={styles.ticketsBtn}>
                <IoTicketOutline /> {tt("ui.my.tickets.5394", "My tickets")}
              </Link>
              <Link href="/events/my-events" className={styles.ticketsBtn}>
                {tt("myEvents.title", "My events")}
              </Link>
              <Link href="/events/create-event" className={`${styles.createBtn} redBTN`}>
                <HiPlus /> {tt("ui.create.event.b8d8", "Create event")}
              </Link>
            </div>
          </div>

          {/* Featured spotlight */}
          {featured.length > 0 && <div className={styles.featuredSection}>
              <div className={styles.featuredHeader}>
                <h2 className={styles.sectionTitle}>
                  <FaFire className={styles.fireIcon} /> {tt("ui.featured.ae31", "Featured")}
                </h2>
              </div>
              <div className={styles.featuredGrid}>
                {featured.map((e, i) => {
              const tier = priceTier(e);
              return <Link key={e.id} href={`/events/${e.slug || e.id}`} className={`${styles.featuredCard} ${i === 0 ? styles.featuredCardLarge : ''}`}>
                      <div className={styles.featuredImgWrap}>
                        {e.banner_image || e.banner ? <Image src={mediaUrl(e.banner_image || e.banner)} alt={e.name} fill sizes="(min-width: 1024px) 33vw, 100vw" style={{
                    objectFit: 'cover'
                  }} unoptimized /> : null}
                        <div className={styles.featuredOverlay} />
                        <span className={`${styles.typeTag} ${styles['type_' + e.event_type]}`}>
                          {e.event_type}
                        </span>
                      </div>
                      <div className={styles.featuredBody}>
                        <h2 className={styles.featuredTitle}>{e.name}</h2>
                        <div className={styles.featuredMeta}>
                          <span className={styles.metaItem}>
                            <IoCalendarOutline /> {formatDate(e.start_date)}
                          </span>
                          <span className={styles.metaItem}>
                            <IoLocationOutline /> {e.location}
                          </span>
                        </div>
                        <div className={styles.featuredFooter}>
                          <span className={styles.priceLabel}>{tx(tier.label)}</span>
                          <span className={styles.attendingChip}>
                            <FaUsers /> {e.attendees_count?.toLocaleString() || 0} {tt("ui.attending.5ae7", "attending")}
                          </span>
                        </div>
                      </div>
                    </Link>;
            })}
              </div>
            </div>}

          {/* Tabs */}
          <div className={styles.tabRow}>
            {TABS.map(t => <button key={t.id} className={`${styles.tabBtn} ${activeTab === t.id ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab(t.id)} type="button">
                {tx(t.label)}
              </button>)}
          </div>

          {/* Search + filter toggle */}
          <div className={styles.controlsRow}>
            <div className={styles.searchBar}>
              <CiSearch className={styles.searchIcon} />
              <input type="text" placeholder={tt("ui.search.events.venues.descriptions.4ce1", "Search events, venues, descriptions…")} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className={styles.searchInput} />
            </div>
            <button className={`${styles.filterToggle} ${showFilters ? styles.filterToggleActive : ''}`} onClick={() => setShowFilters(s => !s)} type="button">
              {tt("ui.filters.96e5", "Filters")}
              {hasActiveFilters ? <span className={styles.filterDot} /> : null}
            </button>
            {hasActiveFilters && <button className={styles.clearBtn} onClick={clearFilters} type="button">
                <MdOutlineClose /> {tt("ui.clear.719e", "Clear")}
              </button>}
          </div>

          {/* Filter panel */}
          {showFilters && <div className={styles.filterPanel}>
              <div className={styles.filterField}>
                <label className={styles.filterLabel}>{tt("ui.type.3deb", "Type")}</label>
                <div className={styles.selectWrap}>
                  <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={styles.select}>
                    {TYPE_OPTIONS.map(o => <option key={o.id} value={o.id}>{tx(o.label)}</option>)}
                  </select>
                  <TiArrowSortedDown className={styles.selectCaret} />
                </div>
              </div>

              <div className={styles.filterField}>
                <label className={styles.filterLabel}>{tt("ui.location.d219", "Location")}</label>
                <input type="text" placeholder={tt("ui.e.g.lagos.81a0", "e.g. Lagos")} className={styles.filterInput} value={locationFilter} onChange={e => setLocationFilter(e.target.value)} />
              </div>

              <div className={styles.filterField}>
                <label className={styles.filterLabel}>{tt("ui.price.3e82", "Price")}</label>
                <div className={styles.selectWrap}>
                  <select value={priceFilter} onChange={e => setPriceFilter(e.target.value)} className={styles.select}>
                    {PRICE_OPTIONS.map(o => <option key={o.id} value={o.id}>{tx(o.label)}</option>)}
                  </select>
                  <TiArrowSortedDown className={styles.selectCaret} />
                </div>
              </div>

              <div className={styles.filterField}>
                <label className={styles.filterLabel}>{tt("ui.from.3f66", "From")}</label>
                <input type="date" className={styles.filterInput} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>

              <div className={styles.filterField}>
                <label className={styles.filterLabel}>{tt("ui.text.ae79", "To")}</label>
                <input type="date" className={styles.filterInput} value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>}

          {/* Card grid */}
          <div className={styles.gridSection}>
            <div className={styles.gridHeader}>
              <h2 className={styles.sectionTitle}>
                {TABS.find(t => t.id === activeTab)?.label || 'All'} {tt("ui.events.82d5", "events")}
              </h2>
              <span className={styles.resultCount}>
                {loading ? tx("Loading…") : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`}
              </span>
            </div>

            {loading ? <div className={styles.skeletonGrid}>
                {Array.from({
              length: 6
            }).map((_, i) => <div key={i} className={styles.skeletonCard} />)}
              </div> : filtered.length === 0 ? <div className={styles.emptyState}>
                <MdOutlineEvent className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>{tt("ui.no.events.match.these.5242", "No events match these filters.")}</p>
                <p className={styles.emptySub}>{tt("ui.try.clearing.filters.pick.db0d", "Try clearing filters or pick a different tab.")}</p>
                {hasActiveFilters && <button className={`${styles.emptyBtn} goldBTN`} onClick={clearFilters} type="button">
                    {tt("ui.clear.filters.4122", "Clear filters")}
                  </button>}
              </div> : <div className={styles.cardGrid}>
                {filtered.map(e => {
              const tier = priceTier(e);
              return <Link key={e.id} href={`/events/${e.slug || e.id}`} className={styles.eventCard}>
                      <div className={styles.cardImgWrap}>
                        {e.banner_image || e.banner ? <Image src={mediaUrl(e.banner_image || e.banner)} alt={e.name} fill sizes="(min-width: 1440px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" style={{
                    objectFit: 'cover'
                  }} unoptimized /> : null}
                        <span className={`${styles.typeTag} ${styles['type_' + e.event_type]}`}>
                          {e.event_type}
                        </span>
                      </div>
                      <div className={styles.cardBody}>
                        <h2 className={styles.cardTitle}>{e.name}</h2>
                        <div className={styles.cardMetaRow}>
                          <span className={styles.metaItem}>
                            <IoCalendarOutline /> {formatDate(e.start_date)}
                          </span>
                          <span className={styles.metaItem}>
                            <IoLocationOutline /> {e.location}
                          </span>
                        </div>
                        <div className={styles.cardFooter}>
                          <span className={styles.priceLabel}>{tx(tier.label)}</span>
                          <span className={styles.attendingChip}>
                            <FaUsers /> {e.attendees_count?.toLocaleString() || 0}
                          </span>
                        </div>
                      </div>
                    </Link>;
            })}
              </div>}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>;
};
const Events = () => {
  const tt = useT();
  return <Suspense fallback={<div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>{tt("ui.loading.events.b467", "Loading events…")}</p>
          </div>
        </main>
        <BottomMenu />
      </div>}>
    <EventsListingContent />
  </Suspense>;
};
export default Events;