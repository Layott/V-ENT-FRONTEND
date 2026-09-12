'use client';

// Vermillion City: what people are offering.
//
// The design is the one drawn in August and preserved in `docs/wip/marketplace`
// when the mock layer was deleted for having no API behind it. The API exists
// now, so the layout comes back pointed at real data.
//
// Three things changed on the way back, and each is a correction rather than a
// preference:
//
//   * the categories were an invented list ("gaming hardware", "apparel"). They
//     come from `/marketplace/catalogue/` now, which is the same table the
//     server validates a listing against, so a category on a chip is a
//     category a listing can actually have.
//   * the heart on each card wrote to a `/watch/` endpoint that was never
//     built. The spec's wishlist is "be told when a wanted item appears",
//     which is a saved SEARCH rather than a saved listing, so the control is
//     where a search is: on the filter bar, saving what you are looking for.
//   * addresses were `?id=`, which the project bans. A listing has a slug that
//     follows its title.
//
// While the marketplace is closed this page is a ComingSoon and nothing else.
// One answer decides that, from `/auth/platform/modules/`, which is the same
// answer the navigation and the endpoints use.

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CiSearch } from 'react-icons/ci';
import { HiPlus } from 'react-icons/hi';
import { FaStar, FaEye } from 'react-icons/fa';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import { TiArrowSortedDown } from 'react-icons/ti';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import ComingSoon from '@/components/coming-soon/ComingSoon';
import UserChip from '@/components/user-chip/UserChip';
import { useT } from '@/i18n/LanguageProvider';
import { call, fill, useCatalogue, useMarketplaceOpen } from '@/lib/marketplace';
import styles from './marketplace.module.css';

const PAGE_SIZE = 12;

// What each kind is called here. The KEYS come from the server; the words are
// translated, because a sentence built in Python cannot be.
const KIND_WORDS = {
  service: ['mk.kind.service', 'Services'],
  swap: ['mk.kind.swap', 'Swaps'],
  sale: ['mk.kind.sale', 'For sale'],
};

const CATEGORY_WORDS = {
  coaching: ['mk.cat.coaching', 'Coaching'],
  streaming: ['mk.cat.streaming', 'Streaming'],
  content: ['mk.cat.content', 'Content creation'],
  design: ['mk.cat.design', 'Graphic design'],
  merchandise: ['mk.cat.merchandise', 'Merchandise'],
  in_game: ['mk.cat.inGame', 'In-game items'],
  anime: ['mk.cat.anime', 'Anime and manga'],
};

