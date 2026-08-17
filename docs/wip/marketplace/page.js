'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CiSearch } from 'react-icons/ci';
import { HiPlus } from 'react-icons/hi';
import { FaStar, FaHeart, FaRegHeart, FaEye } from 'react-icons/fa';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import { TiArrowSortedDown } from 'react-icons/ti';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './marketplace.module.css';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'hot', label: 'Hot' },
  { key: 'new', label: 'New' },
  { key: 'ending_soon', label: 'Ending Soon' },
  { key: 'watchlist', label: 'My Watchlist' },
];

const CATEGORIES = [
  { key: 'all', label: 'All categories' },
  { key: 'gaming hardware', label: 'Gaming Hardware' },
  { key: 'apparel', label: 'Apparel' },
  { key: 'collectibles', label: 'Collectibles' },
  { key: 'tickets', label: 'Tickets' },
  { key: 'services', label: 'Services' },
  { key: 'digital', label: 'Digital' },
];

const REGIONS = [
  { v: 'all', label: 'Any region' },
  { v: 'lagos', label: 'Lagos' },
  { v: 'abuja', label: 'Abuja' },
  { v: 'accra', label: 'Accra' },
  { v: 'nairobi', label: 'Nairobi' },
];

const PAGE_SIZE = 12;

const MarketplaceInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allListings, setAllListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters — initialised from URL.
  const [tab, setTab] = useState(searchParams.get('tab') || 'all');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || 'all');
  const [region, setRegion] = useState(searchParams.get('region') || 'all');
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get('verified_only') === 'true');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10) || 1);

  // Hero carousel image index per card.
  const [hoverImageIdx, setHoverImageIdx] = useState({});
  const [toast, setToast] = useState('');

  // Fetch on mount and whenever core server-side filters change.
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (tab && tab !== 'all') params.set('tab', tab);
        if (category && category !== 'all') params.set('category', category);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/listings/?${params.toString()}`);
        const data = await res.json();
        if (data.status === 'success') {
          setAllListings(data.data.listings || []);
        }
      } catch (err) {
        console.error('Marketplace fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, [tab, category]);

  // Sync URL with filter state.
  useEffect(() => {
    const params = new URLSearchParams();
    if (tab !== 'all') params.set('tab', tab);
    if (category !== 'all') params.set('category', category);
    if (search) params.set('q', search);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    if (condition !== 'all') params.set('condition', condition);
    if (region !== 'all') params.set('region', region);
    if (verifiedOnly) params.set('verified_only', 'true');
    if (sort !== 'newest') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `/marketplace?${qs}` : '/marketplace', { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, category, search, minPrice, maxPrice, condition, region, verifiedOnly, sort, page]);

  // Client-side post-filter for fields the handler may not have applied.
  const filtered = useMemo(() => {
    let out = [...allListings];
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter((l) =>
        l.title.toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q) ||
        (l.seller?.username || '').toLowerCase().includes(q)
      );
    }
    if (condition !== 'all') out = out.filter((l) => l.condition === condition);
    if (region !== 'all') out = out.filter((l) => (l.location || '').toLowerCase() === region);
    if (verifiedOnly) out = out.filter((l) => l.seller?.verified);
    const min = parseInt(minPrice, 10);
    const max = parseInt(maxPrice, 10);
    if (!Number.isNaN(min)) out = out.filter((l) => l.price_vc >= min);
    if (!Number.isNaN(max)) out = out.filter((l) => l.price_vc <= max);

    if (sort === 'price_asc') out.sort((a, b) => a.price_vc - b.price_vc);
    else if (sort === 'price_desc') out.sort((a, b) => b.price_vc - a.price_vc);
    else if (sort === 'newest') out.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sort === 'ending_soonest') out.sort((a, b) => new Date(a.ending_at) - new Date(b.ending_at));

    return out;
  }, [allListings, search, condition, region, verifiedOnly, minPrice, maxPrice, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  // Compute counts per category for the sidebar (always from full active set).
  const categoryCounts = useMemo(() => {
    const counts = { all: allListings.length };
    allListings.forEach((l) => {
      const k = (l.category || '').toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [allListings]);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  const handleWatch = async (e, listing) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/listings/${listing.id}/watch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === 'success') {
        const watching = data.data.watching;
        setAllListings((prev) => prev.map((l) => l.id === listing.id ? { ...l, is_watched: watching } : l));
        // If we're on the watchlist tab and item was just removed, drop it from the local view.
        if (tab === 'watchlist' && !watching) {
          setAllListings((prev) => prev.filter((l) => l.id !== listing.id));
        }
        showToast(watching ? 'Added to watchlist' : 'Removed from watchlist');
      }
    } catch (err) {
      console.error(err);
      showToast('Could not update watchlist');
    }
  };

  const cycleHoverImage = (id, total) => {
    setHoverImageIdx((prev) => ({ ...prev, [id]: ((prev[id] || 0) + 1) % total }));
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Hero */}
          <section className={styles.hero}>
            <span className={styles.heroAccent} />
            <div className={styles.heroTop}>
              <div className={styles.heroText}>
                <h1 className={styles.heroTitle}>
                  Vermillion <span className={styles.heroAccentText}>City Marketplace</span>
                </h1>
                <p className={styles.heroTagline}>
                  Buy, sell and trade hardware, apparel, collectibles, tickets, services and digital goods —
                  every transaction protected by VENT COIN escrow.
                </p>
              </div>
              <div className={styles.heroCtas}>
                <Link href="/marketplace/dashboard" className={styles.dashBtn}>
                  Seller dashboard
                </Link>
                <Link href="/marketplace/create" className={`${styles.createBtn} redBTN`}>
                  <HiPlus /> Create listing
                </Link>
              </div>
            </div>

            <div className={styles.heroSearchRow}>
              <div className={styles.heroSearch}>
                <CiSearch className={styles.heroSearchIcon} />
                <input
                  type="text"
                  placeholder="Search listings, sellers, descriptions…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className={styles.heroSearchInput}
                />
              </div>
            </div>
          </section>

          {/* Tabs */}
          <div className={styles.tabsRow}>
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`${styles.tabBtn} ${tab === t.key ? styles.tabBtnActive : ''}`}
                onClick={() => { setTab(t.key); setPage(1); }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Layout: sidebar + content */}
          <div className={styles.contentLayout}>
            <aside className={styles.catSidebar}>
              <p className={styles.catGroupTitle}>Categories</p>
              <ul className={styles.catList}>
                {CATEGORIES.map((c) => (
                  <li key={c.key}>
                    <button
                      type="button"
                      className={`${styles.catBtn} ${category === c.key ? styles.catBtnActive : ''}`}
                      onClick={() => { setCategory(c.key); setPage(1); }}
                    >
                      <span>{c.label}</span>
                      <span className={styles.catCount}>{categoryCounts[c.key] || 0}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>

            <div>
              {/* Filter bar */}
              <div className={styles.filterBar}>
                <span className={styles.filterLabel}>Price (VC)</span>
                <input
                  type="number"
                  placeholder="Min"
                  className={styles.priceInput}
                  value={minPrice}
                  onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
                />
                <input
                  type="number"
                  placeholder="Max"
                  className={styles.priceInput}
                  value={maxPrice}
                  onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
                />

                <span className={styles.filterLabel}>Condition</span>
                <div className={styles.filterSelect}>
                  <select
                    className={styles.select}
                    value={condition}
                    onChange={(e) => { setCondition(e.target.value); setPage(1); }}
                  >
                    <option value="all">Any</option>
                    <option value="new">New</option>
                    <option value="like_new">Like new</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                  </select>
                  <TiArrowSortedDown className={styles.selectCaret} />
                </div>

                <span className={styles.filterLabel}>Region</span>
                <div className={styles.filterSelect}>
                  <select
                    className={styles.select}
                    value={region}
                    onChange={(e) => { setRegion(e.target.value); setPage(1); }}
                  >
                    {REGIONS.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
                  </select>
                  <TiArrowSortedDown className={styles.selectCaret} />
                </div>

                <label className={styles.verifiedToggle}>
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => { setVerifiedOnly(e.target.checked); setPage(1); }}
                  />
                  Verified only
                </label>

                <span className={styles.filterLabel} style={{ marginLeft: 'auto' }}>Sort</span>
                <div className={styles.filterSelect}>
                  <select
                    className={styles.select}
                    value={sort}
                    onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  >
                    <option value="newest">Newest</option>
                    <option value="price_asc">Price: low to high</option>
                    <option value="price_desc">Price: high to low</option>
                    <option value="ending_soonest">Ending soonest</option>
                  </select>
                  <TiArrowSortedDown className={styles.selectCaret} />
                </div>

                <span className={styles.resultsCount}>
                  {loading ? 'Loading…' : `${filtered.length} listing${filtered.length === 1 ? '' : 's'}`}
                </span>
              </div>

              {/* Grid */}
              {loading ? (
                <p className={styles.stateText}>Loading marketplace listings…</p>
              ) : paged.length === 0 ? (
                <p className={styles.stateText}>
                  {tab === 'watchlist'
                    ? 'Your watchlist is empty. Tap the heart on any listing to save it.'
                    : 'No listings match your filters yet. Try clearing filters or broaden your search.'}
                </p>
              ) : (
                <div className={styles.grid} style={{ marginTop: '1rem' }}>
                  {paged.map((l) => {
                    const idx = hoverImageIdx[l.id] || 0;
                    return (
                      <Link
                        key={l.id}
                        href={`/marketplace/listing?id=${l.id}`}
                        className={styles.card}
                        onMouseEnter={() => cycleHoverImage(l.id, l.images?.length || 1)}
                        onMouseMove={() => {/* allow continuous swap on movement */}}
                      >
                        <div className={styles.cardImageWrap}>
                          <div className={styles.cardImageStack}>
                            {(l.images || []).map((src, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={src}
                                src={src}
                                alt={l.title}
                                className={`${styles.cardImage} ${i === idx ? styles.cardImageActive : ''}`}
                              />
                            ))}
                          </div>
                          <span className={styles.cardCategoryPill}>{l.category}</span>
                          <span className={styles.conditionBadge}>{(l.condition || '').replace('_', ' ')}</span>
                          <button
                            type="button"
                            className={`${styles.heartBtn} ${l.is_watched ? styles.heartBtnActive : ''}`}
                            onClick={(e) => handleWatch(e, l)}
                            aria-label="Toggle watchlist"
                          >
                            {l.is_watched ? <FaHeart /> : <FaRegHeart />}
                          </button>
                          <div className={styles.cardImageDots}>
                            {(l.images || []).slice(0, 5).map((_, i) => (
                              <span
                                key={i}
                                className={`${styles.cardImageDot} ${i === idx ? styles.cardImageDotActive : ''}`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className={styles.cardBody}>
                          <h3 className={styles.cardTitle}>{l.title}</h3>
                          <div className={styles.cardPriceRow}>
                            <span className={styles.cardPrice}>{l.price_vc.toLocaleString()}</span>
                            <span className={styles.cardPriceUnit}>VC</span>
                            <span className={styles.cardPriceNgn}>≈ ₦{l.price_ngn?.toLocaleString()}</span>
                          </div>
                          <div className={styles.sellerMini}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={l.seller?.avatar || l.seller?.profile_pic} alt={l.seller?.username} className={styles.sellerAvatar} />
                            <span className={styles.sellerHandle}>@{l.seller?.username}</span>
                            <span className={styles.sellerRating}>
                              <FaStar /> {Number(l.seller?.rating ?? l.seller?.seller_rating ?? 0).toFixed(1)}
                            </span>
                            <span className={styles.cardMetaRow}>
                              <FaEye /> {l.views}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Pagination */}
              {filtered.length > PAGE_SIZE && (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageSafe === 1}
                  >
                    <BsChevronLeft />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`${styles.pageBtn} ${pageSafe === n ? styles.pageBtnActive : ''}`}
                      onClick={() => setPage(n)}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    type="button"
                    className={styles.pageBtn}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageSafe === totalPages}
                  >
                    <BsChevronRight />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
};

const Marketplace = () => (
  <Suspense fallback={<div style={{ padding: '4rem', color: '#fff', backgroundColor: '#131316', minHeight: '100vh' }}>Loading…</div>}>
    <MarketplaceInner />
  </Suspense>
);

export default Marketplace;
