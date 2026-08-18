'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BsChevronLeft } from 'react-icons/bs';
import { FaStar, FaCheckCircle } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './seller.module.css';

const TABS = [
  { key: 'active', label: 'Active Listings' },
  { key: 'sold', label: 'Sold' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'about', label: 'About' },
];

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const SellerInner = () => {
  const searchParams = useSearchParams();
  const userId = searchParams.get('id') || 'user_seller_1';

  const [seller, setSeller] = useState(null);
  const [listings, setListings] = useState([]);
  const [sold, setSold] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/seller/${userId}/`);
        const data = await res.json();
        if (mounted && data.status === 'success') {
          setSeller(data.data.seller);
          setListings(data.data.listings || []);
          setSold(data.data.sold || []);
          setReviews(data.data.reviews || []);
        }
      } catch (err) {
        console.error('Seller profile fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [userId]);

  const handleFollow = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/seller/${userId}/follow/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === 'success') setFollowing((prev) => !prev);
    } catch { /* swallow */ }
  };

  const renderStars = (rating) => {
    const r = Math.round(Number(rating || 0));
    return Array.from({ length: 5 }, (_, i) => <FaStar key={i} style={{ opacity: i < r ? 1 : 0.25 }} />);
  };

  if (loading || !seller) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>Loading seller…</p>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  const activeListings = listings.filter((l) => l.status === 'active');
  const soldListings = sold.length > 0 ? sold : listings.filter((l) => l.status === 'sold');

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

          {/* Hero */}
          <section className={styles.hero}>
            <div className={styles.heroBg} />
            <div className={styles.heroTop}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={seller.profile_pic || seller.avatar}
                alt={seller.username}
                className={styles.heroAvatar}
              />
              <div className={styles.heroBody}>
                <h1 className={styles.heroName}>
                  @{seller.username}
                  {seller.verified && <FaCheckCircle className={styles.heroVerified} />}
                </h1>
                <p className={styles.heroSub}>
                  <span>{seller.country || 'V-ENT seller'}</span>
                  <span>·</span>
                  <span>Joined {formatDate(seller.joined_at)}</span>
                </p>
                {(seller.badges || []).length > 0 && (
                  <div className={styles.heroBadges}>
                    {seller.badges.map((b) => (
                      <span key={b} className={styles.heroBadge}>{b.replace('_', ' ')}</span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className={`${styles.followBtn} ${following ? styles.followBtnActive : 'redBTN'}`}
                onClick={handleFollow}
              >
                {following ? 'Following' : 'Follow'}
              </button>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatLabel}>Rating</span>
                <span className={`${styles.heroStatValue} ${styles.heroStarValue}`}>
                  <FaStar /> {Number(seller.rating ?? seller.seller_rating ?? 0).toFixed(1)}
                </span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatLabel}>Total sales</span>
                <span className={styles.heroStatValue}>
                  {(seller.sales_count ?? seller.total_sales ?? 0).toLocaleString()}
                </span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatLabel}>Active listings</span>
                <span className={styles.heroStatValue}>{activeListings.length}</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatLabel}>Reviews</span>
                <span className={styles.heroStatValue}>{reviews.length}</span>
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
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Active listings */}
          {tab === 'active' && (
            activeListings.length === 0 ? (
              <p className={styles.stateText}>This seller has no active listings.</p>
            ) : (
              <div className={styles.listingsGrid}>
                {activeListings.map((l) => (
                  <Link key={l.id} href={`/marketplace/listing?id=${l.id}`} className={styles.lcard}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.images?.[0]} alt={l.title} className={styles.lcardImg} />
                    <div className={styles.lcardBody}>
                      <h3 className={styles.lcardTitle}>{l.title}</h3>
                      <span className={styles.lcardPrice}>{l.price_vc.toLocaleString()} VC</span>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}

          {/* Sold listings */}
          {tab === 'sold' && (
            soldListings.length === 0 ? (
              <p className={styles.stateText}>No completed sales recorded yet.</p>
            ) : (
              <div className={styles.listingsGrid}>
                {soldListings.map((l) => (
                  <Link key={l.id} href={`/marketplace/listing?id=${l.id}`} className={styles.lcard}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={l.images?.[0]} alt={l.title} className={styles.lcardImg} style={{ opacity: 0.7 }} />
                    <div className={styles.lcardBody}>
                      <h3 className={styles.lcardTitle}>{l.title}</h3>
                      <span className={styles.lcardPrice}>{l.price_vc.toLocaleString()} VC</span>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}

          {/* Reviews */}
          {tab === 'reviews' && (
            reviews.length === 0 ? (
              <p className={styles.stateText}>No reviews yet.</p>
            ) : (
              <div className={styles.reviewList}>
                {reviews.map((rv) => (
                  <div key={rv.id} className={styles.review}>
                    <div className={styles.reviewHead}>
                      <span className={styles.reviewAuthor}>@{rv.reviewer}</span>
                      <span className={styles.reviewStars}>{renderStars(rv.rating)}</span>
                    </div>
                    <p className={styles.reviewBody}>{rv.comment}</p>
                    {rv.listing_title && (
                      <span className={styles.reviewListing}>On: {rv.listing_title}</span>
                    )}
                  </div>
                ))}
              </div>
            )
          )}

          {/* About */}
          {tab === 'about' && (
            <div className={styles.aboutPanel}>
              <p className={styles.aboutLabel}>Seller bio</p>
              <p className={styles.aboutValue}>{seller.bio || 'No bio yet.'}</p>
              <div className={styles.aboutGrid}>
                <div>
                  <p className={styles.aboutLabel}>Location</p>
                  <p className={styles.aboutValue}>{seller.country || '—'}</p>
                </div>
                <div>
                  <p className={styles.aboutLabel}>Member since</p>
                  <p className={styles.aboutValue}>{formatDate(seller.joined_at)}</p>
                </div>
              </div>
              <p className={styles.aboutLabel} style={{ marginTop: '0.75rem' }}>Trust signals</p>
              <div className={styles.aboutRow}>
                <span>Verification</span>
                <span>{seller.verified ? 'Verified' : 'Unverified'}</span>
              </div>
              <div className={styles.aboutRow}>
                <span>Average rating</span>
                <span>{Number(seller.rating ?? 0).toFixed(1)} / 5</span>
              </div>
              <div className={styles.aboutRow}>
                <span>Total sales</span>
                <span>{(seller.sales_count ?? seller.total_sales ?? 0).toLocaleString()}</span>
              </div>
              <div className={styles.aboutRow}>
                <span>Escrow protection</span>
                <span style={{ color: 'var(--v-ent-gold)' }}>Active on every order</span>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

const SellerProfile = () => (
  <Suspense fallback={<div style={{ padding: '4rem', color: '#fff', backgroundColor: '#131316', minHeight: '100vh' }}>Loading…</div>}>
    <SellerInner />
  </Suspense>
);

export default SellerProfile;
