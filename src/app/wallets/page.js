'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LuArrowRight } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import TransactionTable from '@/components/wallet/TransactionTable';
import {
  formatNumber,
  ngnFromVc,
  isCreditType,
  normalizeType,
  normalizeStatus,
} from '@/components/wallet/walletHelpers';
import styles from './wallets.module.css';

// ── Stat helpers ────────────────────────────────────────────────────────────

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const computeStats = (transactions, withdrawals) => {
  const monthStart = startOfMonth();
  let earned = 0;
  let spent = 0;
  let lifetimeEarned = 0;

  (transactions || []).forEach((tx) => {
    const status = normalizeStatus(tx.status);
    if (status === 'failed' || status === 'cancelled') return;
    const credit = isCreditType(tx.type || tx.transaction_type);
    const amt = Math.abs(Number(tx.amount || tx.amount_vc || 0));
    const date = new Date(tx.created_at || tx.date || 0);
    if (credit) lifetimeEarned += amt;
    if (!Number.isNaN(date.getTime()) && date >= monthStart) {
      if (credit) earned += amt;
      else spent += amt;
    }
  });

  const pending = (withdrawals || [])
    .filter((w) => normalizeStatus(w.status) === 'pending')
    .reduce((sum, w) => sum + Math.abs(Number(w.amount_vc || w.amount || 0)), 0);

  return { earned, spent, pending, lifetimeEarned };
};

// ── Page ────────────────────────────────────────────────────────────────────

