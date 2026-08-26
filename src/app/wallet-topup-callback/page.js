'use client';

import { apiMessage } from '@/lib/apiMessage';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './wallet-topup-callback.module.css';
import { useT } from '@/i18n/LanguageProvider';
function WalletTopupCallbackInner() {
  const tt = useT();
  const {
    data: session,
    status: sessionStatus
  } = useSession();
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
      setMessage(tt("msg.noPaymentReferenceFound", "No payment reference found."));
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
          Authorization: `Bearer ${session.user.sessionToken}`
        },
        body: JSON.stringify({
          reference
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setVerifyStatus('success');
        setMessage(tt("msg.topUpSuccessfulYourWallet", "Top-up successful! Your wallet has been credited."));
        setTimeout(() => {
          router.replace(redirectTo || '/wallets');
        }, 2000);
      } else {
        setVerifyStatus('error');
        setMessage(apiMessage(tt, data, "api.paymentVerificationFailedPleaseContact", "Payment verification failed. Please contact support."));
      }
    } catch (err) {
      console.error('Topup verify error:', err);
      setVerifyStatus('error');
      setMessage(tt("msg.anErrorOccurredWhileVerifying", "An error occurred while verifying your payment. Please contact support."));
    }
  };
  return <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.pageTitle}>{tt("topup.callback.title", "Wallet top-up")}</h1>
        {verifyStatus === 'verifying' && <>
            <div className={styles.spinner}></div>
            <p className={styles.text}>{tt("ui.verifying.payment.675b", "Verifying your payment...")}</p>
          </>}
        {verifyStatus === 'success' && <>
            <div className={styles.iconSuccess}>✓</div>
            <p className={styles.text}>{message}</p>
            <p className={styles.subtext}>{tt("ui.redirecting.a7e1", "Redirecting...")}</p>
          </>}
        {verifyStatus === 'error' && <>
            <div className={styles.iconError}>✕</div>
            <p className={styles.text}>{message}</p>
            <button className="btn goldBTN" onClick={() => router.replace('/wallets')}>
              {tt("ui.go.wallet.191c", "Go to Wallet")}
            </button>
          </>}
      </div>
    </div>;
}
export default function WalletTopupCallback() {
  const tt = useT();
  return <Suspense fallback={<div style={{
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#000'
  }}>
        <p style={{
      color: 'rgba(255,255,255,0.4)',
      fontFamily: 'sans-serif'
    }}>{tt("ui.loading.33ce", "Loading…")}</p>
      </div>}>
      <WalletTopupCallbackInner />
    </Suspense>;
}