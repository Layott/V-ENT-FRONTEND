'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { BsChevronLeft } from 'react-icons/bs';
import { MdOutlineClose } from 'react-icons/md';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import styles from './purchase.module.css';

const STEPS = [
  { key: 'escrow', label: 'Escrow held' },
  { key: 'in_transit', label: 'In transit' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'completed', label: 'Confirmed' },
];

const STATUS_INFO = {
  escrow: {
    title: 'Funds are held in escrow',
    body: 'Your VENT COINS have been deducted from your wallet and are held by V-ENT. They will only release to the seller after you confirm delivery.',
    badgeClass: 'statusEscrow',
    badgeLabel: 'In escrow',
  },
  in_transit: {
    title: 'Item is on the way',
    body: 'The seller has marked your order as shipped. Once it arrives, confirm receipt to release escrow funds.',
    badgeClass: 'statusInTransit',
    badgeLabel: 'In transit',
  },
  delivered: {
    title: 'Item delivered',
    body: 'The seller marked this order as delivered. Confirm receipt to release escrow funds.',
    badgeClass: 'statusDelivered',
    badgeLabel: 'Delivered',
  },
  completed: {
    title: 'Order completed',
    body: 'Funds have been released to the seller. Thanks for shopping in Vermillion City.',
    badgeClass: 'statusCompleted',
    badgeLabel: 'Completed',
  },
  disputed: {
    title: 'Dispute open',
    body: 'V-ENT is reviewing your dispute. We typically resolve within 24–48 hours.',
    badgeClass: 'statusDisputed',
    badgeLabel: 'Disputed',
  },
  refunded: {
    title: 'Order refunded',
    body: 'The seller refunded this order. Funds have been returned to your V-ENT wallet.',
    badgeClass: 'statusRefunded',
    badgeLabel: 'Refunded',
  },
};

