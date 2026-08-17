'use client'

import { useState, useEffect, useCallback, Suspense, useMemo } from 'react';
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

  // Hydrate cart for this event
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
          price_ngn: p.price_ngn || p.price * 1000,
        },
      ];
    });
    setActiveProduct(null);
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

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
          href={`/events/vendor-shop?id=${eventId}`}
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
              href={`/events/vendor-shop?id=${eventId}`}
              className={styles.backLink}
            >
              <IoArrowBack /> Back to vendors
            </Link>
            <Link
              href={`/events/vendor-shop?id=${eventId}`}
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
                href={`/events/view-event?id=${eventId}&tab=map`}
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
                      ₦{Number(p.price_ngn || p.price * 1000 || 0).toLocaleString()}
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
                ₦{Number(activeProduct.price_ngn || activeProduct.price * 1000 || 0).toLocaleString()}
              </p>
              <p className={styles.productModalDesc}>
                {activeProduct.description || 'Vendor-exclusive item, on-site pickup only.'}
              </p>
              <p className={styles.stockHint}>
                {activeProduct.in_stock
                  ? `${activeProduct.stock || 'Limited'} available • Booth ${vendor.booth_number || vendor.booth}`
                  : 'Currently sold out — check back later.'}
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
