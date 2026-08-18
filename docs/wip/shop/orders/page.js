'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  BsChevronLeft,
  BsCheck2,
  BsClockHistory,
  BsBoxSeam,
  BsTruck,
  BsXCircle,
} from 'react-icons/bs';
import { FiPackage, FiArrowRight } from 'react-icons/fi';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './orders.module.css';

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'refunded', label: 'Refunded' },
];

const TIMELINE = [
  { key: 'placed', label: 'Order placed', icon: <BsCheck2 /> },
  { key: 'confirmed', label: 'Confirmed', icon: <BsCheck2 /> },
  { key: 'shipped', label: 'Shipped', icon: <BsBoxSeam /> },
  { key: 'out_for_delivery', label: 'Out for delivery', icon: <BsTruck /> },
  { key: 'delivered', label: 'Delivered', icon: <FiPackage /> },
];

const STATUS_TO_TIMELINE = {
  pending: 0,
  processing: 1,
  shipped: 2,
  out_for_delivery: 3,
  delivered: 4,
  cancelled: -1,
  refunded: -1,
};

const formatDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (err) {
    return '';
  }
};

const StatusBadge = ({ status }) => {
  const cls = styles[`status_${status}`] || styles.status_pending;
  return <span className={`${styles.statusBadge} ${cls}`}>{status}</span>;
};

const OrderCardCompact = ({ order, onClick }) => {
  const previewItems = (order.items || []).slice(0, 3);
  const extra = Math.max(0, (order.items?.length || 0) - 3);

  return (
    <button type="button" className={styles.orderCard} onClick={onClick}>
      <div className={styles.orderCardHead}>
        <div>
          <p className={styles.orderId}>
            #{order.order_number || order.id}
          </p>
          <p className={styles.orderDate}>
            Placed {formatDate(order.placed_at || order.created_at)}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className={styles.orderThumbs}>
        {previewItems.map((it, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={it.product_image || it.product?.images?.[0]}
            alt={it.product_name || it.product?.name}
            className={styles.orderThumb}
          />
        ))}
        {extra > 0 && <div className={styles.orderThumbMore}>+{extra}</div>}
      </div>

      <div className={styles.orderCardFoot}>
        <div>
          <p className={styles.orderItemsCount}>
            {order.items?.length || 0}{' '}
            {order.items?.length === 1 ? 'item' : 'items'}
          </p>
          <p className={styles.orderTotal}>
            {Number(order.total_vc || 0).toLocaleString()} VC
          </p>
        </div>
        <span className={styles.orderViewLink}>
          View details <FiArrowRight />
        </span>
      </div>
    </button>
  );
};

