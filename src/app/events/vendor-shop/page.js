'use client';

import { appLocale } from '@/lib/appLocale';
import { mediaUrl } from '@/lib/mediaUrl';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { FiShoppingCart, FiSearch } from 'react-icons/fi';
import { FaStore, FaFire, FaCheckCircle } from 'react-icons/fa';
import { IoLocationOutline, IoArrowBack } from 'react-icons/io5';
import { TiArrowSortedDown } from 'react-icons/ti';
import { MdOutlineClose } from 'react-icons/md';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from './vendor-shop.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const CART_STORAGE_KEY = eventId => `vendor_cart_${eventId || 'unknown'}`;
const VendorShopContent = ({
  slug: slugFromPath
}) => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data: session
  } = useSession();
  const initialEventId = slugFromPath || searchParams.get('id') || '';
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(initialEventId);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  // Cart state - local to vendor-shop session, persisted in localStorage per event.
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  // What just happened, on the page rather than in a browser alert.
  const [reserved, setReserved] = useState('');

  // Featured product modal
  const [activeProduct, setActiveProduct] = useState(null);
  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${session?.user?.sessionToken || ''}`,
    'Content-Type': 'application/json'
  }), [session?.user?.sessionToken]);

  // Load events for selector
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/get-all-events/`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (data.status === 'success') {
          const list = data.data.events || data.data.upcoming || (Array.isArray(data.data) ? data.data : []);
          setEvents(list);
          if (!eventId && list.length) {
            setEventId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Events fetch error:', err);
      }
    };
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load vendors for selected event
  useEffect(() => {
    if (!eventId) return;
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/${eventId}/vendors/`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (data.status === 'success') {
          setVendors(data.data.vendors || []);
        }
      } catch (err) {
        console.error('Vendors fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, [eventId, authHeaders]);

  // Hydrate cart from localStorage
  useEffect(() => {
    if (!eventId || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY(eventId));
      setCart(raw ? JSON.parse(raw) : []);
    } catch {
      setCart([]);
    }
  }, [eventId]);

  // Persist cart
  useEffect(() => {
    if (!eventId || typeof window === 'undefined') return;
    localStorage.setItem(CART_STORAGE_KEY(eventId), JSON.stringify(cart));
  }, [cart, eventId]);

  // Sync ?id= param when changing events
  useEffect(() => {
    if (!eventId) return;
    const params = new URLSearchParams();
    params.set('id', eventId);
    router.replace(`/events/vendor-shop?${params.toString()}`, {
      scroll: false
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);
  const allProducts = useMemo(() => {
    const items = [];
    vendors.forEach(v => {
      (v.products || []).forEach(p => {
        items.push({
          ...p,
          vendor_id: v.id,
          vendor_name: v.name,
          category: p.category || v.category
        });
      });
    });
    return items;
  }, [vendors]);
  const featuredProducts = useMemo(() => allProducts.slice(0, 8), [allProducts]);
  const categories = useMemo(() => {
    const set = new Set();
    vendors.forEach(v => v.category && set.add(v.category));
    allProducts.forEach(p => p.category && set.add(p.category));
    return ['', ...Array.from(set)];
  }, [vendors, allProducts]);
  const filteredVendors = useMemo(() => {
    let out = [...vendors];
    if (category) out = out.filter(v => v.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(v => (v.name || '').toLowerCase().includes(q) || (v.category || '').toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q));
    }
    return out;
  }, [vendors, category, search]);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const cartTotal = cart.reduce((sum, i) => sum + i.qty * Number(i.price || 0), 0);
  const addToCart = product => {
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => p.id === product.id ? {
          ...p,
          qty: p.qty + 1
        } : p);
      }
      return [...prev, {
        ...product,
        qty: 1
      }];
    });
    setActiveProduct(null);
  };
  const updateQty = (id, delta) => {
    setCart(prev => prev.map(p => p.id === id ? {
      ...p,
      qty: Math.max(0, p.qty + delta)
    } : p).filter(p => p.qty > 0));
  };
  const removeItem = id => {
    setCart(prev => prev.filter(p => p.id !== id));
  };
  const clearCart = () => setCart([]);
  const currentEvent = events.find(e => e.id === eventId);
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Header row with back link, title, cart */}
          <div className={styles.topRow}>
            <Link href="/events" className={styles.backLink}>
              <IoArrowBack /> {tt("ui.back.events.bd9a", "Back to events")}
            </Link>
            <button className={styles.cartBtn} onClick={() => setCartOpen(true)} type="button">
              <FiShoppingCart /> {tt("ui.cart.4465", "Cart")}
              {cartCount > 0 && <span className={styles.cartBadge}>{cartCount}</span>}
            </button>
          </div>

          <div className={styles.headerRow}>
            <div>
              <h1 className={styles.pageTitle}>
                <FaStore className={styles.titleIcon} /> {tt("ui.vendor.shop.5290", "Vendor Shop")}
              </h1>
              <p className={styles.pageSub}>
                {tt("ui.temporary.marketplace.event.site.6415", "Temporary marketplace for the event. On-site pickup or VIP delivery.")}
              </p>
            </div>

            {events.length > 0 && <div className={styles.eventPicker}>
                <label className={styles.eventLabel}>{tt("ui.event.ad89", "Event")}</label>
                <div className={styles.selectWrap}>
                  <select className={styles.eventSelect} value={eventId} onChange={e => setEventId(e.target.value)}>
                    {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <TiArrowSortedDown className={styles.selectCaret} />
                </div>
              </div>}
          </div>

          {currentEvent && <div className={styles.eventMeta}>
              <IoLocationOutline /> {currentEvent.location} •{' '}
              {new Date(currentEvent.start_date).toLocaleDateString(appLocale(), {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
            </div>}

          {/* Featured products row */}
          {featuredProducts.length > 0 && <div className={styles.featuredSection}>
              <h2 className={styles.sectionTitle}>
                <FaFire className={styles.fireIcon} /> {tt("ui.featured.drops.e2f3", "Featured drops")}
              </h2>
              <div className={styles.featuredScroll}>
                {featuredProducts.map(p => <button key={p.id} className={styles.featuredProduct} onClick={() => setActiveProduct(p)} type="button">
                    <div className={styles.featuredImgWrap}>
                      {p.image ? <Image src={mediaUrl(p.image)} alt={p.name} fill sizes="200px" style={{
                  objectFit: 'cover'
                }} unoptimized /> : <div className={styles.featuredImgFallback}><FaStore /></div>}
                      {!p.in_stock && <span className={styles.oosBadge}>{tt("ui.sold.out.02ff", "Sold out")}</span>}
                    </div>
                    <p className={styles.featuredName}>{p.name}</p>
                    <p className={styles.featuredVendor}>{p.vendor_name}</p>
                    <p className={styles.featuredPrice}>
                      {Number(p.price || 0).toLocaleString()} VC
                    </p>
                  </button>)}
              </div>
            </div>}

          {/* Search + category filters */}
          <div className={styles.controlsRow}>
            <div className={styles.searchBar}>
              <FiSearch className={styles.searchIcon} />
              <input type="text" placeholder={tt("ui.search.vendors.2237", "Search vendors…")} value={search} onChange={e => setSearch(e.target.value)} className={styles.searchInput} />
            </div>
            <div className={styles.categoryRow}>
              {categories.map(c => <button key={c || 'all'} className={`${styles.categoryBtn} ${category === c ? styles.categoryBtnActive : ''}`} onClick={() => setCategory(c)} type="button">
                  {c || 'All'}
                </button>)}
            </div>
          </div>

          {/* Vendor grid */}
          <div className={styles.gridSection}>
            <div className={styles.gridHeader}>
              <h2 className={styles.sectionTitle}>{tt("ui.vendors.event.e1c0", "Vendors at this event")}</h2>
              <span className={styles.resultCount}>
                {loading ? tx("Loading…") : `${filteredVendors.length} vendors`}
              </span>
            </div>

            {loading ? <p className={styles.stateText}>{tt("ui.loading.vendors.f958", "Loading vendors…")}</p> : filteredVendors.length === 0 ? <div className={styles.emptyState}>
                <FaStore className={styles.emptyIcon} />
                <p className={styles.emptyTitle}>{tt("ui.no.vendors.match.d26c", "No vendors match.")}</p>
                <p className={styles.emptySub}>{tt("ui.try.different.category.clear.1b19", "Try a different category or clear the search.")}</p>
              </div> : <div className={styles.vendorGrid}>
                {filteredVendors.map(v => <Link key={v.id} href={`/events/vendor-shop/vendor?event=${eventId}&vendor=${v.id}`} className={styles.vendorCard}>
                    <div className={styles.vendorBannerWrap}>
                      {v.banner ? <Image src={mediaUrl(v.banner)} alt={v.name} fill sizes="(min-width: 1024px) 33vw, 100vw" style={{
                  objectFit: 'cover'
                }} unoptimized /> : <div className={styles.bannerFallback}><FaStore /></div>}
                      <span className={`${styles.statusPill} ${styles['status_' + v.status]}`}>
                        {v.status}
                      </span>
                    </div>
                    <div className={styles.vendorBody}>
                      <div className={styles.vendorHead}>
                        {v.logo ? <Image src={mediaUrl(v.logo)} alt={v.name} width={44} height={44} className={styles.vendorLogo} unoptimized /> : <div className={styles.vendorLogoPlaceholder}><FaStore /></div>}
                        <div>
                          <p className={styles.vendorName}>{v.name}</p>
                          <p className={styles.vendorMeta}>
                            {v.category} {tt("ui.booth.9c19", "• Booth")} {v.booth || v.booth_number}
                          </p>
                        </div>
                      </div>
                      <p className={styles.vendorDesc}>{tx(v.description)}</p>
                      <div className={styles.vendorFoot}>
                        <span className={styles.productCount}>
                          {v.products?.length || 0} {tt("ui.products.fbdc", "products")}
                        </span>
                        <span className={styles.viewLink}>{tt("ui.view.stall.d3b1", "View stall →")}</span>
                      </div>
                    </div>
                  </Link>)}
              </div>}
          </div>
        </div>
      </main>

      {reserved && <div className={styles.reservedNote} role="status">{reserved}</div>}

      <BottomMenu />

      {/* Product modal */}
      {activeProduct && <div className={styles.modalOverlay} onClick={e => {
      if (e.target === e.currentTarget) setActiveProduct(null);
    }}>
          <div className={styles.productModal}>
            <button className={styles.modalCloseAbs} onClick={() => setActiveProduct(null)} type="button" aria-label={tt("ui.close.bbfa", "Close")}>
              <MdOutlineClose />
            </button>
            <div className={styles.productModalImgWrap}>
              {activeProduct.image ? <Image src={mediaUrl(activeProduct.image)} alt={activeProduct.name} fill sizes="400px" style={{
            objectFit: 'cover'
          }} unoptimized /> : <div className={styles.featuredImgFallback}><FaStore /></div>}
            </div>
            <div className={styles.productModalBody}>
              <p className={styles.productModalVendor}>{activeProduct.vendor_name}</p>
              <h2 className={styles.productModalName}>{activeProduct.name}</h2>
              <p className={styles.productModalPrice}>
                {Number(activeProduct.price || 0).toLocaleString()} VC
              </p>
              <p className={styles.productModalDesc}>
                {activeProduct.description || tx("Vendor-exclusive item, on-site only.")}
              </p>
              <div className={styles.productModalActions}>
                <button className={`${styles.addToCartBtn} goldBTN`} onClick={() => addToCart(activeProduct)} disabled={!activeProduct.in_stock} type="button">
                  {activeProduct.in_stock ? tx("Add to cart") : tx("Sold out")}
                </button>
                <Link href={`/events/vendor-shop/vendor?event=${eventId}&vendor=${activeProduct.vendor_id}`} className={styles.viewVendorBtn}>
                  {tt("ui.visit.stall.f79e", "Visit stall")}
                </Link>
              </div>
            </div>
          </div>
        </div>}

      {/* Cart drawer */}
      {cartOpen && <div className={styles.modalOverlay} onClick={e => {
      if (e.target === e.currentTarget) setCartOpen(false);
    }}>
          <aside className={styles.cartDrawer}>
            <div className={styles.cartHeader}>
              <h2 className={styles.cartTitle}>{tt("ui.cart.a543", "Your cart")}</h2>
              <button className={styles.modalCloseAbs} style={{
            position: 'static'
          }} onClick={() => setCartOpen(false)} type="button" aria-label={tt("ui.close.cart.42cb", "Close cart")}>
                <MdOutlineClose />
              </button>
            </div>

            <div className={styles.cartBody}>
              {cart.length === 0 ? <p className={styles.cartEmpty}>
                  {tt("ui.cart.empty.add.product.e7ac", "Your cart is empty. Add a product from any vendor stall.")}
                </p> : <ul className={styles.cartList}>
                  {cart.map(item => <li key={item.id} className={styles.cartRow}>
                      <div className={styles.cartImgWrap}>
                        {item.image ? <Image src={mediaUrl(item.image)} alt={item.name} width={56} height={56} style={{
                  objectFit: 'cover'
                }} unoptimized /> : <div className={styles.featuredImgFallback}><FaStore /></div>}
                      </div>
                      <div className={styles.cartItemBody}>
                        <p className={styles.cartItemName}>{item.name}</p>
                        <p className={styles.cartItemVendor}>{item.vendor_name}</p>
                        <div className={styles.cartItemFoot}>
                          <div className={styles.qtyControl}>
                            <button onClick={() => updateQty(item.id, -1)} type="button" aria-label={tt("ui.decrease.quantity.6c02", "Decrease quantity")}>−</button>
                            <span>{item.qty}</span>
                            <button onClick={() => updateQty(item.id, 1)} type="button" aria-label={tt("ui.increase.quantity.062e", "Increase quantity")}>+</button>
                          </div>
                          <span className={styles.cartItemPrice}>
                            {(item.qty * Number(item.price || 0)).toLocaleString()} VC
                          </span>
                        </div>
                      </div>
                      <button className={styles.removeBtn} onClick={() => removeItem(item.id)} type="button" aria-label={tt("ui.remove.e963", "Remove")}>
                        <MdOutlineClose />
                      </button>
                    </li>)}
                </ul>}
            </div>

            <div className={styles.cartFooter}>
              <div className={styles.cartTotalRow}>
                <span>{tt("ui.subtotal.97f7", "Subtotal")}</span>
                <strong>{cartTotal.toLocaleString()} VC</strong>
              </div>
              <button className={`${styles.checkoutBtn} redBTN`} disabled={cart.length === 0} onClick={() => {
            setReserved(tt("msg.checkoutReserved", "Items reserved at the vendor booths. Pay on pickup with your V-ENT wallet."));
            setTimeout(() => setReserved(''), 5000);
            clearCart();
            setCartOpen(false);
          }} type="button">
                <FaCheckCircle /> {tt("ui.reserve.booths.8f34", "Reserve at booths")}
              </button>
              {cart.length > 0 && <button className={styles.clearBtn} onClick={clearCart} type="button">
                  {tt("ui.clear.cart.40b6", "Clear cart")}
                </button>}
            </div>
          </aside>
        </div>}
    </div>;
};
const VendorShop = () => {
  const tt = useT();
  return <Suspense fallback={<div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>{tt("ui.loading.vendor.shop.8ec2", "Loading vendor shop…")}</p>
          </div>
        </main>
        <BottomMenu />
      </div>}>
    <VendorShopContent />
  </Suspense>;
};
export default VendorShop;

// Exported so the slug route can render it. Everything a person
// clicks still lives here; the route file only supplies the address.
export { VendorShopContent };