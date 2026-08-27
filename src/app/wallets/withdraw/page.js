'use client';

import { KYC_REQUIRED } from '@/lib/features';
import { apiMessage } from '@/lib/apiMessage';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import { formatNumber, ngnFromVc, calcWithdrawFee, calcNetPayout, NIGERIAN_BANKS } from '@/components/wallet/walletHelpers';
import styles from '../wallets.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const STEPS = [{
  n: 1,
  lbl: 'Details'
}, {
  n: 2,
  lbl: 'Review'
}, {
  n: 3,
  lbl: 'Done'
}];
const Stepper = ({
  step
}) => {
  // Bound here rather than in the page: this is its own component, defined at
  // module scope, so the page's translator is not in scope for it. That is
  // what threw "tx is not defined" at prerender.
  const tx = useTx();
  return <div className={styles.steps}>
    {STEPS.map((s, i) => {
    const status = step > s.n ? 'stepDone' : step === s.n ? 'stepActive' : 'stepWait';
    return <div key={`wrap-${s.n}`} style={{
      display: 'contents'
    }}>
          <div className={`${styles.step} ${styles[status]}`}>
            <div className={styles.stepCircle}>{step > s.n ? '✓' : s.n}</div>
            <div className={styles.stepLbl}>{tx(s.lbl)}</div>
          </div>
          {i < STEPS.length - 1 && <div className={`${styles.stepLine} ${step > s.n ? styles.stepLineDone : ''}`} />}
        </div>;
  })}
  </div>;
};

// Use a localStorage key so "saved bank" persists across the mock session.

