'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import {
  formatNumber,
  ngnFromVc,
  vcFromNgn,
} from '@/components/wallet/walletHelpers';
import styles from '../wallets.module.css';

const QUICK_AMOUNTS_VC = [1000, 5000, 10000, 50000];

const STEPS = [
  { n: 1, lbl: 'Amount' },
  { n: 2, lbl: 'Pay' },
  { n: 3, lbl: 'Done' },
];

const Stepper = ({ step }) => (
  <div className={styles.steps}>
    {STEPS.map((s, i) => {
      const status = step > s.n ? 'stepDone' : step === s.n ? 'stepActive' : 'stepWait';
      return (
        <div key={`wrap-${s.n}`} style={{ display: 'contents' }}>
          <div className={`${styles.step} ${styles[status]}`}>
            <div className={styles.stepCircle}>{step > s.n ? '✓' : s.n}</div>
            <div className={styles.stepLbl}>{s.lbl}</div>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`${styles.stepLine} ${step > s.n ? styles.stepLineDone : ''}`} />
          )}
        </div>
      );
    })}
  </div>
);

const TopupPage = () => {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState(1);
  const [vc, setVc] = useState('');
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('paystack');
  const [polling, setPolling] = useState(false);
  const [newBalance, setNewBalance] = useState(null);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken
      ? { Authorization: `Bearer ${session.user.sessionToken}` }
      : {}),
  });

  const numericVc = Number(vc) || 0;
  const ngn = ngnFromVc(numericVc);

  const handleQuickPick = (val) => {
    setVc(String(val));
    setError('');
  };

  const goToReview = () => {
    if (!numericVc || numericVc < 1) {
      setError('Enter the amount of VENT COINS you want to buy.');
      return;
    }
    if (numericVc < 1) {
      setError('Minimum top-up is 1 VC (₦1,000).');
      return;
    }
    setError('');
    setStep(2);
  };

  const handlePayNow = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/topup/initiate/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ amount_ngn: ngn, vc: numericVc, method: paymentMethod }),
      });
      const data = await res.json();
      if (data?.status !== 'success') {
        setError(data?.message || 'Could not start the top-up.');
        setSubmitting(false);
        return;
      }
      setReference(data.data?.reference || '');
      setAuthorizationUrl(data.data?.authorization_url || '');
      setPolling(true);
      // Simulate Paystack pending state for ~1.2s, then verify.
      setTimeout(async () => {
        try {
          const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/topup/verify/`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reference: data.data?.reference }),
          });
          const verifyData = await verifyRes.json();
          if (verifyData?.status === 'success') {
            setNewBalance(verifyData.data?.balance ?? null);
            setStep(3);
          } else {
            setError(verifyData?.message || 'Payment verification failed.');
          }
        } catch (err) {
          setError('Network error during verification.');
          console.error(err);
        } finally {
          setPolling(false);
          setSubmitting(false);
        }
      }, 1200);
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  const handleDone = () => router.push('/wallets');

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>Top Up Wallet</h1>
              <p className={styles.pageSubtitle}>Buy VENT COINS via Paystack. Rate: ₦1,000 = 1 VC.</p>
            </div>
          </div>

          <div className={styles.formCard}>
            <Stepper step={step} />

            {step === 1 && (
              <>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Amount (VENT COINS)</label>
                  <div className={styles.inputPrefixWrap}>
                    <span className={styles.prefixTag}>VC</span>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      min="1"
                      value={vc}
                      onChange={(e) => { setVc(e.target.value); setError(''); }}
                    />
                  </div>
                  <div className={styles.quickAmountRow}>
                    {QUICK_AMOUNTS_VC.map((q) => (
                      <button
                        key={q}
                        type="button"
                        className={`${styles.quickChip} ${String(q) === vc ? styles.quickChipActive : ''}`}
                        onClick={() => handleQuickPick(q)}
                      >
                        {q.toLocaleString()} VC
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>You will pay</span>
                  <span className={`${styles.infoRowVal} ${styles.infoNeutral}`}>
                    ₦{numericVc > 0 ? formatNumber(ngn) : '0'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>You receive</span>
                  <span className={styles.infoRowVal}>
                    {numericVc > 0 ? formatNumber(numericVc) : '0'} VC
                  </span>
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>Cancel</Link>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={goToReview}>
                    Continue
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h3 style={{ fontSize: '1rem', margin: '0 0 0.4rem' }}>Choose payment method</h3>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', marginBottom: '1rem', fontFamily: 'Inter, sans-serif' }}>
                  V-ENT supports Paystack for top-ups. More methods coming soon.
                </p>

                <div className={styles.bankRow + ' ' + styles.bankRowActive} style={{ cursor: 'default' }}>
                  <div>
                    <div className={styles.bankName}>Paystack</div>
                    <div className={styles.bankHolder}>Card • Bank Transfer • USSD</div>
                  </div>
                  <span className={styles.bankDefault}>✓ Selected</span>
                </div>

                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>You pay</span>
                    <span className={styles.summaryVal}>₦{formatNumber(ngn)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>You receive</span>
                    <span className={`${styles.summaryVal} ${styles.summaryGrn}`}>{formatNumber(numericVc)} VC</span>
                  </div>
                  <div className={styles.summaryHr} />
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Processing fee</span>
                    <span className={styles.summaryVal}>₦0</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Total</span>
                    <span className={styles.summaryVal}>₦{formatNumber(ngn)}</span>
                  </div>
                </div>

                <div className={`${styles.notice} ${styles.noticeInfo}`}>
                  After payment your wallet will be credited within seconds. You can leave this page once redirected.
                </div>

                {polling && (
                  <div className={styles.processingState}>
                    <div className={styles.spinner} />
                    <p className={styles.processingTitle}>Processing payment…</p>
                    <p className={styles.processingSub}>Verifying with Paystack - please don&apos;t close this page.</p>
                  </div>
                )}

                {error && !polling && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                {!polling && (
                  <div className={styles.btnRow}>
                    <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(1)} disabled={submitting}>
                      Back
                    </button>
                    <button type="button" className={`${styles.btn} ${styles.btnGrn}`} onClick={handlePayNow} disabled={submitting}>
                      {submitting ? 'Please wait…' : `Pay ₦${formatNumber(ngn)} now`}
                    </button>
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <div className={styles.successCenter}>
                <div className={styles.successIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--v-ent-gold)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className={styles.successTitle}>Top-up Successful</h3>
                <p className={styles.successSub}>
                  <strong style={{ color: 'var(--v-ent-gold)' }}>{formatNumber(numericVc)} VENT COINS</strong> have been added to your wallet.
                </p>

                <div className={styles.summaryList} style={{ textAlign: 'left' }}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>You paid</span>
                    <span className={styles.summaryVal}>₦{formatNumber(ngn)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Reference</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRef}`}>{reference || '-'}</span>
                  </div>
                  {newBalance != null && (
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>New balance</span>
                      <span className={`${styles.summaryVal} ${styles.summaryGrn}`}>{formatNumber(newBalance)} VC</span>
                    </div>
                  )}
                </div>

                <button type="button" className={`${styles.btn} ${styles.btnRed} ${styles.btnFull}`} onClick={handleDone}>
                  Back to Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>
  );
};

export default TopupPage;