const MarketplaceInner = () => {
  const tt = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const token = session?.user?.sessionToken;

  const open = useMarketplaceOpen();
  const { catalogue } = useCatalogue(open);

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState('');
  const [toast, setToast] = useState('');

  const [kind, setKind] = useState(searchParams.get('kind') || 'all');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max_price') || '');
  const [minRating, setMinRating] = useState(searchParams.get('min_rating') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10) || 1);

  // The filters the SERVER applies. Held apart from the ones applied here so
  // it is obvious which is which: a filter applied in both places is a filter
  // that will disagree with itself the day one of them changes.
  const load = useCallback(async () => {
    if (!open) { setLoading(false); return; }
    setLoading(true);
    setProblem('');
    try {
      const params = new URLSearchParams();
      if (kind !== 'all') params.set('kind', kind);
      if (category !== 'all') params.set('category', category);
      if (search.trim()) params.set('q', search.trim());
      if (minPrice) params.set('min_price', minPrice);
      if (maxPrice) params.set('max_price', maxPrice);
      if (minRating) params.set('min_rating', minRating);
      const data = await call(`/listings/?${params.toString()}`);
      setListings(data.listings || []);
    } catch (err) {
      setProblem(err.code === 'MARKETPLACE_OFF'
        ? tt('mk.closed', 'Vermillion City is not open yet.')
        : tt('mk.loadFailed', 'The listings could not be loaded.'));
    } finally {
      setLoading(false);
    }
  }, [open, kind, category, search, minPrice, maxPrice, minRating, tt]);

  useEffect(() => { load(); }, [load]);

  // The address carries the filters, so a search can be shared and a back
  // button returns to the same shelf.
  useEffect(() => {
    if (!open) return;
    const params = new URLSearchParams();
    if (kind !== 'all') params.set('kind', kind);
    if (category !== 'all') params.set('category', category);
    if (search) params.set('q', search);
    if (minPrice) params.set('min_price', minPrice);
    if (maxPrice) params.set('max_price', maxPrice);
    if (minRating) params.set('min_rating', minRating);
    if (sort !== 'newest') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `/marketplace?${qs}` : '/marketplace', { scroll: false });
  }, [open, kind, category, search, minPrice, maxPrice, minRating, sort, page, router]);

  const sorted = useMemo(() => {
    const out = [...listings];
    if (sort === 'price_asc') out.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') out.sort((a, b) => b.price - a.price);
    else if (sort === 'ending_soonest') {
      out.sort((a, b) => new Date(a.expires_at || 8.64e15) - new Date(b.expires_at || 8.64e15));
    }
    return out;
  }, [listings, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const paged = sorted.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const counts = useMemo(() => {
    const out = { all: listings.length };
    listings.forEach(l => {
      out[l.category] = (out[l.category] || 0) + 1;
    });
    return out;
  }, [listings]);

  const say = message => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2400);
  };

  /** Save this search, which is what the spec's wishlist actually is. */
  const watchThisSearch = async () => {
    if (!token) {
      say(tt('mk.signInToSave', 'Sign in to be told when one appears.'));
      return;
    }
    try {
      await call('/wishlist/', {
        method: 'POST', token,
        body: {
          text: search.trim(),
          category: category === 'all' ? '' : category,
          kind: kind === 'all' ? '' : kind,
          max_price: maxPrice ? Number(maxPrice) : null,
        },
      });
      say(tt('mk.saved', 'Saved. You will be told when one appears.'));
    } catch (err) {
      say(err.message);
    }
  };

  // Three states, not two: `null` means the flags have not arrived, and
  // deciding while loading is how a page flickers between "coming soon" and a
  // live screen.
  if (open === null) return null;
  if (!open) {
    return <ComingSoon
      phase="Phase 4"
      title={tt('mk.title', 'Vermillion City')}
      blurb={tt('mk.comingSoon', 'Player to player listings, offers and escrow are built and not open yet.')}
      alternatives={[
        { href: '/wallets', label: tt('ui.wallet.b608', 'Wallet') },
        { href: '/tournaments', label: tt('ui.tournaments.fee2', 'Tournaments') },
      ]} />;
  }

  const categories = catalogue?.categories || [];

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <section className={styles.hero}>
            <span className={styles.heroAccent} />
            <div className={styles.heroTop}>
              <div className={styles.heroText}>
                <h1 className={styles.heroTitle}>
                  Vermillion <span className={styles.heroAccentText}>City</span>
                </h1>
                <p className={styles.heroTagline}>
                  {tt('mk.tagline', 'Coaching, streaming, design, in-game items and merchandise, between people on V-ENT. Every purchase is held in VENT COINS until it is delivered.')}
                </p>
              </div>
              <div className={styles.heroCtas}>
                <Link href="/marketplace/dashboard" className={styles.dashBtn}>
                  {tt('mk.dashboard', 'What I am selling')}
                </Link>
                <Link href="/marketplace/create" className={`${styles.createBtn} redBTN`}>
                  <HiPlus aria-hidden="true" /> {tt('mk.create', 'List something')}
                </Link>
              </div>
            </div>

            <div className={styles.heroSearchRow}>
              <div className={styles.heroSearch}>
                <CiSearch className={styles.heroSearchIcon} aria-hidden="true" />
                <input
                  type="text"
                  aria-label={tt('mk.searchLabel', 'Search listings')}
                  placeholder={tt('mk.searchPlaceholder', 'What are you looking for?')}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className={styles.heroSearchInput}
                />
              </div>
            </div>
          </section>

          <div className={styles.tabsRow}>
            {[['all', ['mk.kind.all', 'Everything']],
              ...Object.entries(KIND_WORDS)].map(([key, words]) => (
              <button
                key={key}
                type="button"
                aria-pressed={kind === key}
                className={`${styles.tabBtn} ${kind === key ? styles.tabBtnActive : ''}`}
                onClick={() => { setKind(key); setPage(1); }}>
                {tt(words[0], words[1])}
              </button>
            ))}
          </div>

          <div className={styles.contentLayout}>
            <aside className={styles.catSidebar}>
              <p className={styles.catGroupTitle}>{tt('mk.categories', 'Categories')}</p>
              <ul className={styles.catList}>
                <li>
                  <button type="button"
                          className={`${styles.catBtn} ${category === 'all' ? styles.catBtnActive : ''}`}
                          onClick={() => { setCategory('all'); setPage(1); }}>
                    <span>{tt('mk.cat.all', 'All categories')}</span>
                    <span className={styles.catCount}>{counts.all || 0}</span>
                  </button>
                </li>
                {categories.map(c => {
                  const words = CATEGORY_WORDS[c.key] || [`mk.cat.${c.key}`, c.label];
                  return (
                    <li key={c.key}>
                      <button type="button"
                              className={`${styles.catBtn} ${category === c.key ? styles.catBtnActive : ''}`}
                              onClick={() => { setCategory(c.key); setPage(1); }}>
                        <span>{tt(words[0], words[1])}</span>
                        <span className={styles.catCount}>{counts[c.key] || 0}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </aside>

            <div>
              <div className={styles.filterBar}>
                <span className={styles.filterLabel}>{tt('mk.price', 'Price (VC)')}</span>
                <input type="number" className={styles.priceInput} value={minPrice}
                       aria-label={tt('mk.minPrice', 'Lowest price')}
                       placeholder={tt('mk.min', 'Min')}
                       onChange={e => { setMinPrice(e.target.value); setPage(1); }} />
                <input type="number" className={styles.priceInput} value={maxPrice}
                       aria-label={tt('mk.maxPrice', 'Highest price')}
                       placeholder={tt('mk.max', 'Max')}
                       onChange={e => { setMaxPrice(e.target.value); setPage(1); }} />

                <span className={styles.filterLabel}>{tt('mk.sellerRating', 'Seller rating')}</span>
                <div className={styles.filterSelect}>
                  <select className={styles.select} value={minRating}
                          aria-label={tt('mk.sellerRating', 'Seller rating')}
                          onChange={e => { setMinRating(e.target.value); setPage(1); }}>
                    <option value="">{tt('mk.anyRating', 'Any')}</option>
                    <option value="4">{tt('mk.rating4', '4 and above')}</option>
                    <option value="4.5">{tt('mk.rating45', '4.5 and above')}</option>
                  </select>
                  <TiArrowSortedDown className={styles.selectCaret} aria-hidden="true" />
                </div>

                <span className={styles.filterLabel} style={{ marginLeft: 'auto' }}>
                  {tt('mk.sort', 'Sort')}
                </span>
                <div className={styles.filterSelect}>
                  <select className={styles.select} value={sort}
                          aria-label={tt('mk.sort', 'Sort')}
                          onChange={e => { setSort(e.target.value); setPage(1); }}>
                    <option value="newest">{tt('mk.sortNewest', 'Newest')}</option>
                    <option value="price_asc">{tt('mk.sortLow', 'Price: low to high')}</option>
                    <option value="price_desc">{tt('mk.sortHigh', 'Price: high to low')}</option>
                    <option value="ending_soonest">{tt('mk.sortEnding', 'Ending soonest')}</option>
                  </select>
                  <TiArrowSortedDown className={styles.selectCaret} aria-hidden="true" />
                </div>

                <button type="button" className={styles.pageBtn} onClick={watchThisSearch}>
                  {tt('mk.tellMe', 'Tell me when one appears')}
                </button>

                <span className={styles.resultsCount}>
                  {loading
                    ? tt('ui.loading.33ce', 'Loading…')
                    : fill(tt('mk.count', '{n} listings'), { n: sorted.length })}
                </span>
              </div>

              {problem && <p className={styles.stateText} role="alert">{problem}</p>}

              {loading ? (
                <p className={styles.stateText}>{tt('mk.loading', 'Looking through the city…')}</p>
              ) : paged.length === 0 ? (
                <p className={styles.stateText}>
                  {tt('mk.empty', 'Nothing matches that yet. Try fewer filters, or ask to be told when one appears.')}
                </p>
              ) : (
                <div className={styles.grid} style={{ marginTop: '1rem' }}>
                  {paged.map(l => (
                    <Link key={l.listing_id}
                          href={`/marketplace/listing/${l.slug || l.listing_id}`}
                          className={styles.card}>
                      <div className={styles.cardImageWrap}>
                        {l.cover
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={l.cover} alt={l.title}
                                 className={`${styles.cardImage} ${styles.cardImageActive}`} />
                          : <span className={styles.cardCategoryPill}>
                              {tt((CATEGORY_WORDS[l.category] || [])[0] || `mk.cat.${l.category}`,
                                  (CATEGORY_WORDS[l.category] || [])[1] || l.category)}
                            </span>}
                        {l.hoisted && <span className={styles.conditionBadge}>
                          {tt('mk.promoted', 'Promoted')}
                        </span>}
                      </div>

                      <div className={styles.cardBody}>
                        <h3 className={styles.cardTitle}>{l.title}</h3>
                        <div className={styles.cardPriceRow}>
                          <span className={styles.cardPrice}>{(l.price || 0).toLocaleString()}</span>
                          <span className={styles.cardPriceUnit}>VC</span>
                        </div>
                        <div className={styles.sellerMini}>
                          {/* `link={false}`: the whole card is already a link,
                              and an anchor inside an anchor is invalid markup
                              that React hydrates into something nobody
                              intended. The seller's own page is one tap away
                              from the listing. */}
                          <UserChip user={l.seller} size={24} link={false}
                                    nameClassName={styles.sellerHandle} />
                          {l.seller_record?.rating && (
                            <span className={styles.sellerRating}>
                              <FaStar aria-hidden="true" /> {l.seller_record.rating}
                            </span>
                          )}
                          <span className={styles.cardMetaRow}>
                            <FaEye aria-hidden="true" /> {l.views || 0}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {sorted.length > PAGE_SIZE && (
                <div className={styles.pagination}>
                  <button type="button" className={styles.pageBtn} disabled={pageSafe === 1}
                          aria-label={tt('mk.previous', 'Previous page')}
                          onClick={() => setPage(p => Math.max(1, p - 1))}>
                    <BsChevronLeft aria-hidden="true" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} type="button"
                            className={`${styles.pageBtn} ${pageSafe === n ? styles.pageBtnActive : ''}`}
                            aria-current={pageSafe === n ? 'page' : undefined}
                            onClick={() => setPage(n)}>
                      {n}
                    </button>
                  ))}
                  <button type="button" className={styles.pageBtn} disabled={pageSafe === totalPages}
                          aria-label={tt('mk.next', 'Next page')}
                          onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                    <BsChevronRight aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast} role="status">{toast}</div>}
    </div>
  );
};

const Marketplace = () => (
  <Suspense fallback={null}>
    <MarketplaceInner />
  </Suspense>
);

export default Marketplace;
