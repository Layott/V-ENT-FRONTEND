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
  calcWithdrawFee,
  calcNetPayout,
  NIGERIAN_BANKS,
} from '@/components/wallet/walletHelpers';
import styles from '../wallets.module.css';

const STEPS = [
  { n: 1, lbl: 'Details' },
  { n: 2, lbl: 'Review' },
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

// Use a localStorage key so "saved bank" persists across the mock session.
const SAVED_BANKS_KEY = 'v-ent.wallet.savedBanks';

const WithdrawPage = () => {
  const router = useRouter();
  const { data: session } = useSession();

  const [step, setStep] = useState(1);
  const [balance, setBalance] = useState(null);
  const [kycVerified, setKycVerified] = useState(true);
  const [tab, setTab] = useState('saved');
  const [savedBanks, setSavedBanks] = useState([]);
  const [selectedBankIdx, setSelectedBankIdx] = useState(0);

  const [vc, setVc] = useState('');
  const [bank, setBank] = useState('');
  const [accNum, setAccNum] = useState('');
  const [accName, setAccName] = useState('');
  const [savePref, setSavePref] = useState(true);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken
      ? { Authorization: `Bearer ${session.user.sessionToken}` }
      : {}),
  });

  // Load balance + KYC + saved banks
  useEffect(() => {
    let cancelled = false;
    // Wait for the NextAuth token - a tokenless call 400s and shows a 0 balance.
    if (!session?.user?.sessionToken) return;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
          headers: authHeaders(),
        });
        const data = await res.json();
        if (!cancelled && data?.status === 'success') {
          setBalance(Number(data.data?.balance ?? 0));
          setKycVerified(data.data?.kyc_verified ?? true);
        }
      } catch (err) {
        console.error('Balance fetch error:', err);
      }
    })();

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(SAVED_BANKS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSavedBanks(parsed);
            setTab('saved');
          } else {
            setTab('new');
          }
        } else {
          setTab('new');
        }
      } catch {
        setTab('new');
      }
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.sessionToken]);

  // The account holder's name is typed by the user. It used to be "auto-resolved"
  // by a helper that returned the same hardcoded name for every account number,
  // so every payout confirmation showed a name nobody had verified. Real
  // resolution needs Paystack's resolve-account API behind a backend endpoint;
  // until that exists, an honest text field beats a confident fake.

  const numericVc = Number(vc) || 0;
  const grossNgn = ngnFromVc(numericVc);
  const fee = calcWithdrawFee(grossNgn);
  const netNgn = calcNetPayout(grossNgn);

  const activeBank = tab === 'saved'
    ? savedBanks[selectedBankIdx]
    : { bank_name: bank, account_number: accNum, account_name: accName };

  const validateAndReview = () => {
    setError('');
    if (!numericVc || numericVc < 1) { setError('Enter how many VC you want to withdraw.'); return; }
    if (balance != null && numericVc > balance) { setError('Insufficient balance.'); return; }
    if (tab === 'saved') {
      if (!savedBanks.length) { setError('No saved bank yet - add a new one.'); return; }
    } else {
      if (!bank) { setError('Select a bank.'); return; }
      if (accNum.length !== 10) { setError('Enter a valid 10-digit account number.'); return; }
      if (!accName.trim()) { setError('Enter the account name exactly as your bank has it.'); return; }
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const payload = {
      amount: numericVc,
      amount_vc: numericVc,
      bank_name: activeBank.bank_name,
      account_number: activeBank.account_number,
      account_name: activeBank.account_name,
    };
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/withdraw/initiate/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data?.status !== 'success') {
        setError(data?.message || 'Withdrawal request failed.');
        setSubmitting(false);
        return;
      }
      setReference(data.data?.reference || `WDR-${Date.now().toString().slice(-8)}`);

      // Save bank for future if requested + on a "new" submission
      if (tab === 'new' && savePref && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(SAVED_BANKS_KEY);
          const list = raw ? JSON.parse(raw) : [];
          const exists = list.some((b) => b.account_number === accNum && b.bank_name === bank);
          if (!exists) {
            list.unshift({ bank_name: bank, account_number: accNum, account_name: accName, is_default: list.length === 0 });
            localStorage.setItem(SAVED_BANKS_KEY, JSON.stringify(list));
          }
        } catch {
          /* ignore */
        }
      }

      setStep(3);
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // KYC gate
  if (kycVerified === false) {
    return (
      <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderLeft}>
                <h1 className={styles.pageTitle}>Withdraw to Bank</h1>
                <p className={styles.pageSubtitle}>Identity verification required.</p>
              </div>
            </div>
            <div className={styles.blockedCard}>
              <div className={styles.warnIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <h3 className={styles.successTitle}>Verify your identity first</h3>
              <p className={styles.successSub}>
                Withdrawals require KYC verification. It takes about 24 hours and unlocks higher limits too.
              </p>
              <div className={styles.btnRow}>
                <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>Back to wallet</Link>
                <Link href="/settings" className={`${styles.btn} ${styles.btnRed}`}>Verify identity</Link>
              </div>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>Withdraw to Bank</h1>
              <p className={styles.pageSubtitle}>Convert VENT COINS to NGN and send to your bank.</p>
            </div>
          </div>

          <div className={styles.formCard}>
            <Stepper step={step} />

            {step === 1 && (
              <>
                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>Your balance</span>
                  <span className={styles.infoRowVal}>{formatNumber(balance ?? 0)} VC</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Amount (VENT COINS)</label>
                  <div className={styles.inputPrefixWrap}>
                    <span className={styles.prefixTag}>VC</span>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      min="1"
                      max={balance ?? undefined}
                      value={vc}
                      onChange={(e) => { setVc(e.target.value); setError(''); }}
                    />
                  </div>
                </div>

                {numericVc > 0 && (
                  <div className={styles.summaryList}>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>NGN value</span>
                      <span className={styles.summaryVal}>₦{formatNumber(grossNgn)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>Withdrawal fee (2% + ₦50)</span>
                      <span className={`${styles.summaryVal} ${styles.summaryRed}`}>-₦{formatNumber(fee)}</span>
                    </div>
                    <div className={styles.summaryHr} />
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>You will receive</span>
                      <span className={`${styles.summaryVal} ${styles.summaryGrn}`}>₦{formatNumber(netNgn)}</span>
                    </div>
                  </div>
                )}

                <div className={styles.modalTabs}>
                  <button
                    type="button"
                    className={`${styles.modalTab} ${tab === 'saved' ? styles.modalTabActive : ''}`}
                    onClick={() => setTab('saved')}
                  >
                    Saved Bank
                  </button>
                  <button
                    type="button"
                    className={`${styles.modalTab} ${tab === 'new' ? styles.modalTabActive : ''}`}
                    onClick={() => setTab('new')}
                  >
                    New Bank
                  </button>
                </div>

                {tab === 'saved' && (
                  savedBanks.length > 0 ? (
                    <>
                      {savedBanks.map((b, idx) => (
                        <div
                          key={`${b.bank_name}-${b.account_number}`}
                          className={`${styles.bankRow} ${idx === selectedBankIdx ? styles.bankRowActive : ''}`}
                          onClick={() => setSelectedBankIdx(idx)}
                        >
                          <div>
                            <div className={styles.bankName}>
                              {b.bank_name} - ****{String(b.account_number).slice(-4)}
                            </div>
                            <div className={styles.bankHolder}>{b.account_name}</div>
                          </div>
                          {idx === selectedBankIdx && <span className={styles.bankDefault}>✓ Selected</span>}
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className={styles.txEmpty} style={{ padding: '0.85rem 0' }}>
                      No saved bank accounts yet - switch to <strong style={{ color: 'var(--primary-bg)' }}>New Bank</strong> to add one.
                    </p>
                  )
                )}

                {tab === 'new' && (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Bank Name</label>
                      <select
                        className={styles.formInput}
                        value={bank}
                        onChange={(e) => setBank(e.target.value)}
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="">Select bank…</option>
                        {NIGERIAN_BANKS.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Account Number</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="10-digit account number"
                        maxLength={10}
                        value={accNum}
                        onChange={(e) => setAccNum(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        inputMode="numeric"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Account Name</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="Exactly as your bank has it"
                        value={accName}
                        onChange={(e) => setAccName(e.target.value)}
                        maxLength={100}
                      />
                    </div>
                    <label className={styles.checkboxRow}>
                      <input
                        type="checkbox"
                        checked={savePref}
                        onChange={(e) => setSavePref(e.target.checked)}
                      />
                      Save this bank for future withdrawals
                    </label>
                  </>
                )}

                <div className={`${styles.notice} ${styles.noticeWarn}`}>
                  Withdrawals are processed within 1-3 business days after admin approval.
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>Cancel</Link>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={validateAndReview}>
                    Review
                  </button>
                </div>
              </>
            )}

            {step === 2 && activeBank && (
              <>
                <h3 style={{ fontSize: '1rem', margin: '0 0 0.4rem' }}>Review withdrawal</h3>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem', fontFamily: 'Inter, sans-serif' }}>
                  Confirm the destination bank and amount before submitting for review.
                </p>

                <div className={styles.bankRow}>
                  <div>
                    <div className={styles.bankName}>
                      {activeBank.bank_name} - ****{String(activeBank.account_number || '').slice(-4)}
                    </div>
                    <div className={styles.bankHolder}>{activeBank.account_name}</div>
                  </div>
                </div>

                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Amount</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRed}`}>-{formatNumber(numericVc)} VC</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>NGN value</span>
                    <span className={styles.summaryVal}>₦{formatNumber(grossNgn)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Withdrawal fee</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRed}`}>-₦{formatNumber(fee)}</span>
                  </div>
                  <div className={styles.summaryHr} />
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Net payout</span>
                    <span className={`${styles.summaryVal} ${styles.summaryGrn}`}>₦{formatNumber(netNgn)}</span>
                  </div>
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(1)} disabled={submitting}>
                    Back
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnGrn}`} onClick={handleSubmit} disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <div className={styles.successCenter}>
                <div className={styles.warnIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className={styles.successTitle}>Withdrawal Requested</h3>
                <p className={styles.successSub}>
                  Your request for <strong style={{ color: 'var(--primary-bg)' }}>{formatNumber(numericVc)} VC</strong> (₦{formatNumber(netNgn)} net) is now <strong style={{ color: 'rgba(251,198,75,0.95)' }}>pending admin approval</strong>.
                </p>

                <div className={styles.summaryList} style={{ textAlign: 'left' }}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Reference</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRef}`}>{reference}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Destination</span>
                    <span className={styles.summaryVal}>
                      {activeBank?.bank_name} ****{String(activeBank?.account_number || '').slice(-4)}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>Status</span>
                    <span className={styles.summaryVal} style={{ color: 'rgba(251,198,75,0.95)' }}>Pending approval</span>
                  </div>
                </div>

                <button type="button" className={`${styles.btn} ${styles.btnRed} ${styles.btnFull}`} onClick={() => router.push('/wallets')}>
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

export default WithdrawPage;
