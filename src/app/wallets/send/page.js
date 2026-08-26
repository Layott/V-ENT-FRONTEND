'use client';

import { apiMessage } from '@/lib/apiMessage';
import { mediaUrl } from '@/lib/mediaUrl';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import { formatNumber, ngnFromVc } from '@/components/wallet/walletHelpers';
import styles from '../wallets.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const STEPS = [{
  n: 1,
  lbl: 'Recipient'
}, {
  n: 2,
  lbl: 'Amount'
}, {
  n: 3,
  lbl: 'Review'
}, {
  n: 4,
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

const SendPage = () => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const {
    data: session
  } = useSession();
  const [step, setStep] = useState(1);
  const [balance, setBalance] = useState(null);
  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState(null);
  const [recipientError, setRecipientError] = useState('');
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState('');
  const [newBalance, setNewBalance] = useState(null);
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken ? {
      Authorization: `Bearer ${session.user.sessionToken}`
    } : {})
  });

  // Load balance + own username (used for self-send guard)
  useEffect(() => {
    let cancelled = false;
    // Wait for the NextAuth token - firing tokenless returns 400 and paints a
    // zero balance on first load.
    if (!session?.user?.sessionToken) return;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (!cancelled && data?.status === 'success') {
          setBalance(Number(data.data?.balance ?? 0));
        }
      } catch (err) {
        console.error('Balance fetch error:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.sessionToken]);

  // Debounced lookup against the real account. This used to synthesize a
  // plausible-looking recipient in the browser, so the confirmation card could
  // show a person who does not exist.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setRecipient(null);
      setRecipientError('');
      return undefined;
    }
    const token = session?.user?.sessionToken;
    if (!token) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setRecipientLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/user/lookup/?q=${encodeURIComponent(q)}`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          signal: controller.signal
        });
        const data = await res.json();
        if (data.status === 'success') {
          setRecipientError('');
          setRecipient(data.data.user);
        } else {
          setRecipient(null);
          setRecipientError(apiMessage(tt, data, "api.noUserFoundWithThat", "No user found with that username."));
        }
      } catch (err) {
        if (err?.name !== 'AbortError') {
          setRecipient(null);
          setRecipientError('Could not check that username. Try again.');
        }
      } finally {
        setRecipientLoading(false);
      }
    }, 320);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, session?.user?.sessionToken]);
  const numericAmount = Number(amount) || 0;
  const balanceAfter = (balance ?? 0) - numericAmount;
  const canContinueAmount = numericAmount > 0 && balance != null && numericAmount <= balance;
  const goReview = () => {
    if (!recipient) {
      setError(tt("msg.pickAValidRecipientFirst", "Pick a valid recipient first."));
      return;
    }
    if (!numericAmount || numericAmount < 1) {
      setError(tt("msg.enterHowMuchYouWant", "Enter how much you want to send."));
      return;
    }
    if (balance != null && numericAmount > balance) {
      setError(tt("msg.insufficientBalance", "Insufficient balance."));
      return;
    }
    setError('');
    setStep(3);
  };
  const handleSend = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/send/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          recipient_username: recipient.username,
          amount: numericAmount,
          note: memo
        })
      });
      const data = await res.json();
      if (data?.status !== 'success') {
        setError(apiMessage(tt, data, "api.transferFailed", "Transfer failed."));
        setSubmitting(false);
        return;
      }
      setNewBalance(Number(data.data?.new_balance ?? balance - numericAmount));
      setReference(data.data?.transaction_id || data.data?.reference || `TXN-${Date.now().toString().slice(-8)}`);
      setStep(4);
    } catch (err) {
      console.error(err);
      setError(tt("msg.networkErrorPleaseTryAgain", "Network error. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };
  const initials = (recipient?.full_name || recipient?.username || '').split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?';
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>{tt("ui.send.vent.coins.6a21", "Send VENT COINS")}</h1>
              <p className={styles.pageSubtitle}>{tt("ui.transfer.coins.instantly.another.01bd", "Transfer coins instantly to another V-ENT user.")}</p>
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
                  <label className={styles.formLabel}>{tt("ui.recipient.username.email.9e0a", "Recipient (username or email)")}<InfoTip id="sendRecipient" /></label>
                  <input type="text" className={styles.formInput} placeholder={tt("ui.username.user.email.com.26ca", "@username or user@email.com")} value={query} onChange={e => setQuery(e.target.value)} autoFocus />
                </div>

                {recipient && <div className={styles.recipientCard}>
                    <div className={styles.recipientAvatar}>
                      {recipient.avatar ? <Image src={mediaUrl(recipient.avatar)} width={40} height={40} alt={recipient.full_name} unoptimized /> : initials}
                    </div>
                    <div className={styles.recipientInfo}>
                      <p className={styles.recipientName}>{recipient.full_name}</p>
                      <p className={styles.recipientHandle}>@{recipient.username}</p>
                    </div>
                    <span className={`${styles.recipientStatus} ${styles.recipientFound}`}>
                      {tt("ui.found.d7a7", "✓ Found")}
                    </span>
                  </div>}

                {recipientLoading && !recipient && <p className={styles.pageSubtitle}>{tt("ui.checking.username.2eef", "Checking that username...")}</p>}

                {recipientError && !recipientLoading && <div className={`${styles.notice} ${styles.noticeError}`}>{recipientError}</div>}

                <div className={styles.btnRow}>
                  <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>{tt("ui.cancel.77df", "Cancel")}</Link>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={() => recipient && setStep(2)} disabled={!recipient}>
                    {tt("ui.continue.2e02", "Continue")}
                  </button>
                </div>
              </>}

            {step === 2 && recipient && <>
                <div className={styles.recipientCard}>
                  <div className={styles.recipientAvatar}>
                    {recipient.avatar ? <Image src={mediaUrl(recipient.avatar)} width={40} height={40} alt={recipient.full_name} unoptimized /> : initials}
                  </div>
                  <div className={styles.recipientInfo}>
                    <p className={styles.recipientName}>{recipient.full_name}</p>
                    <p className={styles.recipientHandle}>@{recipient.username}</p>
                  </div>
                  <button type="button" className={styles.btnGhost} style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '0.78rem',
                cursor: 'pointer'
              }} onClick={() => setStep(1)}>
                    {tt("ui.change.64fb", "Change")}
                  </button>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>{tt("ui.amount.vent.coins.a1db", "Amount (VENT COINS)")}<InfoTip id="ventCoins" /></label>
                  <div className={styles.inputPrefixWrap}>
                    <span className={styles.prefixTag}>VC</span>
                    <input type="number" placeholder="e.g. 50" min="1" max={balance ?? undefined} value={amount} onChange={e => {
                  setAmount(e.target.value);
                  setError('');
                }} autoFocus />
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>{tt("ui.balance.after.50e7", "Balance after")}</span>
                  <span className={`${styles.infoRowVal} ${balanceAfter < 0 ? styles.infoRed : styles.infoNeutral}`}>
                    {numericAmount > 0 ? `${formatNumber(balanceAfter)} VC` : `${formatNumber(balance ?? 0)} VC`}
                  </span>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>{tt("ui.memo.optional.40c6", "Memo (optional)")}<InfoTip id="sendMemo" /></label>
                  <input type="text" className={styles.formInput} placeholder={tt("ui.e.g.team.contribution.6070", "e.g. team contribution")} value={memo} onChange={e => setMemo(e.target.value)} maxLength={120} />
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(1)}>
                    {tt("ui.back.b52b", "Back")}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={goReview} disabled={!canContinueAmount}>
                    {tt("ui.review.e29a", "Review")}
                  </button>
                </div>
              </>}

            {step === 3 && recipient && <>
                <h2 style={{
              fontSize: '1rem',
              margin: '0 0 0.4rem'
            }}>{tt("ui.review.transfer.77cc", "Review your transfer")}</h2>
                <p style={{
              fontSize: '0.82rem',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '1rem',
              fontFamily: 'Inter, sans-serif'
            }}>
                  {tt("ui.double.check.recipient.amount.e347", "Double-check the recipient and amount. This action cannot be undone.")}
                </p>

                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.text.ae79", "To")}</span>
                    <span className={styles.summaryVal}>{recipient.full_name} (@{recipient.username})</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.amount.43dc", "Amount")}</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRed}`}>-{formatNumber(numericAmount)} VC</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.ngn.value.bb32", "≈ NGN value")}</span>
                    <span className={styles.summaryVal}>₦{formatNumber(ngnFromVc(numericAmount))}</span>
                  </div>
                  {memo && <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{tt("ui.memo.1fd7", "Memo")}</span>
                      <span className={styles.summaryVal}>{memo}</span>
                    </div>}
                  <div className={styles.summaryHr} />
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.balance.after.50e7", "Balance after")}</span>
                    <span className={styles.summaryVal}>{formatNumber((balance ?? 0) - numericAmount)} VC</span>
                  </div>
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(2)} disabled={submitting}>
                    {tt("ui.back.b52b", "Back")}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnGrn}`} onClick={handleSend} disabled={submitting}>
                    {submitting ? tx("Sending…") : `Send ${formatNumber(numericAmount)} VC`}
                  </button>
                </div>
              </>}

            {step === 4 && recipient && <div className={styles.successCenter}>
                <div className={styles.successIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--v-ent-gold)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className={styles.successTitle}>{tt("ui.transfer.successful.9bd2", "Transfer Successful")}</h2>
                <p className={styles.successSub}>
                  <strong style={{
                color: 'var(--v-ent-gold)'
              }}>{formatNumber(numericAmount)} VC</strong> {tt("ui.sent.0a7e", "sent to")} <strong style={{
                color: 'var(--primary-bg)'
              }}>@{recipient.username}</strong>.
                </p>

                <div className={styles.summaryList} style={{
              textAlign: 'left'
            }}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.reference.db1c", "Reference")}</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRef}`}>{reference}</span>
                  </div>
                  {newBalance != null && <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{tt("ui.new.balance.193e", "New balance")}</span>
                      <span className={`${styles.summaryVal} ${styles.summaryGrn}`}>{formatNumber(newBalance)} VC</span>
                    </div>}
                </div>

                <div className={styles.btnRow}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => {
                setStep(1);
                setQuery('');
                setRecipient(null);
                setAmount('');
                setMemo('');
                setReference('');
              }}>
                    {tt("ui.send.another.00e1", "Send another")}
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={() => router.push('/wallets')}>
                    {tt("ui.done.e9b4", "Done")}
                  </button>
                </div>
              </div>}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>;
};
export default SendPage;