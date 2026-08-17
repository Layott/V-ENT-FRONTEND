'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BsChevronLeft } from 'react-icons/bs';
import { FaStar, FaHeart, FaRegHeart } from 'react-icons/fa';
import { RiShoppingCart2Line } from 'react-icons/ri';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './wishlist.module.css';

const CART_STORAGE_KEY = 'shop_cart';
const WISHLIST_STORAGE_KEY = 'shop_wishlist';

const getDisplayPriceVc = (p) => p?.sale_price || p?.price_vent_coins || p?.price_vc || 0;
const getOriginalPriceVc = (p) => p?.price_vent_coins || p?.price_vc || 0;
const isOnSale = (p) => Boolean(p?.sale_price && p.sale_price < getOriginalPriceVc(p));

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

const readCart = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};

const writeCart = (items) => {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY }));
  } catch (err) {
    // ignore
  }
};

const WishlistPage = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [wishlistIds, setWishlistIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Hydrate ids
  useEffect(() => {
    setWishlistIds(readWishlist());
    const onStorage = (e) => {
      if (!e.key || e.key === WISHLIST_STORAGE_KEY) {
        setWishlistIds(readWishlist());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Pull product list once
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/product/list/?page_size=50`,
        );
        const data = await res.json();
        if (data?.status === 'success') {
          setAllProducts(data.data.products || []);
        }
      } catch (err) {
        console.error('Wishlist fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const items = useMemo(() => {
    return wishlistIds
      .map((id) => allProducts.find((p) => p.id === id))
      .filter(Boolean);
  }, [wishlistIds, allProducts]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleRemove = (productId) => {
    setWishlistIds((prev) => {
      const next = prev.filter((id) => id !== productId);
      try {
        window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(
          new StorageEvent('storage', { key: WISHLIST_STORAGE_KEY }),
        );
      } catch (err) {
        // ignore
      }
      return next;
    });
    showToast('Removed from wishlist.');
  };

  const handleClearAll = () => {
    setWishlistIds([]);
    try {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify([]));
      window.dispatchEvent(
        new StorageEvent('storage', { key: WISHLIST_STORAGE_KEY }),
      );
    } catch (err) {
      // ignore
    }
    showToast('Wishlist cleared.');
  };

  const handleAddToCart = (product) => {
    if (!product) return;
    const existing = readCart();
    const variant =
      product.variants?.length > 0
        ? {
            size: product.variants[0]?.size || null,
            color: product.variants[0]?.color || null,
          }
        : null;
    const matchKey = (it) =>
      it.product_id === product.id &&
      JSON.stringify(it.variant || null) === JSON.stringify(variant);
    const found = existing.find(matchKey);
    let next;
    const display = getDisplayPriceVc(product);
    if (found) {
      next = existing.map((it) =>
        matchKey(it) ? { ...it, qty: Math.min(10, it.qty + 1) } : it,
      );
    } else {
      next = [
        ...existing,
        {
          id: `cartitem_${Date.now()}`,
          product_id: product.id,
          product: {
            id: product.id,
            name: product.name,
            images: product.images,
            price_vc: display,
            price_ngn: product.price_ngn,
            sale_price: product.sale_price || null,
            price_vent_coins: getOriginalPriceVc(product),
          },
          variant,
          qty: 1,
        },
      ];
    }
    writeCart(next);
    showToast(`Added ${product.name} to cart.`);

    // best-effort backend ping
    try {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/shop/cart/add/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id, qty: 1, variant }),
      });
    } catch (err) {
      // ignore
    }
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Link href="/shop" className={styles.backLink}>
            <BsChevronLeft /> Back to shop
          </Link>

          <div className={styles.headRow}>
            <div>
              <h1 className={styles.title}>Your wishlist</h1>
              <p className={styles.subTitle}>
                {items.length === 0
                  ? 'Save items you love &mdash; we&apos;ll keep them here.'
                  : `${items.length} ${items.length === 1 ? 'item' : 'items'} saved.`}
              </p>
            </div>
            {items.length > 0 && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClearAll}
              >
                Clear all
              </button>
            )}
          </div>

          {toast && <div className={styles.toast}>{toast}</div>}

          {loading ? (
            <div className={styles.emptyState}>
              <p className={styles.emptySub}>Loading wishlist&hellip;</p>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <FaRegHeart />
              </div>
              <h2 className={styles.emptyTitle}>Nothing saved yet</h2>
              <p className={styles.emptySub}>
                Tap the heart icon on a product to save it for later.
              </p>
              <Link href="/shop" className={`${styles.shopBtn} goldBTN`}>
                Browse the shop
              </Link>
            </div>
          ) : (
            <div className={styles.grid}>
              {items.map((p) => {
                const display = getDisplayPriceVc(p);
                const original = getOriginalPriceVc(p);
                const onSale = isOnSale(p);
                return (
                  <div key={p.id} className={styles.card}>
                    <Link
                      href={`/shop/product?id=${p.id}`}
                      className={styles.cardImageLink}
                    >
                      <div className={styles.cardImageWrap}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.images?.[0]}
                          alt={p.name}
                          className={styles.cardImage}
                        />
                        {onSale && <span className={styles.flag}>Sale</span>}
                      </div>
                    </Link>
                    <button
                      type="button"
                      className={styles.heartBtn}
                      aria-label="Remove from wishlist"
                      onClick={() => handleRemove(p.id)}
                    >
                      <FaHeart />
                    </button>
                    <div className={styles.cardBody}>
                      <p className={styles.cardCategory}>{p.category}</p>
                      <Link
                        href={`/shop/product?id=${p.id}`}
                        className={styles.cardName}
                      >
                        {p.name}
                      </Link>
                      <div className={styles.priceRow}>
                        <span className={styles.priceVc}>
                          {display.toLocaleString()}
                        </span>
                        <span className={styles.priceUnit}>VC</span>
                        {onSale && (
                          <span className={styles.priceStrike}>
                            {original.toLocaleString()} VC
                          </span>
                        )}
                      </div>
                      <div className={styles.cardRating}>
                        <FaStar />{' '}
                        {Number(p.rating || 0).toFixed(1)}{' '}
                        <span className={styles.cardReviews}>
                          ({p.review_count || 0} reviews)
                        </span>
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={`${styles.cartBtn} goldBTN`}
                          onClick={() => handleAddToCart(p)}
                        >
                          <RiShoppingCart2Line /> Add to cart
                        </button>
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={() => handleRemove(p.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default WishlistPage;
