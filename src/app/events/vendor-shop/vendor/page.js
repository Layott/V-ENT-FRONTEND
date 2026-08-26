'use client'

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  FaStore,
  FaCheckCircle,
  FaShoppingCart,
  FaStar,
  FaMapPin,
} from 'react-icons/fa';
import {
  IoArrowBack,
  IoLocationOutline,
  IoChatbubblesOutline,
} from 'react-icons/io5';
import { MdOutlineClose } from 'react-icons/md';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from './vendor.module.css';

const CART_STORAGE_KEY = (eventId) => `vendor_cart_${eventId || 'unknown'}`;

const VendorStallContent = () => {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const eventId = searchParams.get('event') || 'evt_2000';
  const vendorId = searchParams.get('vendor') || searchParams.get('id') || '';

  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [activeProduct, setActiveProduct] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSent, setContactSent] = useState(false);
  const [contactMsg, setContactMsg] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  const authHeaders = useCallback(() => ({
    Authorization: `Bearer ${session?.user?.sessionToken || ''}`,
    'Content-Type': 'application/json',
  }), [session?.user?.sessionToken]);

  // Fetch vendor
  useEffect(() => {
    if (!vendorId) {
      setError('Vendor ID missing');
      setLoading(false);
      return;
    }
    const fetchVendor = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/event/${eventId}/vendor/${vendorId}/`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        if (data.status === 'success') {
          setVendor(data.data.vendor);
        } else {
          setError(data.message || 'Vendor not found.');
        }
      } catch (err) {
        console.error('Vendor fetch error:', err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchVendor();
  }, [eventId, vendorId, authHeaders]);

  // Hydrate cart for this event.
  const cartHydrated = useRef(false);
  useEffect(() => {
    if (!eventId || typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY(eventId));
      setCart(raw ? JSON.parse(raw) : []);
    } catch {
      setCart([]);
    }
    cartHydrated.current = true;
  }, [eventId]);

  // Persist cart - only after hydration, otherwise the first render's empty
  // cart overwrites the stored one and every reload loses the basket.
  useEffect(() => {
    if (!eventId || typeof window === 'undefined' || !cartHydrated.current) return;
    localStorage.setItem(CART_STORAGE_KEY(eventId), JSON.stringify(cart));
  }, [cart, eventId]);

  const addToCart = (p) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) {
        return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [
        ...prev,
        {
          ...p,
          qty: 1,
          vendor_id: vendor?.id,
          vendor_name: vendor?.name,
          price_ngn: p.price_ngn ?? 0,
        },
      ];
    });
    setActiveProduct(null);
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotalVc = cart.reduce((s, i) => s + Number(i.price || 0) * i.qty, 0);

  const changeQty = (id, delta) => {
    setCart((prev) => prev
      .map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i))
      .filter((i) => i.qty > 0));
  };

  const placeOrder = async () => {
    if (!cart.length) return;
    if (cartTotalVc > 0 && pin.length < 4) {
      setOrderError('Enter your 4-digit wallet PIN to authorise this payment.');
      return;
    }
    setPlacing(true);
    setOrderError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/event/vendor/${vendorId}/order/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          items: cart.map((i) => ({ product_id: i.id, quantity: i.qty })),
          pin,
        }),
      });
      const data = await res.json();
      if (data.status !== 'success') {
        setOrderError(data.message || 'Could not place the order.');
        return;
      }
      setPlacedOrder(data.data.order);
      setCart([]);
      setPin('');
      try { localStorage.removeItem(CART_STORAGE_KEY(eventId)); } catch {}
    } catch {
      setOrderError('Connection error. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  const submitContact = () => {
    if (!contactMsg.trim()) return;
    setContactSent(true);
    setContactMsg('');
  };

  const closeContact = () => {
    setContactOpen(false);
    setContactSent(false);
    setContactMsg('');
  };

  const productInCartQty = useMemo(() => {
    const map = {};
    cart.forEach((i) => { map[i.id] = i.qty; });
    return map;
  }, [cart]);

  const renderShell = (content) => (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>{content}</div>
      </main>
      <BottomMenu />
    </div>
  );

  if (loading) return renderShell(<p className={styles.stateText}>Loading vendor stall…</p>);

  if (error || !vendor)
    return renderShell(
      <div className={styles.errorState}>
        <h3 className={styles.errorTitle}>Couldn&apos;t load vendor</h3>
        <p className={styles.errorSub}>{error || 'Vendor not found.'}</p>
        <Link
          href={`/events/${eventId}/vendor-shop`}
          className={`${styles.errorBtn} goldBTN`}
        >
          Back to vendor shop
        </Link>
      </div>
    );

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.topRow}>
            <Link
              href={`/events/${eventId}/vendor-shop`}
              className={styles.backLink}
            >
              <IoArrowBack /> Back to vendors
            </Link>
            <Link
              href={`/events/${eventId}/vendor-shop`}
              className={styles.cartChip}
            >
              <FaShoppingCart /> {cartCount} in cart
            </Link>
          </div>

          {/* Banner */}
          <div className={styles.bannerWrap}>
            {vendor.banner ? (
              <Image
                src={vendor.banner}
                alt={`${vendor.name} banner`}
                fill
                sizes="(min-width: 1024px) 70vw, 100vw"
                style={{ objectFit: 'cover' }}
                unoptimized
                priority
              />
            ) : (
              <div className={styles.bannerFallback}><FaStore /></div>
            )}
            <div className={styles.bannerOverlay} />
          </div>

          {/* Header block */}
          <div className={styles.headerBlock}>
            <div className={styles.headerLeft}>
              <div className={styles.logoWrap}>
                {vendor.logo ? (
                  <Image
                    src={vendor.logo}
                    alt={vendor.name}
                    width={84}
                    height={84}
                    className={styles.vendorLogo}
                    unoptimized
                  />
                ) : (
                  <div className={styles.vendorLogoPlaceholder}><FaStore /></div>
                )}
              </div>
              <div>
                <div className={styles.titleRow}>
                  <h2 className={styles.vendorName}>{vendor.name}</h2>
                  <span className={`${styles.statusPill} ${styles['status_' + vendor.status]}`}>
                    {vendor.status}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaItem}>
                    <IoLocationOutline /> Booth {vendor.booth_number || vendor.booth}
                  </span>
                  {vendor.category && (
                    <span className={styles.category}>{vendor.category}</span>
                  )}
                  {typeof vendor.rating === 'number' && (
                    <span className={styles.metaItem}>
                      <FaStar className={styles.starIcon} /> {vendor.rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.headerActions}>
              <button
                className={styles.contactBtn}
                onClick={() => setContactOpen(true)}
                type="button"
              >
                <IoChatbubblesOutline /> Contact
              </button>
              <Link
                href={`/events/${eventId}?tab=map`}
                className={`${styles.mapBtn} goldBTN`}
              >
                <FaMapPin /> Visit booth at venue
              </Link>
            </div>
          </div>

          {vendor.description && (
            <p className={styles.description}>{vendor.description}</p>
          )}

          <h3 className={styles.sectionTitle}>Products</h3>

          {(!vendor.products || vendor.products.length === 0) ? (
            <p className={styles.stateText}>No products available yet.</p>
          ) : (
            <div className={styles.productGrid}>
              {vendor.products.map((p) => (
                <button
                  key={p.id}
                  className={styles.productCard}
                  onClick={() => setActiveProduct(p)}
                  type="button"
                >
                  <div className={styles.productImgWrap}>
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(min-width: 1024px) 25vw, 50vw"
                        style={{ objectFit: 'cover' }}
                        unoptimized
                      />
                    ) : (
                      <div className={styles.productImgFallback}><FaStore /></div>
                    )}
                    {!p.in_stock && <span className={styles.oosBadge}>Sold out</span>}
                    {productInCartQty[p.id] > 0 && (
                      <span className={styles.inCartBadge}>
                        <FaCheckCircle /> {productInCartQty[p.id]} in cart
                      </span>
                    )}
                  </div>
                  <div className={styles.productBody}>
                    <p className={styles.productName}>{p.name}</p>
                    <p className={styles.productPrice}>
                      {Number(p.price || 0).toLocaleString()} VC
                    </p>
                    <span
                      className={styles.addBtn}
                    >
                      {p.in_stock ? 'Add to cart' : 'Unavailable'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomMenu />

      {/* Product modal */}
      {activeProduct && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveProduct(null); }}
        >
          <div className={styles.productModal}>
            <button
              className={styles.modalCloseAbs}
              onClick={() => setActiveProduct(null)}
              type="button"
              aria-label="Close"
            >
              <MdOutlineClose />
            </button>
            <div className={styles.productModalImgWrap}>
              {activeProduct.image ? (
                <Image
                  src={activeProduct.image}
                  alt={activeProduct.name}
                  fill
                  sizes="500px"
                  style={{ objectFit: 'cover' }}
                  unoptimized
                />
              ) : (
                <div className={styles.productImgFallback}><FaStore /></div>
              )}
            </div>
            <div className={styles.productModalBody}>
              <p className={styles.productModalVendor}>{vendor.name}</p>
              <h3 className={styles.productModalName}>{activeProduct.name}</h3>
              <p className={styles.productModalPrice}>
                {Number(activeProduct.price || 0).toLocaleString()} VC
              </p>
              <p className={styles.productModalDesc}>
                {activeProduct.description || 'Vendor-exclusive item, on-site pickup only.'}
              </p>
              <p className={styles.stockHint}>
                {activeProduct.in_stock
                  ? `${activeProduct.stock || 'Limited'} available • Booth ${vendor.booth_number || vendor.booth}`
                  : 'Currently sold out - check back later.'}
              </p>
              <button
                className={`${styles.addToCartBtn} ${activeProduct.in_stock ? 'goldBTN' : ''}`}
                onClick={() => addToCart(activeProduct)}
                disabled={!activeProduct.in_stock}
                type="button"
              >
                {activeProduct.in_stock ? 'Add to cart' : 'Sold out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact modal */}
      {contactOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) closeContact(); }}
        >
          <div className={styles.contactModal}>
            <div className={styles.contactHeader}>
              <h3 className={styles.contactTitle}>Contact {vendor.name}</h3>
              <button
                className={styles.modalCloseAbs}
                style={{ position: 'static' }}
                onClick={closeContact}
                type="button"
                aria-label="Close"
              >
                <MdOutlineClose />
              </button>
            </div>
            <div className={styles.contactBody}>
              {!contactSent ? (
                <>
                  <p className={styles.contactSub}>
                    Send a quick message. The vendor will reply via your V-ENT inbox.
                  </p>
                  <textarea
                    className={styles.contactInput}
                    rows={4}
                    placeholder="e.g. Do you have the Limited Tee in size XL?"
                    value={contactMsg}
                    onChange={(e) => setContactMsg(e.target.value)}
                  />
                  <button
                    className={`${styles.contactSendBtn} redBTN`}
                    onClick={submitContact}
                    disabled={!contactMsg.trim()}
                    type="button"
                  >
                    Send message
                  </button>
                </>
              ) : (
                <div className={styles.contactSuccess}>
                  <FaCheckCircle className={styles.successIcon} />
                  <p className={styles.successTitle}>Message sent</p>
                  <p className={styles.successSub}>
                    {vendor.name} will reply via your V-ENT inbox.
                  </p>
                  <button
                    className={`${styles.contactSendBtn} goldBTN`}
                    onClick={closeContact}
                    type="button"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sticky checkout bar: the cart chip only links back to the shop index,
          so ordering needs its own control. */}
      {cart.length > 0 && !cartOpen && (
        <div className={styles.checkoutBar}>
          <div className={styles.checkoutBarInfo}>
            <span className={styles.checkoutBarCount}>{cartCount} item{cartCount === 1 ? '' : 's'}</span>
            <span className={styles.checkoutBarTotal}>{cartTotalVc.toLocaleString()} VC</span>
          </div>
          <button
            type="button"
            className={`${styles.checkoutBarBtn} goldBTN`}
            onClick={() => { setCartOpen(true); setPlacedOrder(null); setOrderError(''); }}
          >
            Review order
          </button>
        </div>
      )}

      {/* ── Cart / checkout ── */}
      {cartOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => { if (e.target === e.currentTarget) setCartOpen(false); }}
        >
          <div className={styles.cartPanel}>
            <div className={styles.cartHeader}>
              <h3 className={styles.cartTitle}>
                {placedOrder ? 'Order placed' : `Your order · ${vendor?.name || ''}`}
              </h3>
              <button className={styles.cartClose} onClick={() => setCartOpen(false)} aria-label="Close">
                <MdOutlineClose />
              </button>
            </div>

            {placedOrder ? (
              <div className={styles.cartBody}>
                <p className={styles.orderCode}>{placedOrder.code}</p>
                <p className={styles.orderHint}>
                  Show this code at booth {vendor?.booth || vendor?.booth_number || '-'} to collect.
                </p>
                <ul className={styles.orderLines}>
                  {placedOrder.items.map((i) => (
                    <li key={i.product_id} className={styles.orderLine}>
                      <span>{i.quantity} × {i.name}</span>
                      <span>{i.line_vc.toLocaleString()} VC</span>
                    </li>
                  ))}
                </ul>
                <div className={styles.cartTotalRow}>
                  <span>Paid</span>
                  <span className={styles.cartTotalVal}>{placedOrder.total_vc.toLocaleString()} VC</span>
                </div>
              </div>
            ) : cart.length === 0 ? (
              <div className={styles.cartBody}>
                <p className={styles.stateText}>Your order is empty. Add something from the stall.</p>
              </div>
            ) : (
              <div className={styles.cartBody}>
                <ul className={styles.orderLines}>
                  {cart.map((i) => (
                    <li key={i.id} className={styles.orderLine}>
                      <span className={styles.cartItemName}>{i.name}</span>
                      <span className={styles.qtyControls}>
                        <button type="button" onClick={() => changeQty(i.id, -1)} aria-label="Remove one">−</button>
                        <span>{i.qty}</span>
                        <button type="button" onClick={() => changeQty(i.id, 1)} aria-label="Add one">+</button>
                      </span>
                      <span>{(Number(i.price || 0) * i.qty).toLocaleString()} VC</span>
                    </li>
                  ))}
                </ul>

                <div className={styles.cartTotalRow}>
                  <span>Total</span>
                  <span className={styles.cartTotalVal}>{cartTotalVc.toLocaleString()} VC</span>
                </div>

                {cartTotalVc > 0 && (
                  <div className={styles.pinBlock}>
                    <label className={styles.pinLabel} htmlFor="vendor-pin">Wallet PIN</label>
                    <input
                      id="vendor-pin"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      className={styles.pinInput}
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      autoComplete="off"
                    />
                  </div>
                )}

                {orderError && <p className={styles.orderError}>{orderError}</p>}

                <button
                  className={`${styles.checkoutBtn} goldBTN`}
                  onClick={placeOrder}
                  disabled={placing}
                  type="button"
                >
                  {placing ? 'Placing order…' : `Pay ${cartTotalVc.toLocaleString()} VC`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const VendorStall = () => (
  <Suspense
    fallback={
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>Loading…</p>
          </div>
        </main>
        <BottomMenu />
      </div>
    }
  >
    <VendorStallContent />
  </Suspense>
);

export default VendorStall;
