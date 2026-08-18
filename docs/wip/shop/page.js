'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaStar, FaRegHeart, FaHeart } from 'react-icons/fa';
import { RiShoppingCart2Line } from 'react-icons/ri';
import { BsChevronLeft, BsChevronRight } from 'react-icons/bs';
import { FiTruck, FiShield, FiTag, FiPackage } from 'react-icons/fi';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './shop.module.css';

const CART_STORAGE_KEY = 'shop_cart';
const WISHLIST_STORAGE_KEY = 'shop_wishlist';

const HERO_BANNERS = [
  {
    id: 'banner_drop',
    tag: 'V-ENT Official Drops',
    title: 'Wear it. Play it. Be Vermillion.',
    subtitle:
      'Drop 04 just landed. Premium apparel and gear engineered for African gamers.',
    cta: 'Shop new arrivals',
    href: '#new-arrivals',
    accent: 'red',
  },
  {
    id: 'banner_sale',
    tag: 'Limited time',
    title: 'Up to 25% off Gaming Gear.',
    subtitle:
      'Tournament-tested peripherals, mousepads, and headsets. Shop the sale before stock runs out.',
    cta: 'See on sale',
    href: '#on-sale',
    accent: 'green',
  },
  {
    id: 'banner_anime',
    tag: 'Anime Merch',
    title: 'Collector drops, freshly stocked.',
    subtitle:
      'Posters, figures, and vinyls from Tokyo Reaper, Vermillion Sky, and Eclipse Ronin.',
    cta: 'Browse anime merch',
    href: '#trending',
    accent: 'red',
  },
];

const CATEGORIES = [
  { key: 'Apparel', label: 'Apparel', emoji: 'A', gradient: 'linear-gradient(135deg, rgba(237,28,36,0.55), rgba(40,40,45,0.85))' },
  { key: 'Accessories', label: 'Accessories', emoji: 'B', gradient: 'linear-gradient(135deg, rgba(212, 175, 55,0.45), rgba(40,40,45,0.85))' },
  { key: 'Gaming Gear', label: 'Gaming Gear', emoji: 'G', gradient: 'linear-gradient(135deg, rgba(95,90,255,0.45), rgba(40,40,45,0.85))' },
  { key: 'Anime Merch', label: 'Anime Merch', emoji: 'M', gradient: 'linear-gradient(135deg, rgba(255,140,40,0.5), rgba(40,40,45,0.85))' },
  { key: 'Digital Goods', label: 'Digital Goods', emoji: 'D', gradient: 'linear-gradient(135deg, rgba(70,200,255,0.45), rgba(40,40,45,0.85))' },
];

const BRAND_STRIP = [
  'VERMILLION',
  'V-ENT OFFICIAL',
  'PRO TOUR',
  'TOKYO REAPER',
  'VC REWARDS',
  'NIGERIA FIRST',
];

// Cart count helper – reads localStorage (mirrors /shop/cart logic)
const readCartCount = () => {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return 0;
    return parsed.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  } catch (err) {
    return 0;
  }
};

const readWishlist = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const getDisplayPriceVc = (p) => p?.sale_price || p?.price_vent_coins || p?.price_vc || 0;
const getOriginalPriceVc = (p) => p?.price_vent_coins || p?.price_vc || 0;
const isOnSale = (p) => Boolean(p?.sale_price && p.sale_price < getOriginalPriceVc(p));