const SAVED_BANKS_KEY = 'v-ent.wallet.savedBanks';
const WithdrawPage = () => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const {
    data: session
  } = useSession();
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
    ...(session?.user?.sessionToken ? {
      Authorization: `Bearer ${session.user.sessionToken}`
    } : {})
  });

  // Load balance + KYC + saved banks
  useEffect(() => {
    let cancelled = false;
    // Wait for the NextAuth token - a tokenless call 400s and shows a 0 balance.
    if (!session?.user?.sessionToken) return;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
          headers: authHeaders()
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
    return () => {
      cancelled = true;
    };
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
  const activeBank = tab === 'saved' ? savedBanks[selectedBankIdx] : {
    bank_name: bank,
    account_number: accNum,
    account_name: accName
  };
  const validateAndReview = () => {
    setError('');
    if (!numericVc || numericVc < 1) {
      setError(tt("msg.enterHowManyVcYou", "Enter how many VC you want to withdraw."));
      return;
    }
    if (balance != null && numericVc > balance) {
      setError(tt("msg.insufficientBalance", "Insufficient balance."));
      return;
    }
    if (tab === 'saved') {
      if (!savedBanks.length) {
        setError(tt("msg.noSavedBankYetAdd", "No saved bank yet - add a new one."));
        return;
      }
    } else {
      if (!bank) {
        setError(tt("msg.selectABank", "Select a bank."));
        return;
      }
      if (accNum.length !== 10) {
        setError(tt("msg.enterAValidDigitAccount", "Enter a valid 10-digit account number."));
        return;
      }
      if (!accName.trim()) {
        setError(tt("msg.enterTheAccountNameExactly", "Enter the account name exactly as your bank has it."));
        return;
      }
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
      account_name: activeBank.account_name
    };
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/withdraw/initiate/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data?.status !== 'success') {
        setError(apiMessage(tt, data, "api.withdrawalRequestFailed", "Withdrawal request failed."));
        setSubmitting(false);
        return;
      }
      setReference(data.data?.reference || `WDR-${Date.now().toString().slice(-8)}`);

      // Save bank for future if requested + on a "new" submission
      if (tab === 'new' && savePref && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(SAVED_BANKS_KEY);
          const list = raw ? JSON.parse(raw) : [];
          const exists = list.some(b => b.account_number === accNum && b.bank_name === bank);
          if (!exists) {
            list.unshift({
              bank_name: bank,
              account_number: accNum,
              account_name: accName,
              is_default: list.length === 0
            });
            localStorage.setItem(SAVED_BANKS_KEY, JSON.stringify(list));
          }
        } catch {
          /* ignore */
        }
      }
      setStep(3);
    } catch (err) {
      console.error(err);
      setError(tt("msg.networkErrorPleaseTryAgain", "Network error. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  // KYC gate. Paired with the server's own check this made withdrawing
  // impossible rather than merely discouraged, for a requirement that has been
  // dropped.
  if (KYC_REQUIRED && kycVerified === false) {
    return <div className={styles.pageContainer}>
        <Header />
        <MobileHeader />
        <main className={styles.mainContainer}>
          <Sidebar />
          <div className={styles.rightPaneContainer}>
            <div className={styles.pageHeader}>
              <div className={styles.pageHeaderLeft}>
                <h1 className={styles.pageTitle}>{tt("ui.withdraw.bank.ee6a", "Withdraw to Bank")}</h1>
                <p className={styles.pageSubtitle}>{tt("ui.identity.verification.required.5395", "Identity verification required.")}</p>
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
              <h2 className={styles.successTitle}>{tt("ui.verify.identity.first.4504", "Verify your identity first")}</h2>
              <p className={styles.successSub}>
                {tt("ui.withdrawals.require.kyc.verification.73df", "Withdrawals require KYC verification. It takes about 24 hours and unlocks higher limits too.")}
              </p>
              <div className={styles.btnRow}>
                <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>{tt("ui.back.wallet.0358", "Back to wallet")}</Link>
                <Link href="/settings" className={`${styles.btn} ${styles.btnRed}`}>{tt("ui.verify.identity.c88b", "Verify identity")}</Link>
              </div>
            </div>
          </div>
        </main>
        <BottomMenu />
      </div>;
  }
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>{tt("ui.withdraw.bank.ee6a", "Withdraw to Bank")}</h1>
              <p className={styles.pageSubtitle}>{tt("ui.convert.vent.coins.ngn.e92d", "Convert VENT COINS to NGN and send to your bank.")}</p>
            </div>
          </div>

          <div className={styles.formCard}>
            <Stepper step={step} />

            {step === 1 && <>
                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>{tt("ui.balance.ec62", "Your balance")}</span>
                  <span className={styles.infoRowVal}>{formatNumber(balance ?? 0)} VC</span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.amount.vent.coins.a1db", "Amount (VENT COINS)")} <InfoTip id="withdrawAmount" /></span></label>
                  <div className={styles.inputPrefixWrap}>
                    <span className={styles.prefixTag}>VC</span>
                    <input type="number" placeholder="e.g. 100" min="1" max={balance ?? undefined} value={vc} onChange={e => {
                  setVc(e.target.value);
                  setError('');
                }} />
                  </div>
                </div>

                {numericVc > 0 && <div className={styles.summaryList}>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{tt("ui.ngn.value.fcb0", "NGN value")}</span>
                      <span className={styles.summaryVal}>₦{formatNumber(grossNgn)}</span>
                    </div>
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{tt("ui.withdrawal.fee.e039", "Withdrawal fee (2% + ₦50)")}</span>
                      <span className={`${styles.summaryVal} ${styles.summaryRed}`}>-₦{formatNumber(fee)}</span>
                    </div>
                    <div className={styles.summaryHr} />
                    <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{tt("ui.will.receive.4eef", "You will receive")}</span>
                      <span className={`${styles.summaryVal} ${styles.summaryGrn}`}>₦{formatNumber(netNgn)}</span>
                    </div>
                  </div>}

                <div className={styles.modalTabs}>
                  <button type="button" className={`${styles.modalTab} ${tab === 'saved' ? styles.modalTabActive : ''}`} onClick={() => setTab('saved')}>
                    {tt("ui.saved.bank.486d", "Saved Bank")}
                  </button>
                  <button type="button" className={`${styles.modalTab} ${tab === 'new' ? styles.modalTabActive : ''}`} onClick={() => setTab('new')}>
                    {tt("ui.new.bank.2327", "New Bank")}
                  </button>
                </div>

                {tab === 'saved' && (savedBanks.length > 0 ? <>
                      {savedBanks.map((b, idx) => <div key={`${b.bank_name}-${b.account_number}`} className={`${styles.bankRow} ${idx === selectedBankIdx ? styles.bankRowActive : ''}`} onClick={() => setSelectedBankIdx(idx)}>
                          <div>
                            <div className={styles.bankName}>
                              {b.bank_name} - ****{String(b.account_number).slice(-4)}
                            </div>
                            <div className={styles.bankHolder}>{b.account_name}</div>
                          </div>
                          {idx === selectedBankIdx && <span className={styles.bankDefault}>{tt("ui.selected.b0ec", "✓ Selected")}</span>}
                        </div>)}
                    </> : <p className={styles.txEmpty} style={{
              padding: '0.85rem 0'
            }}>
                      {tt("ui.no.saved.bank.accounts.ca46", "No saved bank accounts yet - switch to")} <strong style={{
                color: 'var(--primary-bg)'
              }}>{tt("ui.new.bank.2327", "New Bank")}</strong> {tt("ui.add.one.90a6", "to add one.")}
                    </p>)}

                {tab === 'new' && <>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.bank.name.3126", "Bank Name")} <InfoTip id="bankName" /></span></label>
                      <select className={styles.formInput} value={bank} onChange={e => setBank(e.target.value)} style={{
                  cursor: 'pointer'
                }}>
                        <option value="">{tt("ui.select.bank.f256", "Select bank…")}</option>
                        {NIGERIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.account.number.0bd6", "Account Number")} <InfoTip id="accountNumber" /></span></label>
                      <input type="text" className={styles.formInput} placeholder={tt("ui.digit.account.number.4683", "10-digit account number")} maxLength={10} value={accNum} onChange={e => setAccNum(e.target.value.replace(/\D/g, '').slice(0, 10))} inputMode="numeric" />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.account.name.db3b", "Account Name")} <InfoTip id="accountName" /></span></label>
                      <input type="text" className={styles.formInput} placeholder={tt("ui.exactly.as.bank.has.4cee", "Exactly as your bank has it")} value={accName} onChange={e => setAccName(e.target.value)} maxLength={100} />
                    </div>
                    <label className={styles.checkboxRow}>
                      <input type="checkbox" checked={savePref} onChange={e => setSavePref(e.target.checked)} />
                      {tt("ui.save.bank.future.withdrawals.e4ac", "Save this bank for future withdrawals")}
                    <InfoTip id="saveBank" /></label>
                  </>}

                <div className={`${styles.notice} ${styles.noticeWarn}`}>
                  {tt("ui.withdrawals.processed.within.business.16db", "Withdrawals are processed within 1-3 business days after admin approval.")}
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>{tt("ui.cancel.77df", "Cancel")}</Link>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={validateAndReview}>
                    {tt("ui.review.e29a", "Review")}
                  </button>
                </div>
              </>}

            {step === 2 && activeBank && <>
                <h2 style={{
              fontSize: '1rem',
              margin: '0 0 0.4rem'
            }}>{tt("ui.review.withdrawal.cab0", "Review withdrawal")}</h2>
                <p style={{
              fontSize: '0.82rem',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '1rem',
              fontFamily: 'Inter, sans-serif'
            }}>
                  {tt("ui.confirm.destination.bank.amount.1698", "Confirm the destination bank and amount before submitting for review.")}
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
                    <span className={styles.summaryKey}>{tt("ui.amount.43dc", "Amount")}</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRed}`}>-{formatNumber(numericVc)} VC</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.ngn.value.fcb0", "NGN value")}</span>
                    <span className={styles.summaryVal}>₦{formatNumber(grossNgn)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.withdrawal.fee.ebcf", "Withdrawal fee")}</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRed}`}>-₦{formatNumber(fee)}</span>
                  </div>
                  <div className={styles.summaryHr} />
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.net.payout.ba12", "Net payout")}</span>
                    <span className={`${styles.summaryVal} ${styles.summaryGrn}`}>₦{formatNumber(netNgn)}</span>
                  </div>
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(1)} disabled={submitting}>
                    {tt("ui.back.b52b", "Back")}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnGrn}`} onClick={handleSubmit} disabled={submitting}>
                    {submitting ? tx("Submitting…") : tx("Submit Request")}
                  </button>
                </div>
              </>}

            {step === 3 && <div className={styles.successCenter}>
                <div className={styles.warnIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h2 className={styles.successTitle}>{tt("ui.withdrawal.requested.4881", "Withdrawal Requested")}</h2>
                <p className={styles.successSub}>
                  {tt("ui.request.1204", "Your request for")} <strong style={{
                color: 'var(--primary-bg)'
              }}>{formatNumber(numericVc)} VC</strong> (₦{formatNumber(netNgn)} {tt("ui.net.now.f6e0", "net) is now")} <strong style={{
                color: 'rgba(251,198,75,0.95)'
              }}>{tt("ui.pending.admin.approval.b741", "pending admin approval")}</strong>.
                </p>

                <div className={styles.summaryList} style={{
              textAlign: 'left'
            }}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.reference.db1c", "Reference")}</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRef}`}>{reference}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.destination.d427", "Destination")}</span>
                    <span className={styles.summaryVal}>
                      {activeBank?.bank_name} ****{String(activeBank?.account_number || '').slice(-4)}
                    </span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.status.bae7", "Status")}</span>
                    <span className={styles.summaryVal} style={{
                  color: 'rgba(251,198,75,0.95)'
                }}>{tt("ui.pending.approval.25d1", "Pending approval")}</span>
                  </div>
                </div>

                <button type="button" className={`${styles.btn} ${styles.btnRed} ${styles.btnFull}`} onClick={() => router.push('/wallets')}>
                  {tt("ui.back.wallet.4f88", "Back to Wallet")}
                </button>
              </div>}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>;
};
export default WithdrawPage;