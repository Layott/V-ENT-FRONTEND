'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BsChevronLeft } from 'react-icons/bs';
import { HiPlus } from 'react-icons/hi';
import { FaStar, FaPen, FaTruckFast, FaArrowRotateLeft } from 'react-icons/fa6';
import { FaTrashAlt } from 'react-icons/fa';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './dashboard.module.css';

const TABS = [
  { key: 'listings', label: 'Listings' },
  { key: 'orders', label: 'Orders' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'reviews', label: 'Reviews' },
];

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const statusKey = (status) => {
  const map = {
    active: 'statusActive',
    pending: 'statusPending',
    shipped: 'statusShipped',
    in_transit: 'statusInTransit',
    delivered: 'statusDelivered',
    completed: 'statusCompleted',
    refunded: 'statusRefunded',
    disputed: 'statusDisputed',
    sold: 'statusSold',
    escrow: 'statusEscrow',
  };
  return map[status] || 'statusActive';
};

const SellerDashboard = () => {
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('listings');
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2200);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/my-listings/`);
      const data = await res.json();
      if (data.status === 'success') {
        setStats(data.data.stats);
        setListings(data.data.listings || []);
        setOrders(data.data.orders || []);
        setReviews(data.data.reviews || []);
      }
    } catch (err) {
      console.error('Seller fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeleteListing = async (id) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this listing? This cannot be undone.')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/listings/${id}/delete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setListings((prev) => prev.filter((l) => l.id !== id));
        showToast('Listing deleted');
      }
    } catch {
      showToast('Could not delete listing');
    }
  };

  const handleMarkShipped = async (orderId) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/orders/${orderId}/ship/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setOrders((prev) => prev.map((o) => o.id === orderId
          ? { ...o, status: 'shipped', tracking_number: data.data.purchase?.tracking_number }
          : o
        ));
        showToast('Order marked shipped');
      }
    } catch {
      showToast('Could not mark shipped');
    }
  };

  const handleRefund = async (orderId) => {
    if (typeof window !== 'undefined' && !window.confirm('Refund this order? Funds will return to the buyer wallet.')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/orders/${orderId}/refund/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: 'refunded' } : o));
        showToast('Order refunded');
      }
    } catch {
      showToast('Refund failed');
    }
  };

  const renderStars = (rating) => {
    const r = Math.round(Number(rating || 0));
    return (
      <span className={styles.starRow}>
        {Array.from({ length: 5 }, (_, i) => (
          <FaStar key={i} className={i < r ? '' : styles.starRowDim} />
        ))}
      </span>
    );
  };

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

          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Seller dashboard</h1>
              <p className={styles.sub}>Manage your listings, fulfil orders, and track marketplace revenue.</p>
            </div>
            <Link href="/marketplace/create" className={`${styles.createBtn} redBTN`}>
              <HiPlus /> New listing
            </Link>
          </div>

          {/* KPI cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Active listings</p>
              <p className={styles.statValue}>{stats?.active_listings ?? (loading ? '—' : 0)}</p>
              <p className={styles.statDelta}>Live in marketplace</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Pending orders</p>
              <p className={styles.statValue}>{stats?.pending_orders ?? (loading ? '—' : 0)}</p>
              <p className={styles.statDelta}>Awaiting fulfilment</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>This month</p>
              <p className={styles.statValue}>
                {stats?.month_revenue_vc?.toLocaleString() ?? (loading ? '—' : 0)}
                <span className={styles.statUnit}> VC</span>
              </p>
              <p className={styles.statDelta}>+12% vs last month</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Avg rating</p>
              <p className={styles.statValue}>
                {stats?.rating ?? (loading ? '—' : '0.0')}
                <span className={styles.statUnit}> / 5</span>
              </p>
              <p className={styles.statDelta}>Across all listings</p>
            </div>
          </div>

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

          {/* Listings tab */}
          {tab === 'listings' && (
            <div className={styles.tableWrap}>
              <div className={`${styles.tableHeader} ${styles.listingCols}`}>
                <span>Listing</span>
                <span>Price</span>
                <span>Status</span>
                <span>Created</span>
                <span>Actions</span>
              </div>
              {loading ? (
                <p className={styles.stateText}>Loading listings…</p>
              ) : listings.length === 0 ? (
                <p className={styles.stateText}>You have no listings yet. Create one to start selling.</p>
              ) : (
                listings.map((l) => (
                  <div key={l.id} className={`${styles.tableRow} ${styles.listingCols}`}>
                    <div className={styles.listingCell}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.images?.[0]} alt={l.title} className={styles.listingThumb} />
                      <Link href={`/marketplace/listing?id=${l.id}`} className={styles.listingName}>{l.title}</Link>
                    </div>
                    <span className={styles.priceCell}>{l.price_vc.toLocaleString()} VC</span>
                    <span className={`${styles.statusBadge} ${styles[statusKey(l.status)]}`}>{l.status}</span>
                    <span className={styles.dateCell}>{formatDate(l.created_at)}</span>
                    <div className={styles.actionsCell}>
                      <Link href={`/marketplace/create?edit=${l.id}`} className={styles.iconBtn}>
                        <FaPen /> Edit
                      </Link>
                      <button
                        type="button"
                        className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                        onClick={() => handleDeleteListing(l.id)}
                      >
                        <FaTrashAlt /> Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Orders tab */}
          {tab === 'orders' && (
            <div className={styles.tableWrap}>
              <div className={`${styles.tableHeader} ${styles.orderCols}`}>
                <span>Listing</span>
                <span>Buyer</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Actions</span>
              </div>
              {loading ? (
                <p className={styles.stateText}>Loading orders…</p>
              ) : orders.length === 0 ? (
                <p className={styles.stateText}>No orders yet.</p>
              ) : (
                orders.map((o) => (
                  <div key={o.id} className={`${styles.tableRow} ${styles.orderCols}`}>
                    <div className={styles.listingCell}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={o.listing?.images?.[0]} alt={o.listing?.title} className={styles.listingThumb} />
                      <span className={styles.listingName}>{o.listing?.title}</span>
                    </div>
                    <span>@{o.buyer?.username || '—'}</span>
                    <span className={styles.priceCell}>{o.price_vc?.toLocaleString()} VC</span>
                    <span className={`${styles.statusBadge} ${styles[statusKey(o.status)]}`}>{o.status}</span>
                    <div className={styles.actionsCell}>
                      {o.status === 'pending' && (
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnPrimary}`}
                          onClick={() => handleMarkShipped(o.id)}
                        >
                          <FaTruckFast /> Mark shipped
                        </button>
                      )}
                      {(o.status === 'pending' || o.status === 'shipped' || o.status === 'in_transit') && (
                        <button
                          type="button"
                          className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                          onClick={() => handleRefund(o.id)}
                        >
                          <FaArrowRotateLeft /> Refund
                        </button>
                      )}
                      <Link href={`/marketplace/purchase?id=${o.id}`} className={styles.iconBtn}>View</Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Earnings tab */}
          {tab === 'earnings' && (
            <div className={styles.earningsGrid}>
              <div className={styles.earningsCard}>
                <h3 className={styles.earningsTitle}>Lifetime earnings</h3>
                <p className={styles.earningsAmount}>
                  {stats?.revenue_vc?.toLocaleString() ?? (loading ? '—' : 0)}
                  <span>VC</span>
                </p>
                <div className={styles.earningsRow}>
                  <span>This month</span>
                  <span>{stats?.month_revenue_vc?.toLocaleString() ?? 0} VC</span>
                </div>
                <div className={styles.earningsRow}>
                  <span>Items sold</span>
                  <span>{stats?.sold ?? 0}</span>
                </div>
                <div className={styles.earningsRow}>
                  <span>Avg order value</span>
                  <span>
                    {stats?.sold ? Math.round((stats.revenue_vc || 0) / stats.sold).toLocaleString() : 0} VC
                  </span>
                </div>
                <div className={styles.earningsRow}>
                  <span>Platform fee (5%)</span>
                  <span>{stats ? Math.round((stats.revenue_vc || 0) * 0.05).toLocaleString() : 0} VC</span>
                </div>
              </div>

              <div className={styles.earningsCard}>
                <h3 className={styles.earningsTitle}>Recent payouts</h3>
                <div className={styles.earningsRow}>
                  <span>Mar 2026</span>
                  <span>{Math.round((stats?.revenue_vc || 0) * 0.32).toLocaleString()} VC</span>
                </div>
                <div className={styles.earningsRow}>
                  <span>Feb 2026</span>
                  <span>{Math.round((stats?.revenue_vc || 0) * 0.28).toLocaleString()} VC</span>
                </div>
                <div className={styles.earningsRow}>
                  <span>Jan 2026</span>
                  <span>{Math.round((stats?.revenue_vc || 0) * 0.4).toLocaleString()} VC</span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', margin: '0.5rem 0 0' }}>
                  Funds settle to your V-ENT wallet within 24 hours of buyer confirmation.
                </p>
              </div>
            </div>
          )}

          {/* Reviews tab */}
          {tab === 'reviews' && (
            <div className={styles.tableWrap}>
              <div className={`${styles.tableHeader} ${styles.reviewCols}`}>
                <span>Listing</span>
                <span>Rating</span>
                <span>Comment</span>
                <span>Date</span>
              </div>
              {loading ? (
                <p className={styles.stateText}>Loading reviews…</p>
              ) : reviews.length === 0 ? (
                <p className={styles.stateText}>No reviews yet. Reviews appear here once buyers confirm receipt.</p>
              ) : (
                reviews.slice(0, 20).map((r) => (
                  <div key={r.id} className={`${styles.tableRow} ${styles.reviewCols}`}>
                    <span className={styles.listingName}>{r.listing_title}</span>
                    {renderStars(r.rating)}
                    <span style={{ color: 'rgba(255,255,255,0.75)' }}>{r.comment}</span>
                    <span className={styles.dateCell}>{formatDate(r.created_at)}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
};

export default SellerDashboard;
