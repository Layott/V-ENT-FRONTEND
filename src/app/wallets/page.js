'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header'
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu'
import Sidebar from '@/components/sidebar/Sidebar'
import styles from './wallets.module.css'

const Wallets = () => {
  const { data: session } = useSession();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!session?.user?.sessionToken) return;
    fetchBalance();
    fetchTransactions();
  }, [session?.user?.sessionToken]);

  const fetchBalance = async () => {
    setBalanceLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
        headers: { Authorization: `Bearer ${session.user.sessionToken}` },
      });
      const data = await res.json();
      if (data.status === 'success') {
        setBalance(data.data.balance);
      } else {
        setError('Failed to load wallet balance.');
      }
    } catch (err) {
      console.error('Balance fetch error:', err);
      setError('Failed to load wallet balance.');
    } finally {
      setBalanceLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setTxLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/transactions/`, {
        headers: { Authorization: `Bearer ${session.user.sessionToken}` },
      });
      const data = await res.json();
      if (data.status === 'success') {
        setTransactions(data.data.transactions || data.data || []);
      }
    } catch (err) {
      console.error('Transactions fetch error:', err);
    } finally {
      setTxLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-NG', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const getTxTypeLabel = (type) => {
    const labels = {
      topup: 'Top-up',
      debit: 'Debit',
      credit: 'Credit',
      tournament_fee: 'Tournament Fee',
      withdrawal: 'Withdrawal',
    };
    return labels[type] || type;
  };

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <h3 className={styles.pageTitle}>Wallet</h3>
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          {/* Balance card */}
          <div className={styles.balanceCard}>
            <p className={styles.balanceLabel}>Available Balance</p>
            {balanceLoading ? (
              <p className={styles.balanceAmount}>Loading...</p>
            ) : (
              <p className={styles.balanceAmount}>
                {balance !== null ? `${balance} vent coins` : '—'}
              </p>
            )}
            <p className={styles.balanceRate}>N1,000 = 1 vent coin</p>
          </div>

          {/* Transaction history */}
          <div className={styles.transactionsSection}>
            <h4 className={styles.sectionTitle}>Transaction History</h4>

            {txLoading ? (
              <p className={styles.loadingText}>Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p className={styles.emptyText}>No transactions yet.</p>
            ) : (
              <div className={styles.transactionList}>
                {transactions.map((tx, i) => (
                  <div key={tx.id || i} className={styles.transactionRow}>
                    <div className={styles.txLeft}>
                      <span className={styles.txType}>{getTxTypeLabel(tx.transaction_type || tx.type)}</span>
                      <span className={styles.txDate}>{formatDate(tx.created_at || tx.date)}</span>
                    </div>
                    <span className={`${styles.txAmount} ${tx.transaction_type === 'debit' || tx.transaction_type === 'tournament_fee' ? styles.txDebit : styles.txCredit}`}>
                      {tx.transaction_type === 'debit' || tx.transaction_type === 'tournament_fee' ? '-' : '+'}
                      {tx.amount} vc
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default Wallets;