const WalletsContent = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [balance, setBalance] = useState(null);
  const [kycVerified, setKycVerified] = useState(true);
  const [hasPin, setHasPin] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [kycDismissed, setKycDismissed] = useState(false);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken
      ? { Authorization: `Bearer ${session.user.sessionToken}` }
      : {}),
  });

  // ── Paystack callback support ────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!session?.user?.sessionToken) return; // wait for token before verifying
    const ref = searchParams?.get('reference') || searchParams?.get('trxref');
    if (!ref) return;
    (async () => {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/topup/verify/`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ reference: ref }),
        });
      } catch (err) {
        console.error('Topup verify error:', err);
      } finally {
        // Strip query params + refresh data.
        router.replace('/wallets', { scroll: false });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.sessionToken]);

  // ── Initial fetch ────────────────────────────────────────────
  useEffect(() => {
    // Wait for the session token before hitting protected endpoints -
    // firing without a Bearer header returns 400s (tokenless race).
    if (!session?.user?.sessionToken) return;
    let cancelled = false;

    const loadBalance = async () => {
      setBalanceLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!cancelled && data?.status === 'success') {
          setBalance(Number(data.data?.balance ?? 0));
          setKycVerified(data.data?.kyc_verified ?? true);
          setHasPin(data.data?.has_pin ?? null);
        }
      } catch (err) {
        console.error('Balance fetch error:', err);
      } finally {
        if (!cancelled) setBalanceLoading(false);
      }
    };

    const loadTx = async () => {
      setTxLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/transactions/`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!cancelled && data?.status === 'success') {
          setTransactions(data.data?.transactions || []);
        }
      } catch (err) {
        console.error('Transactions fetch error:', err);
      } finally {
        if (!cancelled) setTxLoading(false);
      }
    };

    const loadWd = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/withdraw/status/`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!cancelled && data?.status === 'success') {
          // withdraw/status returns data as a list; tolerate {withdrawals:[…]} too.
          const wd = Array.isArray(data.data) ? data.data : (data.data?.withdrawals || []);
          setWithdrawals(wd);
        }
      } catch (err) {
        console.error('Withdrawals fetch error:', err);
      }
    };

    loadBalance();
    loadTx();
    loadWd();

    return () => { cancelled = true; };
  }, [session?.user?.sessionToken]);

  const stats = computeStats(transactions, withdrawals);
  const ngnBalance = ngnFromVc(balance ?? 0);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>

          {/* KYC banner if not verified */}
          {kycVerified === false && !kycDismissed && (
            <div className={styles.kycBanner}>
              <div className={styles.kycLeft}>
                <div className={styles.kycIconWrap}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(251,198,75,0.9)" strokeWidth="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <p className={styles.kycTitle}>Identity Verification Required</p>
                  <p className={styles.kycSub}>Complete KYC to unlock withdrawals and higher transaction limits.</p>
                </div>
              </div>
              <div className={styles.kycRight}>
                <Link href="/wallets/verify" className={styles.kycVerifyBtn}>Verify Now</Link>
                <button
                  type="button"
                  className={styles.kycDismissBtn}
                  onClick={() => setKycDismissed(true)}
                  aria-label="Dismiss KYC banner"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Hero balance + Quick actions */}
          <div className={styles.topRow}>
            <div className={styles.balanceCard}>
              <p className={styles.balanceLabel}>Available Balance</p>
              <div className={styles.balanceAmountRow}>
                <span className={styles.balanceNumber}>
                  {balanceLoading ? '-' : formatNumber(balance ?? 0)}
                </span>
                <span className={styles.balanceUnit}>VENT COINS</span>
              </div>
              <p className={styles.balanceNaira}>
                ≈ <span>₦{formatNumber(ngnBalance)}</span>
              </p>
              <p className={styles.balanceRate}>Exchange rate: ₦1,000 = 1 VENT COIN</p>

              <div className={styles.balanceBadges}>
                {kycVerified && (
                  <span className={styles.kycBadge}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    KYC Verified
                  </span>
                )}
                {hasPin === false && (
                  <Link href="/wallets/pin" className={styles.pendingBadge} style={{ textDecoration: 'none' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Set a wallet PIN
                  </Link>
                )}
                {hasPin === true && (
                  <Link href="/wallets/pin" className={styles.kycBadge} style={{ textDecoration: 'none' }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    PIN set · Manage
                  </Link>
                )}
                {stats.pending > 0 && (
                  <span className={styles.pendingBadge}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {formatNumber(stats.pending)} VC pending
                  </span>
                )}
              </div>
            </div>

            <div className={styles.actionsPanel}>
              <p className={styles.actionsLabel}>Quick Actions</p>
              <div className={styles.actionsRow}>
                <Link href="/wallets/topup" className={`${styles.actionBtn} ${styles.actionPrimary}`}>
                  <span className={`${styles.actionIcon} ${styles.actionIconTopup}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 7l-5-5-5 5" />
                    </svg>
                  </span>
                  <span className={styles.actionLabel}>Top Up</span>
                </Link>
                <Link href="/wallets/send" className={styles.actionBtn}>
                  <span className={`${styles.actionIcon} ${styles.actionIconSend}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </span>
                  <span className={styles.actionLabel}>Send</span>
                </Link>
                <Link href="/wallets/withdraw" className={styles.actionBtn}>
                  <span className={`${styles.actionIcon} ${styles.actionIconWithdraw}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <span className={styles.actionLabel}>Withdraw</span>
                </Link>
                <button type="button" className={styles.actionBtn} disabled aria-label="Convert (coming soon)">
                  <span className={`${styles.actionIcon} ${styles.actionIconConvert}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="17 1 21 5 17 9" />
                      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                      <polyline points="7 23 3 19 7 15" />
                      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                    </svg>
                  </span>
                  <span className={styles.actionLabel}>Convert</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stat tiles */}
          <div className={styles.statRow}>
            <div className={styles.statTile}>
              <p className={styles.statLabel}>This month earned</p>
              <p className={`${styles.statValue} ${styles.statGrn}`}>+{formatNumber(stats.earned)} VC</p>
              <p className={styles.statSub}>≈ ₦{formatNumber(ngnFromVc(stats.earned))}</p>
            </div>
            <div className={styles.statTile}>
              <p className={styles.statLabel}>This month spent</p>
              <p className={`${styles.statValue} ${styles.statRed}`}>
                {stats.spent > 0 ? `-${formatNumber(stats.spent)}` : '0'} VC
              </p>
              <p className={styles.statSub}>≈ ₦{formatNumber(ngnFromVc(stats.spent))}</p>
            </div>
            <div className={styles.statTile}>
              <p className={styles.statLabel}>Pending payouts</p>
              <p className={`${styles.statValue} ${styles.statWarn}`}>{formatNumber(stats.pending)} VC</p>
              <p className={styles.statSub}>{withdrawals.filter((w) => normalizeStatus(w.status) === 'pending').length} request(s)</p>
            </div>
            <div className={styles.statTile}>
              <p className={styles.statLabel}>Lifetime VC earned</p>
              <p className={styles.statValue}>{formatNumber(stats.lifetimeEarned)} VC</p>
              <p className={styles.statSub}>Top-ups + prizes + receives</p>
            </div>
          </div>

          {/* Transaction history preview */}
          <div className={styles.sectionRow}>
            <h2 className={styles.sectionTitle}>Transaction History</h2>
            <Link href="/wallets/history" className={styles.sectionLink}>
              View all <LuArrowRight />
            </Link>
          </div>

          <TransactionTable
            transactions={transactions}
            loading={txLoading}
            showFilters
            showAdvancedFilters={false}
            rowsPerPage={5}
            initial={{
              type: searchParams?.get('type') || '',
              status: searchParams?.get('status') || '',
              search: searchParams?.get('q') || '',
            }}
            onFiltersChange={(f) => {
              const params = new URLSearchParams();
              if (f.type) params.set('type', f.type);
              if (f.status) params.set('status', f.status);
              if (f.search) params.set('q', f.search);
              const qs = params.toString();
              router.replace(`/wallets${qs ? `?${qs}` : ''}`, { scroll: false });
            }}
            emptyText="No transactions yet - top up your wallet to get started."
          />
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

const Wallets = () => (
  <Suspense fallback={
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#131316' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>Loading…</p>
    </div>
  }>
    <WalletsContent />
  </Suspense>
);

export default Wallets;