const ProductCard = ({ p, wishlist, onWishlistToggle }) => {
  const display = getDisplayPriceVc(p);
  const original = getOriginalPriceVc(p);
  const onSale = isOnSale(p);
  const inWishlist = wishlist.includes(p.id);

  return (
    <div className={styles.card}>
      <Link href={`/shop/product?id=${p.id}`} className={styles.cardImageLink}>
        <div className={styles.cardImageWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.images?.[0]} alt={p.name} className={styles.cardImage} />
          {onSale && <span className={styles.saleFlag}>Sale</span>}
          {p.new_drop && !onSale && <span className={styles.newFlag}>New</span>}
          {p.featured && !onSale && !p.new_drop && (
            <span className={styles.featuredFlag}>Featured</span>
          )}
        </div>
      </Link>
      <button
        type="button"
        className={`${styles.wishlistBtn} ${inWishlist ? styles.wishlistBtnActive : ''}`}
        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
        onClick={() => onWishlistToggle(p.id)}
      >
        {inWishlist ? <FaHeart /> : <FaRegHeart />}
      </button>
      <Link href={`/shop/product?id=${p.id}`} className={styles.cardBody}>
        <p className={styles.cardCategory}>{p.category}</p>
        <p className={styles.cardName}>{p.name}</p>
        <div className={styles.priceRow}>
          <span className={styles.priceVc}>{display.toLocaleString()}</span>
          <span className={styles.priceUnit}>VC</span>
          {onSale && (
            <span className={styles.priceStrike}>{original.toLocaleString()} VC</span>
          )}
        </div>
        <div className={styles.cardFooter}>
          <div className={styles.cardRating}>
            <FaStar /> {Number(p.rating || 0).toFixed(1)}
            <span className={styles.cardReviews}>({p.review_count || 0})</span>
          </div>
          <span className={styles.cardNgn}>
            &#8358;{(p.price_ngn || 0).toLocaleString()}
          </span>
        </div>
      </Link>
    </div>
  );
};

