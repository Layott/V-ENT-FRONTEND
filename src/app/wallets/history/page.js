'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import TransactionTable from '@/components/wallet/TransactionTable';
import styles from '../wallets.module.css';

const HistoryContent = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken
      ? { Authorization: `Bearer ${session.user.sessionToken}` }
      : {}),
  });

  useEffect(() => {
    let cancelled = false;
    // The wallet API is mounted under /auth/ - without the prefix this 404s and
    // the page silently renders "No transactions match your filters."
    if (!session?.user?.sessionToken) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/transactions/`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!cancelled && data?.status === 'success') {
          setTransactions(data.data?.transactions || []);
        }
      } catch (err) {
        console.error('History fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.sessionToken]);

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>Transaction History</h1>
              <p className={styles.pageSubtitle}>Every wallet movement, with full filters and detail.</p>
            </div>
          </div>

          <TransactionTable
            transactions={transactions}
            loading={loading}
            showFilters
            showAdvancedFilters
            rowsPerPage={12}
            initial={{
              type: searchParams?.get('type') || '',
              status: searchParams?.get('status') || '',
              search: searchParams?.get('q') || '',
              from: searchParams?.get('from') || '',
              to: searchParams?.get('to') || '',
            }}
            onFiltersChange={(f) => {
              const params = new URLSearchParams();
              if (f.type) params.set('type', f.type);
              if (f.status) params.set('status', f.status);
              if (f.search) params.set('q', f.search);
              if (f.from) params.set('from', f.from);
              if (f.to) params.set('to', f.to);
              const qs = params.toString();
              router.replace(`/wallets/history${qs ? `?${qs}` : ''}`, { scroll: false });
            }}
            emptyText="No transactions match your filters."
          />
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

const HistoryPage = () => (
  <Suspense fallback={
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#131316' }}>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>Loading…</p>
    </div>
  }>
    <HistoryContent />
  </Suspense>
);

export default HistoryPage;