const statusToStepIndex = (status) => {
  if (status === 'escrow') return 0;
  if (status === 'in_transit' || status === 'shipped') return 1;
  if (status === 'delivered') return 2;
  if (status === 'completed') return 3;
  return 0;
};

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const PurchaseInner = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || 'pur_0';

  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 2400);
  };

  useEffect(() => {
    let mounted = true;
    const fetchPurchase = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/orders/${id}/`);
        const data = await res.json();
        if (mounted && data.status === 'success') setPurchase(data.data.purchase);
      } catch (err) {
        console.error('Purchase fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchPurchase();
    return () => { mounted = false; };
  }, [id]);

  const handleConfirm = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/orders/${id}/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPurchase((prev) => prev ? { ...prev, status: 'completed' } : prev);
        showToast('Order confirmed — funds released to seller');
      }
    } catch {
      showToast('Could not confirm receipt');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason.trim()) { showToast('Add a reason before opening a dispute'); return; }
    setActionLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/marketplace/orders/${id}/dispute/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setPurchase((prev) => prev ? { ...prev, status: 'disputed', dispute_reason: disputeReason } : prev);
        setDisputeOpen(false);
        showToast('Dispute opened — V-ENT support will reach out');
      }
    } catch {
      showToast('Could not open dispute');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !purchase) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <p className={styles.stateText}>Loading order…</p>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  const status = purchase.status === 'shipped' ? 'in_transit' : purchase.status;
  const info = STATUS_INFO[status] || STATUS_INFO.escrow;
  const stepIdx = statusToStepIndex(status);
  const total = purchase.total_vc || (purchase.price_vc + (purchase.shipping_cost_vc || 0));

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

          <div>
            <h1 className={styles.title}>Order {purchase.id}</h1>
            <p className={styles.sub}>Placed {formatDate(purchase.created_at)}</p>
          </div>

          <div className={styles.layout}>
            {/* Status panel */}
            <section className={styles.statusPanel}>
              <div className={styles.statusHeadline}>
                <span className={`${styles.statusBadge} ${styles[info.badgeClass]}`}>{info.badgeLabel}</span>
                <h2 className={styles.statusTitle}>{info.title}</h2>
              </div>

              <p className={styles.statusBody}>{info.body}</p>

              {/* Stepper (hidden on disputed/refunded final states) */}
              {status !== 'disputed' && status !== 'refunded' && (
                <div className={styles.stepper}>
                  {STEPS.map((s, i) => (
                    <div
                      key={s.key}
                      className={`${styles.step} ${i === stepIdx ? styles.stepActive : i < stepIdx ? styles.stepDone : ''}`}
                    >
                      {i + 1}. {s.label}
                    </div>
                  ))}
                </div>
              )}

              {purchase.tracking_number && (
                <p className={styles.statusBody}>
                  Tracking number: <strong style={{ color: 'var(--primary-bg)' }}>{purchase.tracking_number}</strong>
                </p>
              )}

              {purchase.dispute_reason && (
                <div className={styles.disputeNote}>
                  Dispute reason: {purchase.dispute_reason}
                </div>
              )}

              {/* Actions per status */}
              <div className={styles.actions}>
                {(status === 'in_transit' || status === 'delivered') && (
                  <button
                    type="button"
                    className={styles.btnPrimary}
                    onClick={handleConfirm}
                    disabled={actionLoading}
                  >
                    {actionLoading ? 'Releasing…' : 'Confirm receipt & release funds'}
                  </button>
                )}
                {status === 'escrow' && (
                  <button type="button" className={styles.btnGhost} disabled>
                    Awaiting seller to ship
                  </button>
                )}
                {(status === 'escrow' || status === 'in_transit' || status === 'delivered') && (
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => setDisputeOpen(true)}
                  >
                    Open dispute
                  </button>
                )}
                {status === 'completed' && (
                  <Link href={`/marketplace/listing?id=${purchase.listing?.id}`} className={styles.btnGhost} style={{ textDecoration: 'none', textAlign: 'center' }}>
                    Buy again
                  </Link>
                )}
                {status === 'refunded' && (
                  <Link href="/marketplace" className={styles.btnGhost} style={{ textDecoration: 'none', textAlign: 'center' }}>
                    Continue shopping
                  </Link>
                )}
              </div>
            </section>

            {/* Summary card */}
            <aside className={styles.summary}>
              <div className={styles.summaryHead}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={purchase.listing?.images?.[0]} alt={purchase.listing?.title} className={styles.summaryThumb} />
                <div>
                  <h3 className={styles.summaryTitle}>{purchase.listing?.title}</h3>
                  <p className={styles.summarySub}>Sold by @{purchase.seller?.username}</p>
                </div>
              </div>

              <div className={styles.summaryRow}>
                <span>Item price</span>
                <span>{purchase.price_vc?.toLocaleString()} VC</span>
              </div>
              {purchase.shipping_cost_vc > 0 && (
                <div className={styles.summaryRow}>
                  <span>Shipping</span>
                  <span>{purchase.shipping_cost_vc} VC</span>
                </div>
              )}
              <div className={styles.summaryRow}>
                <span>Quantity</span>
                <span>{purchase.qty || 1}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Total paid</span>
                <span className={styles.summaryGreen}>{total.toLocaleString()} VC</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Escrow release by</span>
                <span>{formatDate(purchase.escrow_release_at)}</span>
              </div>
              {purchase.refund_amount_vc > 0 && (
                <div className={styles.summaryRow}>
                  <span>Refunded</span>
                  <span style={{ color: '#ff8a8f' }}>{purchase.refund_amount_vc.toLocaleString()} VC</span>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      <BottomMenu />

      {toast && <div className={styles.toast}>{toast}</div>}

      {disputeOpen && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) setDisputeOpen(false); }}>
          <div className={styles.modal}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className={styles.modalTitle}>Open dispute</h3>
              <button
                type="button"
                onClick={() => setDisputeOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: '1.4rem', cursor: 'pointer' }}
              >
                <MdOutlineClose />
              </button>
            </div>
            <p className={styles.modalLabel}>What went wrong?</p>
            <textarea
              className={styles.modalTextarea}
              placeholder="Describe the issue with the order. V-ENT support will review."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
            />
            <div className={styles.actions}>
              <button type="button" className={styles.btnGhost} onClick={() => setDisputeOpen(false)}>Cancel</button>
              <button
                type="button"
                className={styles.btnDanger}
                onClick={handleDispute}
                disabled={actionLoading}
              >
                {actionLoading ? 'Submitting…' : 'Submit dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PurchasePage = () => (
  <Suspense fallback={<div style={{ padding: '4rem', color: '#fff', backgroundColor: '#131316', minHeight: '100vh' }}>Loading…</div>}>
    <PurchaseInner />
  </Suspense>
);

export default PurchasePage;