const Shop = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeBanner, setActiveBanner] = useState(0);
  const [cartCount, setCartCount] = useState(0);
  const [wishlist, setWishlist] = useState([]);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');
  const [activeCategory, setActiveCategory] = useState('');

  // Fetch products from /product/list/ (v2 mock — full schema with sale_price)
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/product/list/`);
        const data = await res.json();
        if (data?.status === 'success') {
          setProducts(data.data.products || []);
        }
      } catch (err) {
        console.error('Shop fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Hydrate cart + wishlist from storage
  useEffect(() => {
    setCartCount(readCartCount());
    setWishlist(readWishlist());

    const onStorage = (e) => {
      if (e.key === CART_STORAGE_KEY) setCartCount(readCartCount());
      if (e.key === WISHLIST_STORAGE_KEY) setWishlist(readWishlist());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Banner rotation
  useEffect(() => {
    const id = setInterval(
      () => setActiveBanner((i) => (i + 1) % HERO_BANNERS.length),
      6000,
    );
    return () => clearInterval(id);
  }, []);

  const filteredByCat = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  const newArrivals = useMemo(
    () =>
      [...filteredByCat]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 4),
    [filteredByCat],
  );
  const onSaleRow = useMemo(
    () => filteredByCat.filter((p) => isOnSale(p)).slice(0, 4),
    [filteredByCat],
  );
  const trending = useMemo(
    () =>
      [...filteredByCat]
        .filter((p) => p.featured || (p.review_count || 0) > 12)
        .sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
        .slice(0, 4),
    [filteredByCat],
  );

  const handleWishlistToggle = (productId) => {
    setWishlist((prev) => {
      const next = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      try {
        window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
      } catch (err) {
        // ignore quota errors
      }
      return next;
    });
  };

  const handleNewsletter = (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      setNewsletterStatus('Please enter a valid email.');
      return;
    }
    setNewsletterStatus(
      `Thanks! We&apos;ll send drops to ${newsletterEmail.replace(/&/g, '&amp;')}.`,
    );
    // Use plain text — but escape since it shows back on page
    setNewsletterStatus(`Thanks! Drops will land in ${newsletterEmail}.`);
    setNewsletterEmail('');
  };

  const banner = HERO_BANNERS[activeBanner];
  const accentClass =
    banner.accent === 'green' ? styles.heroBannerGreen : styles.heroBannerRed;

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {/* Top action bar — title + cart icon */}
          <div className={styles.topBar}>
            <div>
              <h1 className={styles.pageTitle}>V-ENT Shop</h1>
              <p className={styles.pageSubtitle}>
                Official merchandise, gaming gear, and anime drops. Pay with VENT
                COINS or Naira.
              </p>
            </div>
            <div className={styles.topBarActions}>
              <Link
                href="/shop/wishlist"
                className={styles.iconBtn}
                aria-label="Wishlist"
              >
                <FaRegHeart />
                {wishlist.length > 0 && (
                  <span className={styles.iconBadge}>{wishlist.length}</span>
                )}
              </Link>
              <Link
                href="/shop/orders"
                className={styles.iconBtnText}
                aria-label="Orders"
              >
                <FiPackage /> Orders
              </Link>
              <Link
                href="/shop/cart"
                className={styles.cartBtn}
                aria-label="Cart"
              >
                <RiShoppingCart2Line />
                <span>Cart</span>
                {cartCount > 0 && (
                  <span className={styles.cartBadge}>{cartCount}</span>
                )}
              </Link>
            </div>
          </div>

          {/* Hero carousel */}
          <section className={`${styles.heroBanner} ${accentClass}`}>
            <span className={styles.heroAccent} />
            <div className={styles.heroContent}>
              <span className={styles.heroTag}>{banner.tag}</span>
              <h2 className={styles.heroTitle}>{banner.title}</h2>
              <p className={styles.heroSubtitle}>{banner.subtitle}</p>
              <div className={styles.heroActions}>
                <a href={banner.href} className={`${styles.ctaBtn} redBTN`}>
                  {banner.cta}
                </a>
                <Link href="/shop/orders" className={styles.ghostBtn}>
                  Track an order
                </Link>
              </div>
            </div>
            <div className={styles.heroNav}>
              <button
                type="button"
                className={styles.heroNavBtn}
                onClick={() =>
                  setActiveBanner(
                    (i) => (i - 1 + HERO_BANNERS.length) % HERO_BANNERS.length,
                  )
                }
                aria-label="Previous banner"
              >
                <BsChevronLeft />
              </button>
              <div className={styles.heroDots}>
                {HERO_BANNERS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Banner ${i + 1}`}
                    className={`${styles.heroDot} ${
                      i === activeBanner ? styles.heroDotActive : ''
                    }`}
                    onClick={() => setActiveBanner(i)}
                  />
                ))}
              </div>
              <button
                type="button"
                className={styles.heroNavBtn}
                onClick={() =>
                  setActiveBanner((i) => (i + 1) % HERO_BANNERS.length)
                }
                aria-label="Next banner"
              >
                <BsChevronRight />
              </button>
            </div>
          </section>

          {/* Category tiles */}
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <h2 className={styles.sectionTitle}>Shop by category</h2>
                <p className={styles.sectionSub}>
                  Pick a vibe — apparel for every-day, gear for tournament day.
                </p>
              </div>
              {activeCategory && (
                <button
                  type="button"
                  className={styles.clearChip}
                  onClick={() => setActiveCategory('')}
                >
                  Clear filter
                </button>
              )}
            </div>
            <div className={styles.categoryGrid}>
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`${styles.categoryTile} ${
                    activeCategory === c.key ? styles.categoryTileActive : ''
                  }`}
                  style={{ background: c.gradient }}
                  onClick={() =>
                    setActiveCategory((cur) => (cur === c.key ? '' : c.key))
                  }
                >
                  <span className={styles.categoryEmoji}>{c.emoji}</span>
                  <span className={styles.categoryLabel}>{c.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* New Arrivals */}
          <section id="new-arrivals" className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <h2 className={styles.sectionTitle}>New arrivals</h2>
                <p className={styles.sectionSub}>
                  Fresh drops added this week.
                </p>
              </div>
              <Link href="/shop/orders" className={styles.viewAllLink}>
                Track orders
              </Link>
            </div>
            {loading ? (
              <p className={styles.stateText}>Loading products&hellip;</p>
            ) : newArrivals.length === 0 ? (
              <p className={styles.stateText}>
                No products in this category yet.
              </p>
            ) : (
              <div className={styles.productRow}>
                {newArrivals.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    wishlist={wishlist}
                    onWishlistToggle={handleWishlistToggle}
                  />
                ))}
              </div>
            )}
          </section>

          {/* On Sale */}
          <section id="on-sale" className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <h2 className={styles.sectionTitle}>On sale</h2>
                <p className={styles.sectionSub}>
                  Limited-time prices on tournament-tested gear.
                </p>
              </div>
            </div>
            {loading ? (
              <p className={styles.stateText}>Loading products&hellip;</p>
            ) : onSaleRow.length === 0 ? (
              <p className={styles.stateText}>
                Nothing on sale right now &mdash; check back soon.
              </p>
            ) : (
              <div className={styles.productRow}>
                {onSaleRow.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    wishlist={wishlist}
                    onWishlistToggle={handleWishlistToggle}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Trending */}
          <section id="trending" className={styles.section}>
            <div className={styles.sectionHead}>
              <div>
                <h2 className={styles.sectionTitle}>Trending</h2>
                <p className={styles.sectionSub}>
                  What V-ENT pros and the community are buying.
                </p>
              </div>
            </div>
            {loading ? (
              <p className={styles.stateText}>Loading products&hellip;</p>
            ) : trending.length === 0 ? (
              <p className={styles.stateText}>
                No trending items in this filter.
              </p>
            ) : (
              <div className={styles.productRow}>
                {trending.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    wishlist={wishlist}
                    onWishlistToggle={handleWishlistToggle}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Trust strip */}
          <section className={styles.trustStrip}>
            <div className={styles.trustItem}>
              <FiTruck className={styles.trustIcon} />
              <div>
                <p className={styles.trustTitle}>Africa-wide shipping</p>
                <p className={styles.trustSub}>3&ndash;5 business days.</p>
              </div>
            </div>
            <div className={styles.trustItem}>
              <FiShield className={styles.trustIcon} />
              <div>
                <p className={styles.trustTitle}>Secure checkout</p>
                <p className={styles.trustSub}>VC, Paystack, COD.</p>
              </div>
            </div>
            <div className={styles.trustItem}>
              <FiTag className={styles.trustIcon} />
              <div>
                <p className={styles.trustTitle}>Earn 5% back</p>
                <p className={styles.trustSub}>VENT COINS on every order.</p>
              </div>
            </div>
            <div className={styles.trustItem}>
              <FiPackage className={styles.trustIcon} />
              <div>
                <p className={styles.trustTitle}>14-day returns</p>
                <p className={styles.trustSub}>No-fuss returns policy.</p>
              </div>
            </div>
          </section>

          {/* Brand strip */}
          <section className={styles.brandStripSection} aria-label="Brand strip">
            <div className={styles.brandStrip}>
              {[...BRAND_STRIP, ...BRAND_STRIP].map((b, i) => (
                <span key={i} className={styles.brandStripItem}>
                  {b}
                </span>
              ))}
            </div>
          </section>

          {/* Newsletter */}
          <section className={styles.newsletter}>
            <div className={styles.newsletterCopy}>
              <h2 className={styles.newsletterTitle}>Get drops first.</h2>
              <p className={styles.newsletterSub}>
                Subscribe to V-ENT Drops &mdash; new merch, sales, and limited
                editions before anyone else.
              </p>
            </div>
            <form className={styles.newsletterForm} onSubmit={handleNewsletter}>
              <input
                type="email"
                placeholder="you@v-ent.co"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className={styles.newsletterInput}
                aria-label="Email address"
              />
              <button type="submit" className={`${styles.newsletterBtn} redBTN`}>
                Subscribe
              </button>
              {newsletterStatus && (
                <p className={styles.newsletterStatus}>{newsletterStatus}</p>
              )}
            </form>
          </section>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default Shop;
