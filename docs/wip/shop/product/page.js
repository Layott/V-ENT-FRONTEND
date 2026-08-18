'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaStar, FaRegHeart, FaHeart } from 'react-icons/fa';
import {
  BsChevronLeft,
  BsChevronRight,
  BsCheck2,
  BsShare,
} from 'react-icons/bs';
import { RiShoppingCart2Line } from 'react-icons/ri';
import { FiTruck, FiShield, FiPackage } from 'react-icons/fi';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './product.module.css';

const CART_STORAGE_KEY = 'shop_cart';
const WISHLIST_STORAGE_KEY = 'shop_wishlist';

const uniq = (arr) => Array.from(new Set(arr.filter(Boolean)));

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
  } catch (err) {
    // ignore
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

const ProductInner = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id') || 'prdx_0';

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [toast, setToast] = useState('');
  const [adding, setAdding] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [shareNote, setShareNote] = useState('');

  // Hydrate wishlist
  useEffect(() => {
    setWishlist(readWishlist());
  }, []);

  // Fetch product (try v2 endpoint first, fall back to /shop/products)
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      let data = null;
      try {
        let res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/product/${id}/`,
        );
        data = await res.json();
        if (data?.status !== 'success' || !data?.data?.product) {
          // fallback
          res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/shop/products/${id}/`,
          );
          data = await res.json();
        }
      } catch (err) {
        console.error('Product fetch error:', err);
      }

      if (data?.status === 'success' && data?.data?.product) {
        const p = data.data.product;
        setProduct(p);
        setRelated(data.data.related || []);
        setActiveImg(0);
        const firstVar = p.variants?.[0];
        if (firstVar) {
          setSize(firstVar.size || '');
          setColor(firstVar.color || '');
        } else {
          setSize('');
          setColor('');
        }
        setQty(1);
      }
      setLoading(false);
    };
    fetchProduct();
  }, [id]);

  // Reset state when product id changes mid-view (e.g. clicking a related card)
  useEffect(() => {
    setToast('');
    setShareNote('');
  }, [id]);

  const sizes = useMemo(
    () => uniq(product?.variants?.map((v) => v.size) || []),
    [product],
  );
  const colors = useMemo(
    () => uniq(product?.variants?.map((v) => v.color) || []),
    [product],
  );

  // Resolve currently-selected variant + its stock
  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    return (
      product.variants.find(
        (v) =>
          (sizes.length ? v.size === size : true) &&
          (colors.length ? v.color === color : true),
      ) || null
    );
  }, [product, size, color, sizes, colors]);

  const variantStock = selectedVariant?.stock ?? product?.stock ?? 0;
  const inStock = variantStock > 0;
  const maxQty = Math.min(10, variantStock || 10);

  const display = getDisplayPriceVc(product);
  const original = getOriginalPriceVc(product);
  const onSale = isOnSale(product);

  const handleQtyChange = (delta) => {
    setQty((q) => Math.max(1, Math.min(maxQty, q + delta)));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  };

  const handleAddToCart = async (andCheckout = false) => {
    if (!product || !inStock) return;
    setAdding(true);

    // Local cart write — single source of truth so cart count + cart page sync
    const existing = readCart();
    const variant =
      sizes.length || colors.length ? { size: size || null, color: color || null } : null;
    const matchKey = (it) =>
      it.product_id === product.id &&
      JSON.stringify(it.variant || null) === JSON.stringify(variant);
    const found = existing.find(matchKey);
    let next;
    if (found) {
      next = existing.map((it) =>
        matchKey(it) ? { ...it, qty: Math.min(maxQty, it.qty + qty) } : it,
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
            price_vent_coins: original,
          },
          variant,
          qty,
        },
      ];
    }
    writeCart(next);
    // notify other tabs/components
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: CART_STORAGE_KEY }));
    } catch (err) {
      // older browsers
    }

    // best-effort backend ping (mock layer responds fine)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shop/cart/add/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          qty,
          variant,
        }),
      });
    } catch (err) {
      // mock layer covers this; ignore network errors
    }

    setAdding(false);
    if (andCheckout) {
      router.push('/shop/cart');
    } else {
      showToast(`Added ${qty} × ${product.name} to cart.`);
    }
  };

  const handleWishlistToggle = () => {
    if (!product) return;
    setWishlist((prev) => {
      const next = prev.includes(product.id)
        ? prev.filter((pid) => pid !== product.id)
        : [...prev, product.id];
      try {
        window.localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
        window.dispatchEvent(
          new StorageEvent('storage', { key: WISHLIST_STORAGE_KEY }),
        );
      } catch (err) {
        // ignore
      }
      showToast(
        prev.includes(product.id)
          ? 'Removed from wishlist.'
          : 'Saved to wishlist.',
      );
      return next;
    });
  };

  const handleShare = async () => {
    if (!product) return;
    const url =
      typeof window !== 'undefined' ? window.location.href : '';
    if (navigator?.share) {
      try {
        await navigator.share({ title: product.name, url });
        return;
      } catch (err) {
        // fall through to clipboard
      }
    }
    try {
      await navigator.clipboard?.writeText(url);
      setShareNote('Link copied to clipboard.');
      setTimeout(() => setShareNote(''), 2200);
    } catch (err) {
      setShareNote('Could not copy link.');
      setTimeout(() => setShareNote(''), 2200);
    }
  };

  const renderStars = (r) => {
    const rounded = Math.round(Number(r || 0));
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        style={{ opacity: i < rounded ? 1 : 0.25 }}
        aria-hidden="true"
      />
    ));
  };

  if (loading || !product) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>Loading product&hellip;</p>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  const isWishlisted = wishlist.includes(product.id);

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

          <div className={styles.layout}>
            {/* Gallery */}
            <div className={styles.gallery}>
              <div className={styles.thumbs}>
                {product.images?.slice(0, 4).map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    className={`${styles.thumb} ${
                      i === activeImg ? styles.thumbActive : ''
                    }`}
                    onClick={() => setActiveImg(i)}
                    aria-label={`Show image ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className={styles.thumbImg} />
                  </button>
                ))}
              </div>
              <div
                className={`${styles.mainImageWrap} ${
                  zoomed ? styles.mainImageWrapZoomed : ''
                }`}
                onMouseEnter={() => setZoomed(true)}
                onMouseLeave={() => setZoomed(false)}
                onClick={() => setZoomed((z) => !z)}
                role="button"
                tabIndex={0}
                aria-label="Zoom product image"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.images?.[activeImg]}
                  alt={product.name}
                  className={styles.mainImage}
                />
                <div className={styles.galleryNav}>
                  <button
                    type="button"
                    className={styles.galleryNavBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImg(
                        (i) =>
                          (i - 1 + (product.images?.length || 1)) %
                          (product.images?.length || 1),
                      );
                    }}
                    aria-label="Previous image"
                  >
                    <BsChevronLeft />
                  </button>
                  <button
                    type="button"
                    className={styles.galleryNavBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImg(
                        (i) => (i + 1) % (product.images?.length || 1),
                      );
                    }}
                    aria-label="Next image"
                  >
                    <BsChevronRight />
                  </button>
                </div>
                {onSale && <span className={styles.galleryFlag}>Sale</span>}
                {product.new_drop && !onSale && (
                  <span className={styles.galleryFlagNew}>New</span>
                )}
              </div>
            </div>

            {/* Right panel */}
            <div className={styles.panel}>
              <p className={styles.crumbs}>
                Shop &bull; <span>{product.category}</span>
              </p>
              <h1 className={styles.productName}>{product.name}</h1>

              <div className={styles.ratingRow}>
                <span className={styles.starsWrap}>
                  {renderStars(product.rating)}
                </span>
                <span className={styles.reviewCount}>
                  {Number(product.rating || 0).toFixed(1)} &middot;{' '}
                  {product.review_count || 0} reviews
                </span>
              </div>

              <div className={styles.priceRow}>
                <span className={styles.priceBig}>
                  {display.toLocaleString()}
                </span>
                <span className={styles.priceUnit}>VC</span>
                {onSale && (
                  <span className={styles.priceStrike}>
                    {original.toLocaleString()} VC
                  </span>
                )}
                <span className={styles.priceNgn}>
                  &#8358;{(product.price_ngn || 0).toLocaleString()}
                </span>
              </div>

              {/* Stock badge */}
              <div className={styles.stockRow}>
                {inStock ? (
                  <span className={styles.stockOk}>
                    <BsCheck2 /> In stock
                    {variantStock <= 5 ? ` — ${variantStock} left` : ''}
                  </span>
                ) : (
                  <span className={styles.stockOut}>Out of stock</span>
                )}
              </div>

              {/* Variants — sizes */}
              {sizes.length > 0 && (
                <div className={styles.variantGroup}>
                  <span className={styles.variantLabel}>
                    Size <span className={styles.variantHint}>{size}</span>
                  </span>
                  <div className={styles.variantRow}>
                    {sizes.map((s) => {
                      const variantForSize = product.variants.find(
                        (v) =>
                          v.size === s &&
                          (colors.length ? v.color === color : true),
                      );
                      const sStock = variantForSize?.stock ?? 0;
                      const disabled = sStock <= 0;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={disabled}
                          className={`${styles.variantChip} ${
                            size === s ? styles.variantChipActive : ''
                          } ${disabled ? styles.variantChipDisabled : ''}`}
                          onClick={() => setSize(s)}
                          aria-label={`Size ${s}${disabled ? ' (sold out)' : ''}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Variants — colors */}
              {colors.length > 0 && (
                <div className={styles.variantGroup}>
                  <span className={styles.variantLabel}>
                    Color <span className={styles.variantHint}>{color}</span>
                  </span>
                  <div className={styles.variantRow}>
                    {colors.map((c) => {
                      const variantForColor = product.variants.find(
                        (v) =>
                          v.color === c &&
                          (sizes.length ? v.size === size : true),
                      );
                      const cStock = variantForColor?.stock ?? 0;
                      const disabled = cStock <= 0;
                      return (
                        <button
                          key={c}
                          type="button"
                          disabled={disabled}
                          className={`${styles.colorChip} ${
                            color === c ? styles.colorChipActive : ''
                          } ${disabled ? styles.colorChipDisabled : ''}`}
                          onClick={() => setColor(c)}
                          aria-label={`Color ${c}${disabled ? ' (sold out)' : ''}`}
                          style={{
                            backgroundColor: c.toLowerCase().includes('red')
                              ? 'var(--v-ent-red)'
                              : c.toLowerCase().includes('black')
                                ? '#1a1a1d'
                                : c.toLowerCase().includes('white')
                                  ? '#f5f5f5'
                                  : '#5b5b60',
                          }}
                        >
                          <span className={styles.colorChipDot} />
                          <span className={styles.colorChipLabel}>{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className={styles.variantGroup}>
                <span className={styles.variantLabel}>Quantity</span>
                <div className={styles.qtyRow}>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    onClick={() => handleQtyChange(-1)}
                    aria-label="Decrease quantity"
                    disabled={qty <= 1}
                  >
                    -
                  </button>
                  <span className={styles.qtyValue}>{qty}</span>
                  <button
                    type="button"
                    className={styles.qtyBtn}
                    onClick={() => handleQtyChange(1)}
                    aria-label="Increase quantity"
                    disabled={qty >= maxQty}
                  >
                    +
                  </button>
                  <span className={styles.qtyHint}>Max {maxQty}</span>
                </div>
              </div>

              {/* CTAs */}
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={`${styles.primaryBtn} goldBTN`}
                  onClick={() => handleAddToCart(false)}
                  disabled={adding || !inStock}
                >
                  <RiShoppingCart2Line />
                  {adding ? 'Adding…' : 'Add to cart'}
                </button>
                <button
                  type="button"
                  className={`${styles.outlineBtn}`}
                  onClick={() => handleAddToCart(true)}
                  disabled={adding || !inStock}
                >
                  Buy now &middot; {(display * qty).toLocaleString()} VC
                </button>
                <button
                  type="button"
                  className={`${styles.iconAction} ${
                    isWishlisted ? styles.iconActionActive : ''
                  }`}
                  onClick={handleWishlistToggle}
                  aria-label={
                    isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'
                  }
                >
                  {isWishlisted ? <FaHeart /> : <FaRegHeart />}
                </button>
                <button
                  type="button"
                  className={styles.iconAction}
                  onClick={handleShare}
                  aria-label="Share product"
                >
                  <BsShare />
                </button>
              </div>

              {toast && <div className={styles.toast}>{toast}</div>}
              {shareNote && <div className={styles.toast}>{shareNote}</div>}

              <div className={styles.miniPerks}>
                <div className={styles.miniPerk}>
                  <FiTruck /> 3&ndash;5 day delivery in Nigeria
                </div>
                <div className={styles.miniPerk}>
                  <FiShield /> Secure VC + Paystack checkout
                </div>
                <div className={styles.miniPerk}>
                  <FiPackage /> 14-day returns
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={styles.tabsWrap}>
            <div className={styles.tabs}>
              {[
                { key: 'description', label: 'Description' },
                { key: 'specs', label: 'Specifications' },
                { key: 'reviews', label: `Reviews (${product.review_count || 0})` },
                { key: 'shipping', label: 'Shipping & returns' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`${styles.tabBtn} ${
                    activeTab === t.key ? styles.tabBtnActive : ''
                  }`}
                  onClick={() => setActiveTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className={styles.tabBody}>
              {activeTab === 'description' && (
                <div>
                  <p className={styles.tabBodyText}>
                    {product.description ||
                      'Premium V-ENT merchandise — designed for African gamers, made for tournament-day pressure.'}
                  </p>
                  {product.tags?.length > 0 && (
                    <div className={styles.tagList}>
                      {product.tags.map((t) => (
                        <span key={t} className={styles.tagPill}>
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'specs' && (
                <div className={styles.specsList}>
                  <div className={styles.specRow}>
                    <span className={styles.specKey}>Category</span>
                    <span className={styles.specVal}>{product.category}</span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specKey}>SKU</span>
                    <span className={styles.specVal}>
                      {product.id?.toUpperCase()}
                    </span>
                  </div>
                  <div className={styles.specRow}>
                    <span className={styles.specKey}>Stock</span>
                    <span className={styles.specVal}>
                      {product.stock ?? variantStock} units total
                    </span>
                  </div>
                  {product.specs?.length > 0
                    ? product.specs.map((s) => (
                        <div key={s.label} className={styles.specRow}>
                          <span className={styles.specKey}>{s.label}</span>
                          <span className={styles.specVal}>{s.value}</span>
                        </div>
                      ))
                    : (
                      <>
                        <div className={styles.specRow}>
                          <span className={styles.specKey}>Material</span>
                          <span className={styles.specVal}>
                            Premium cotton blend
                          </span>
                        </div>
                        <div className={styles.specRow}>
                          <span className={styles.specKey}>Origin</span>
                          <span className={styles.specVal}>Designed in Lagos</span>
                        </div>
                      </>
                    )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div className={styles.reviewsList}>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={styles.review}>
                      <div className={styles.reviewHead}>
                        <span className={styles.reviewAuthor}>
                          @buyer_{i + 1}
                        </span>
                        <span className={styles.reviewStars}>
                          {renderStars(5 - (i % 2))}
                        </span>
                      </div>
                      <p className={styles.reviewBody}>
                        {i === 0
                          ? 'Fit is perfect and the material is top quality. Shipping was fast to Lagos.'
                          : i === 1
                            ? 'Exactly what I wanted. The V-ENT red pops even more in person.'
                            : 'Great purchase — wearing it to the next LAN for sure.'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className={styles.tabBodyText}>
                  <p>
                    Ships across Africa in 3&ndash;5 business days. Tracked
                    delivery on every order, free above 500 VC.
                  </p>
                  <p>
                    Free returns within 14 days for unworn items in original
                    packaging. Email support@v-ent.co for help.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <section className={styles.relatedSection}>
              <h2 className={styles.relatedTitle}>You may also like</h2>
              <div className={styles.relatedGrid}>
                {related.slice(0, 4).map((p) => {
                  const rDisplay = getDisplayPriceVc(p);
                  const rOriginal = getOriginalPriceVc(p);
                  const rOnSale = isOnSale(p);
                  return (
                    <Link
                      key={p.id}
                      href={`/shop/product?id=${p.id}`}
                      className={styles.relatedCard}
                    >
                      <div className={styles.relatedImageWrap}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.images?.[0]}
                          alt={p.name}
                          className={styles.relatedImage}
                        />
                        {rOnSale && (
                          <span className={styles.relatedFlag}>Sale</span>
                        )}
                      </div>
                      <p className={styles.relatedName}>{p.name}</p>
                      <div className={styles.relatedPriceRow}>
                        <span className={styles.relatedPrice}>
                          {rDisplay.toLocaleString()} VC
                        </span>
                        {rOnSale && (
                          <span className={styles.relatedStrike}>
                            {rOriginal.toLocaleString()} VC
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

const ProductPage = () => (
  <Suspense
    fallback={
      <div className={styles.pageContainer}>
        <p className={styles.stateText}>Loading&hellip;</p>
      </div>
    }
  >
    <ProductInner />
  </Suspense>
);

export default ProductPage;
