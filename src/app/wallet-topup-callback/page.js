'use client'

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './wallet-topup-callback.module.css';

function WalletTopupCallbackInner() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [verifyStatus, setVerifyStatus] = useState('verifying'); // verifying | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    const reference = searchParams.get('reference') || searchParams.get('trxref');
    const redirectTo = searchParams.get('redirect_to');

    if (!reference) {
      setVerifyStatus('error');
      setMessage('No payment reference found.');
      return;
    }

    if (!session?.user?.sessionToken) {
      router.replace(`/login?next=${encodeURIComponent(window.location.href)}`);
      return;
    }

    verifyTopup(reference, redirectTo);
  }, [sessionStatus, session]);

  const verifyTopup = async (reference, redirectTo) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/topup/verify/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.user.sessionToken}`,
        },
        body: JSON.stringify({ reference }),
      });
      const data = await res.json();

      if (data.status === 'success') {
        setVerifyStatus('success');
        setMessage('Top-up successful! Your wallet has been credited.');
        setTimeout(() => {
          router.replace(redirectTo || '/wallets');
        }, 2000);
      } else {
        setVerifyStatus('error');
        setMessage(data.message || 'Payment verification failed. Please contact support.');
      }
    } catch (err) {
      console.error('Topup verify error:', err);
      setVerifyStatus('error');
      setMessage('An error occurred while verifying your payment. Please contact support.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {verifyStatus === 'verifying' && (
          <>
            <div className={styles.spinner}></div>
            <p className={styles.text}>Verifying your payment...</p>
          </>
        )}
        {verifyStatus === 'success' && (
          <>
            <div className={styles.iconSuccess}>✓</div>
            <p className={styles.text}>{message}</p>
            <p className={styles.subtext}>Redirecting...</p>
          </>
        )}
        {verifyStatus === 'error' && (
          <>
            <div className={styles.iconError}>✕</div>
            <p className={styles.text}>{message}</p>
            <button className="btn goldBTN" onClick={() => router.replace('/wallets')}>
              Go to Wallet
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function WalletTopupCallback() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'sans-serif' }}>Loading…</p>
      </div>
    }>
      <WalletTopupCallbackInner />
    </Suspense>
  );
}
