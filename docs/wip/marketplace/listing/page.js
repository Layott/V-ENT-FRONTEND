'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { FaStar, FaHeart, FaRegHeart, FaCheckCircle } from 'react-icons/fa';
import { BsChevronLeft, BsBoxSeam } from 'react-icons/bs';
import { MdOutlineClose } from 'react-icons/md';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './listing.module.css';

const ListingInner = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const id = searchParams.get('id') || 'lstx_0';

  const [listing, setListing] = useState(null);
  const [similar, setSimilar] = useState([]);
  const [activeImg, setActiveImg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(null);
  const [toast, setToast] = useState('');

  // Modals
  const [modal, setModal] = useState(null); // 'buy' | 'offer' | null
  const [buyError, setBuyError] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerLoading, setOfferLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchListing = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/listings/${id}/`);
        const data = await res.json();
        if (mounted && data.status === 'success') {
          setListing(data.data.listing);
          setSimilar(data.data.similar || []);
          setActiveImg(0);
        }
      } catch (err) {
        console.error('Listing fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchListing();
    return () => { mounted = false; };
  }, [id]);

  // Fetch wallet balance for buy modal copy.
  useEffect(() => {
    let mounted = true;
    const fetchBal = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
          headers: session?.user?.sessionToken
            ? { Authorization: `Bearer ${session.user.sessionToken}` }
            : {},
        });
        const data = await res.json();
        if (mounted && data.status === 'success') setWalletBalance(data.data.balance);
      } catch { /* swallow — non-critical */ }
    };
    fetchBal();
    return () => { mounted = false; };
  }, [session?.user?.sessionToken]);

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  };

  const handleWatch = async () => {
    if (!listing) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/listings/${listing.id}/watch/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setListing((prev) => prev ? { ...prev, is_watched: data.data.watching } : prev);
        showToast(data.data.watching ? 'Added to watchlist' : 'Removed from watchlist');
      }
    } catch {
      showToast('Could not update watchlist');
    }
  };

  const handleBuy = async () => {
    if (!listing) return;
    setBuyError('');
    setBuyLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/listings/${listing.id}/buy/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setWalletBalance(data.data.new_balance);
        const orderId = data.data.order_id || data.data.purchase?.id;
        setModal(null);
        router.push(`/marketplace/purchase?id=${orderId}`);
      } else {
        setBuyError(data.message || 'Order could not be placed.');
      }
    } catch {
      setBuyError('Network error. Please try again.');
    } finally {
      setBuyLoading(false);
    }
  };

  const handleOffer = async () => {
    if (!listing) return;
    const amount = parseInt(offerAmount, 10);
    if (!amount || amount < 1) { showToast('Enter a valid offer amount'); return; }
    setOfferLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/listings/${listing.id}/offer/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_vc: amount, message: offerMessage }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setModal(null);
        setOfferAmount('');
        setOfferMessage('');
        showToast('Offer sent — seller will respond');
      } else {
        showToast(data.message || 'Offer failed');
      }
    } catch {
      showToast('Network error');
    } finally {
      setOfferLoading(false);
    }
  };

  const renderStars = (rating) => {
    const r = Math.round(Number(rating || 0));
    return Array.from({ length: 5 }, (_, i) => <FaStar key={i} style={{ opacity: i < r ? 1 : 0.25 }} />);
  };

  if (loading || !listing) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <Link href="/marketplace" className={styles.backLink}>
              <BsChevronLeft /> Back to marketplace
            </Link>
            <h1 className={styles.listingTitle}>Marketplace listing</h1>
            <p className={styles.stateText}>Loading listing…</p>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  const total = (listing.price_vc || 0) + (listing.shipping_cost_vc || 0);
  const sellerId = listing.seller?.user_id || listing.seller?.id;
  const specEntries = Object.entries(listing.specs || {}).filter(([, v]) => v != null && v !== '');

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <Link href="/marketplace" className={styles.backLink}>
            <BsChevronLeft /> Back to marketplace
          </Link>

          <div className={styles.layout}>
            {/* Gallery */}
            <div className={styles.gallery}>
              <div className={styles.mainImageWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={listing.images?.[activeImg]} alt={listing.title} className={styles.mainImage} />
              </div>
              <div className={styles.thumbStrip}>
                {(listing.images || []).map((src, i) => (
                  <button
                    key={src + i}
                    type="button"
                    className={`${styles.thumb} ${i === activeImg ? styles.thumbActive : ''}`}
                    onClick={() => setActiveImg(i)}
                    aria-label={`View image ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className={styles.thumbImg} />
                  </button>
                ))}
              </div>
            </div>

            {/* Right rail */}
            <div className={styles.rail}>
              <h1 className={styles.listingTitle}>{listing.title}</h1>
              <div className={styles.listingMeta}>
                <span className={styles.metaPill}>{listing.category}</span>
                <span className={styles.metaPill}>{(listing.condition || '').replace('_', ' ')}</span>
                <span className={`${styles.metaPill} ${styles.metaPillStock}`}>
                  {listing.stock} in stock
                </span>
                <span className={styles.metaPill}>{listing.location}</span>
              </div>

              <div className={styles.pricePanel}>
                <p className={styles.priceLabel}>Price</p>
                <p className={styles.priceVal}>
                  {listing.price_vc.toLocaleString()}
                  <span className={styles.priceUnit}>VC</span>
                </p>
                <p className={styles.priceSub}>
                  ≈ ₦{listing.price_ngn?.toLocaleString()}
                  {listing.shipping_cost_vc > 0
                    ? ` · +${listing.shipping_cost_vc} VC shipping`
                    : ' · Free delivery'}
                </p>
              </div>

              <div className={styles.sellerCard}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={listing.seller?.avatar || listing.seller?.profile_pic} alt={listing.seller?.username} className={styles.sellerAvatarLg} />
                <div className={styles.sellerInfo}>
                  <p className={styles.sellerName}>
                    @{listing.seller?.username}
                    {listing.seller?.verified && <FaCheckCircle style={{ color: 'var(--v-ent-gold)', fontSize: '0.85rem' }} />}
                  </p>
                  <p className={styles.sellerSub}>
                    <span>{listing.seller?.sales_count ?? listing.seller?.total_sales ?? 0} sales</span>
                    {(listing.seller?.badges || []).map((b) => (
                      <span key={b} className={styles.sellerBadgeChip}>{b.replace('_', ' ')}</span>
                    ))}
                  </p>
                </div>
                <div className={styles.sellerRating}>
                  <FaStar /> {Number(listing.seller?.rating ?? listing.seller?.seller_rating ?? 0).toFixed(1)}
                </div>
                {sellerId && (
                  <Link href={`/marketplace/seller?id=${sellerId}`} className={styles.sellerVisitBtn}>
                    Visit shop
                  </Link>
                )}
              </div>

              {toast && <div className={styles.toast}>{toast}</div>}

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => setModal('buy')}
                >
                  Buy now · {total.toLocaleString()} VC
                </button>
                <div className={styles.actionInline}>
                  <button type="button" className={styles.ghostBtn} onClick={() => setModal('offer')}>
                    Make offer
                  </button>
                  <button
                    type="button"
                    className={`${styles.heartBtn} ${listing.is_watched ? styles.heartBtnActive : ''}`}
                    onClick={handleWatch}
                    aria-label="Toggle watchlist"
                  >
                    {listing.is_watched ? <FaHeart /> : <FaRegHeart />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Description</h2>
            <p className={styles.descText}>{listing.description}</p>
          </div>

          {specEntries.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Specifications</h2>
              <ul className={styles.specsTable}>
                {specEntries.map(([k, v]) => (
                  <li key={k} className={styles.specItem}>
                    <span className={styles.specLabel}>{k.replace(/_/g, ' ')}</span>
                    <span className={styles.specValue}>{String(v)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Shipping & delivery</h2>
            <div className={styles.shippingRow}>
              <BsBoxSeam style={{ color: 'rgba(255,255,255,0.55)' }} />
              <span>{listing.delivery_label || 'Pickup or shipping'} · ships from {listing.location}</span>
            </div>
          </div>

          {(listing.reviews || []).length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Ratings & reviews</h2>
              {(listing.reviews || []).map((rv) => (
                <div key={rv.id} className={styles.review}>
                  <div className={styles.reviewHead}>
                    <span className={styles.reviewAuthor}>@{rv.reviewer}</span>
                    <span className={styles.reviewStars}>{renderStars(rv.rating)}</span>
                  </div>
                  <p className={styles.reviewBody}>{rv.comment}</p>
                </div>
              ))}
            </div>
          )}

          {similar.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Similar listings</h2>
              <div className={styles.similarRow}>
                {similar.map((s) => (
                  <Link key={s.id} href={`/marketplace/listing?id=${s.id}`} className={styles.similarCard}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.images?.[0]} alt={s.title} className={styles.similarImg} />
                    <div className={styles.similarBody}>
                      <p className={styles.similarTitle}>{s.title}</p>
                      <span className={styles.similarPrice}>{s.price_vc.toLocaleString()} VC</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomMenu />

      {/* Buy modal */}
      {modal === 'buy' && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Confirm purchase</h3>
              <button className={styles.modalClose} onClick={() => setModal(null)}><MdOutlineClose /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalConfirmRow}>
                <span className={styles.modalLabel}>Item</span>
                <span className={styles.modalValue}>{listing.title}</span>
              </div>
              <div className={styles.modalConfirmRow}>
                <span className={styles.modalLabel}>Price</span>
                <span className={styles.modalValue}>{listing.price_vc.toLocaleString()} VC</span>
              </div>
              {listing.shipping_cost_vc > 0 && (
                <div className={styles.modalConfirmRow}>
                  <span className={styles.modalLabel}>Shipping</span>
                  <span className={styles.modalValue}>{listing.shipping_cost_vc} VC</span>
                </div>
              )}
              <div className={styles.modalConfirmRow}>
                <span className={styles.modalLabel}>Total</span>
                <span className={`${styles.modalValue} ${styles.modalValueGreen}`}>{total.toLocaleString()} VC</span>
              </div>
              {walletBalance !== null && (
                <div className={styles.modalConfirmRow}>
                  <span className={styles.modalLabel}>Your wallet</span>
                  <span className={styles.modalValue}>{walletBalance.toLocaleString()} VC</span>
                </div>
              )}
              <p className={styles.modalNote}>
                Funds will be held in V-ENT escrow and released to the seller only after you confirm delivery.
              </p>
              {buyError && <div className={styles.errorBanner}>{buyError}</div>}
              <div className={styles.modalActionRow}>
                <button type="button" className={styles.modalSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button
                  type="button"
                  className={styles.modalPrimary}
                  onClick={handleBuy}
                  disabled={buyLoading}
                >
                  {buyLoading ? 'Placing order…' : 'Confirm & pay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Make offer modal */}
      {modal === 'offer' && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Make an offer</h3>
              <button className={styles.modalClose} onClick={() => setModal(null)}><MdOutlineClose /></button>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.modalLabel}>Your offer (VC)</p>
              <input
                type="number"
                min="1"
                placeholder={`e.g. ${Math.round(listing.price_vc * 0.85)}`}
                className={styles.modalInput}
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
              />
              <p className={styles.modalLabel}>Message (optional)</p>
              <textarea
                className={styles.modalTextarea}
                placeholder="Tell the seller why your offer makes sense."
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
              />
              <p className={styles.modalNote}>
                The seller will be notified and can accept, decline or counter your offer.
              </p>
              <div className={styles.modalActionRow}>
                <button type="button" className={styles.modalSecondary} onClick={() => setModal(null)}>Cancel</button>
                <button
                  type="button"
                  className={styles.modalPrimary}
                  onClick={handleOffer}
                  disabled={offerLoading}
                >
                  {offerLoading ? 'Sending…' : 'Send offer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ListingPage = () => (
  <Suspense fallback={<div className={styles.pageContainer}><p className={styles.stateText}>Loading…</p></div>}>
    <ListingInner />
  </Suspense>
);

export default ListingPage;