const OrderDetail = ({ order, onBack }) => {
  if (!order) return null;
  const stepIdx = STATUS_TO_TIMELINE[order.status] ?? 0;
  const cancelled = order.status === 'cancelled' || order.status === 'refunded';

  return (
    <>
      <button type="button" className={styles.backLink} onClick={onBack}>
        <BsChevronLeft /> Back to all orders
      </button>

      <div className={styles.detailHead}>
        <div>
          <h1 className={styles.detailTitle}>Order #{order.order_number}</h1>
          <p className={styles.detailSub}>
            Placed {formatDate(order.placed_at || order.created_at)} &middot;{' '}
            {order.items?.length || 0} items
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Timeline */}
      <div className={styles.timelineCard}>
        <h2 className={styles.cardTitle}>Tracking</h2>
        {cancelled ? (
          <div className={styles.timelineCancelled}>
            <BsXCircle />{' '}
            {order.status === 'refunded'
              ? 'Order refunded.'
              : 'Order cancelled.'}
          </div>
        ) : (
          <ol className={styles.timeline}>
            {TIMELINE.map((step, i) => {
              const done = i <= stepIdx;
              const active = i === stepIdx;
              return (
                <li
                  key={step.key}
                  className={`${styles.timelineItem} ${
                    done ? styles.timelineDone : ''
                  } ${active ? styles.timelineActive : ''}`}
                >
                  <span className={styles.timelineDot}>
                    {done ? <BsCheck2 /> : <BsClockHistory />}
                  </span>
                  <div className={styles.timelineBody}>
                    <p className={styles.timelineLabel}>{step.label}</p>
                    {active && (
                      <p className={styles.timelineHint}>
                        Estimated{' '}
                        {formatDate(order.estimated_delivery) || 'soon'}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {order.tracking_url && !cancelled && (
          <a
            href={order.tracking_url}
            target="_blank"
            rel="noreferrer"
            className={styles.trackBtn}
          >
            Open courier tracking <FiArrowRight />
          </a>
        )}
      </div>

      <div className={styles.detailGrid}>
        {/* Items */}
        <div className={styles.itemsCard}>
          <h2 className={styles.cardTitle}>Items</h2>
          <div className={styles.itemsTable}>
            {(order.items || []).map((it, i) => (
              <div key={i} className={styles.itemRow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.product_image || it.product?.images?.[0]}
                  alt={it.product_name || it.product?.name}
                  className={styles.itemImg}
                />
                <div className={styles.itemInfo}>
                  <p className={styles.itemName}>
                    {it.product_name || it.product?.name}
                  </p>
                  <p className={styles.itemMeta}>
                    Qty {it.qty}
                    {it.variant?.size ? ` · ${it.variant.size}` : ''}
                    {it.variant?.color ? ` · ${it.variant.color}` : ''}
                  </p>
                </div>
                <div className={styles.itemPrice}>
                  {(Number(it.unit_price_vc) * (it.qty || 1)).toLocaleString()}{' '}
                  VC
                </div>
              </div>
            ))}
          </div>

          <div className={styles.totalsBox}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>
                {Number(order.subtotal_vc || 0).toLocaleString()} VC
              </span>
            </div>
            <div className={styles.totalRow}>
              <span>Shipping</span>
              <span>
                {Number(order.shipping_vc || 0).toLocaleString()} VC
              </span>
            </div>
            <div className={styles.totalRowFinal}>
              <span>Total</span>
              <span>
                {Number(order.total_vc || 0).toLocaleString()} VC
              </span>
            </div>
          </div>
        </div>

        {/* Address + Payment */}
        <div className={styles.sideStack}>
          <div className={styles.sideCard}>
            <h2 className={styles.cardTitle}>Shipping address</h2>
            {order.delivery_address ? (
              <>
                <p className={styles.addrLine}>
                  {order.delivery_address.full_name}
                </p>
                <p className={styles.addrLineMuted}>
                  {order.delivery_address.phone}
                </p>
                <p className={styles.addrLineMuted}>
                  {order.delivery_address.street}
                </p>
                <p className={styles.addrLineMuted}>
                  {order.delivery_address.city},{' '}
                  {order.delivery_address.state}{' '}
                  {order.delivery_address.postal_code}
                </p>
                <p className={styles.addrLineMuted}>
                  {order.delivery_address.country}
                </p>
              </>
            ) : (
              <p className={styles.addrLineMuted}>Address not available.</p>
            )}
          </div>

          <div className={styles.sideCard}>
            <h2 className={styles.cardTitle}>Payment</h2>
            <p className={styles.addrLine}>
              {order.payment_method === 'wallet'
                ? 'VENT COINS Wallet'
                : order.payment_method === 'paystack'
                  ? 'Paystack (Card / Transfer)'
                  : order.payment_method === 'cod'
                    ? 'Cash on delivery'
                    : (order.payment_method || 'Wallet')}
            </p>
            <p className={styles.addrLineMuted}>
              Charged {Number(order.total_vc || 0).toLocaleString()} VC
            </p>
          </div>

          <div className={styles.sideCard}>
            <h2 className={styles.cardTitle}>Need help?</h2>
            <p className={styles.addrLineMuted}>
              Email{' '}
              <a
                href="mailto:support@v-ent.co"
                className={styles.supportLink}
              >
                support@v-ent.co
              </a>{' '}
              with your order number for help with delivery, returns, or
              refunds.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

const OrdersInner = () => {
  const router = useRouter();
  const params = useSearchParams();
  const idFromUrl = params.get('id');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [activeId, setActiveId] = useState(idFromUrl || '');

  useEffect(() => {
    setActiveId(idFromUrl || '');
  }, [idFromUrl]);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/order/list/`,
        );
        const data = await res.json();
        if (data?.status === 'success') {
          setOrders(data.data.orders || []);
        }
      } catch (err) {
        console.error('Orders fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    return orders.filter((o) => o.status === filter);
  }, [filter, orders]);

  const activeOrder = useMemo(() => {
    if (!activeId) return null;
    return (
      orders.find(
        (o) => o.id === activeId || o.order_number === activeId,
      ) || null
    );
  }, [activeId, orders]);

  const handleOpenOrder = (order) => {
    const id = order.order_number || order.id;
    setActiveId(id);
    router.push(`/shop/orders?id=${encodeURIComponent(id)}`);
  };

  const handleBackToList = () => {
    setActiveId('');
    router.push('/shop/orders');
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          {!activeId && (
            <Link href="/shop" className={styles.backLink}>
              <BsChevronLeft /> Back to shop
            </Link>
          )}

          {activeId && activeOrder ? (
            <OrderDetail order={activeOrder} onBack={handleBackToList} />
          ) : (
            <>
              <div className={styles.headRow}>
                <div>
                  <h1 className={styles.title}>Your orders</h1>
                  <p className={styles.subTitle}>
                    Track shipments, check past purchases, and manage
                    returns.
                  </p>
                </div>
                <Link
                  href="/shop/wishlist"
                  className={styles.wishlistLink}
                >
                  My wishlist <FiArrowRight />
                </Link>
              </div>

              <div className={styles.filterRow}>
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    className={`${styles.filterChip} ${
                      filter === f.key ? styles.filterChipActive : ''
                    }`}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className={styles.emptyState}>
                  <p>Loading orders&hellip;</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className={styles.emptyState}>
                  <FiPackage className={styles.emptyIcon} />
                  <h2 className={styles.emptyTitle}>No orders here yet</h2>
                  <p className={styles.emptySub}>
                    {filter === 'all'
                      ? 'Once you check out, your orders will land here.'
                      : `No orders in "${filter}" status right now.`}
                  </p>
                  <Link
                    href="/shop"
                    className={`${styles.shopBtn} goldBTN`}
                  >
                    Start shopping
                  </Link>
                </div>
              ) : (
                <div className={styles.ordersGrid}>
                  {filtered.map((o) => (
                    <OrderCardCompact
                      key={o.id}
                      order={o}
                      onClick={() => handleOpenOrder(o)}
                    />
                  ))}
                </div>
              )}

              {activeId && !activeOrder && !loading && (
                <div className={styles.emptyState}>
                  <BsXCircle className={styles.emptyIcon} />
                  <h2 className={styles.emptyTitle}>Order not found</h2>
                  <p className={styles.emptySub}>
                    We couldn&apos;t find order #{activeId}. It may have been
                    placed too recently to appear in history.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

const OrdersPage = () => (
  <Suspense
    fallback={
      <div className={styles.pageContainer}>
        <p style={{ padding: '2rem', color: 'rgba(255,255,255,0.6)' }}>
          Loading orders&hellip;
        </p>
      </div>
    }
  >
    <OrdersInner />
  </Suspense>
);

export default OrdersPage;
