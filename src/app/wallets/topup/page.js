'use client';

import { apiMessage } from '@/lib/apiMessage';
import { usePayProviders, onlyOption, providerName } from '@/lib/payMethods';
import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import { formatNumber, ngnFromVc, vcFromNgn } from '@/components/wallet/walletHelpers';
import styles from '../wallets.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const QUICK_AMOUNTS_VC = [1000, 5000, 10000, 50000];
const STEPS = [{
  n: 1,
  lbl: 'Amount'
}, {
  n: 2,
  lbl: 'Pay'
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

const TopupPage = () => {
  const tx = useTx();
  const tt = useT();
  const router = useRouter();
  const {
    data: session
  } = useSession();
  const [step, setStep] = useState(1);
  const [vc, setVc] = useState('');
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');
  const [authorizationUrl, setAuthorizationUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Nothing is chosen until the server has said what exists (CEO, 29
  // September 2026: this started on Paystack, which production does not
  // offer, and Pay was refused for a choice nobody could see).
  const [paymentMethod, setPaymentMethod] = useState('');
  // Cards this person has already saved. Read from the server rather than from
  // a settings blob, because a saved card is an authorization Paystack holds.
  const [savedCards, setSavedCards] = useState([]);
  // The gateways that can take money now (Paystack, Flutterwave), from the
  // server, so a gateway without keys is never offered.
  const payProviders = usePayProviders();
  const providers = payProviders.providers;
  const [polling, setPolling] = useState(false);
  const [newBalance, setNewBalance] = useState(null);
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(session?.user?.sessionToken ? {
      Authorization: `Bearer ${session.user.sessionToken}`
    } : {})
  });
  useEffect(() => {
    const token = session?.user?.sessionToken;
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/cards/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const body = await res.json();
        if (!cancelled) setSavedCards(body?.data?.cards || []);
      } catch {
        // No cards read is the same as no cards saved: the page still offers
        // the ordinary Paystack path.
      }
    })();
    return () => { cancelled = true; };
  }, [session?.user?.sessionToken]);

  // A saved card is a Paystack authorization, so it is offered only while
  // Paystack is.
  const cardsOffered = providers.some(p => p.key === 'paystack') ? savedCards : [];
  const optionKeys = [...cardsOffered.map(c => `card:${c.id}`), ...providers.map(p => p.key)];
  const optionKeyList = optionKeys.join('|');
  useEffect(() => {
    if (payProviders.status !== 'ready') return;
    const keys = optionKeyList ? optionKeyList.split('|') : [];
    // The one option there is, chosen for them; a choice that no longer
    // exists, dropped.
    if (!keys.includes(paymentMethod)) setPaymentMethod(onlyOption(keys));
  }, [payProviders.status, optionKeyList, paymentMethod]);
  const chosenLabel = paymentMethod.startsWith('card:')
    ? tt('topup.chosenCard', 'your saved card')
    : (paymentMethod ? providerName(tt, paymentMethod) : '');
  const numericVc = Number(vc) || 0;
  const ngn = ngnFromVc(numericVc);
  const handleQuickPick = val => {
    setVc(String(val));
    setError('');
  };
  const goToReview = () => {
    if (!numericVc || numericVc < 1) {
      setError(tt("msg.enterTheAmountOfVent", "Enter the amount of VENT COINS you want to buy."));
      return;
    }
    if (numericVc < 1) {
      setError(tt("msg.minimumTopUpIsVc", "Minimum top-up is 1 VC (\u20a61,000)."));
      return;
    }
    setError('');
    setStep(2);
  };
  const handlePayNow = async () => {
    if (!paymentMethod) {
      setError(tt('pay.chooseFirst', 'Choose how to pay above first.'));
      return;
    }
    setSubmitting(true);
    setError('');

    // A saved card is charged where it stands: one request, no redirect, and
    // no second entry of a number the platform already holds an authorization
    // for. That endpoint has existed since cards were built and nothing called
    // it, so saving a card did nothing.
    if (paymentMethod.startsWith('card:')) {
      const cardId = paymentMethod.slice('card:'.length);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/cards/charge/`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({ card_id: cardId, amount_ngn: ngn }),
        });
        const data = await res.json();
        if (data?.status === 'success') {
          setNewBalance(data.data?.balance ?? null);
          setReference(data.data?.reference || '');
          setStep(3);
        } else {
          setError(apiMessage(tt, data, 'api.cardChargeFailed',
            'That card could not be charged. Nothing was taken.'));
        }
      } catch (err) {
        setError(tt('api.cardChargeNetwork',
          'The payment could not be reached. Nothing was taken.'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/topup/initiate/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          amount_ngn: ngn,
          vc: numericVc,
          provider: paymentMethod,
          // Where the gateway sends them back; that page verifies and credits.
          callback_url: `${window.location.origin}/wallet-topup-callback?redirect_to=/wallets`
        })
      });
      const data = await res.json();
      if (data?.status !== 'success') {
        setError(apiMessage(tt, data, "api.couldNotStartTheTop", "Could not start the top-up."));
        setSubmitting(false);
        return;
      }
      setReference(data.data?.reference || '');
      setAuthorizationUrl(data.data?.authorization_url || '');
      // To the gateway. This page used to wait a second and verify a payment
      // nobody had made, which failed it (29 September 2026, inbox 352).
      if (data.data?.authorization_url) {
        window.location.assign(data.data.authorization_url);
        return;
      }
      setPolling(true);
      setTimeout(async () => {
        try {
          const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/topup/verify/`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              reference: data.data?.reference
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData?.status === 'success') {
            setNewBalance(verifyData.data?.balance ?? null);
            setStep(3);
          } else {
            setError(apiMessage(tt, verifyData, "api.paymentVerificationFailed", "Payment verification failed."));
          }
        } catch (err) {
          setError(tt("msg.networkErrorDuringVerification", "Network error during verification."));
          console.error(err);
        } finally {
          setPolling(false);
          setSubmitting(false);
        }
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(tt("msg.networkErrorPleaseTryAgain", "Network error. Please try again."));
      setSubmitting(false);
    }
  };
  const handleDone = () => router.push('/wallets');
  return <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />

      <main className={styles.mainContainer}>
        <Sidebar />

        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <div className={styles.pageHeaderLeft}>
              <h1 className={styles.pageTitle}>{tt("ui.top.up.wallet.1875", "Top Up Wallet")}</h1>
              <p className={styles.pageSubtitle}>{tt("topup.subtitleNeutral", "Buy VENT COINS. Rate: ₦1,000 = 1 VC.")}</p>
            </div>
          </div>

          <div className={styles.formCard}>
            <Stepper step={step} />

            {step === 1 && <>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}><span className="fieldLabelRow">{tt("ui.amount.vent.coins.a1db", "Amount (VENT COINS)")} <InfoTip id="topUpAmount" /></span></label>
                  <div className={styles.inputPrefixWrap}>
                    <span className={styles.prefixTag}>VC</span>
                    <input type="number" placeholder="e.g. 5000" min="1" value={vc} onChange={e => {
                  setVc(e.target.value);
                  setError('');
                }} />
                  </div>
                  <div className={styles.quickAmountRow}>
                    {QUICK_AMOUNTS_VC.map(q => <button key={q} type="button" className={`${styles.quickChip} ${String(q) === vc ? styles.quickChipActive : ''}`} onClick={() => handleQuickPick(q)}>
                        {q.toLocaleString()} VC
                      </button>)}
                  </div>
                </div>

                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>{tt("ui.will.pay.acb1", "You will pay")}</span>
                  <span className={`${styles.infoRowVal} ${styles.infoNeutral}`}>
                    ₦{numericVc > 0 ? formatNumber(ngn) : '0'}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoRowLabel}>{tt("ui.receive.29cc", "You receive")}</span>
                  <span className={styles.infoRowVal}>
                    {numericVc > 0 ? formatNumber(numericVc) : '0'} VC
                  </span>
                </div>

                {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                <div className={styles.btnRow}>
                  <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>{tt("ui.cancel.77df", "Cancel")}</Link>
                  <button type="button" className={`${styles.btn} ${styles.btnRed}`} onClick={goToReview}>
                    {tt("ui.continue.2e02", "Continue")}
                  </button>
                </div>
              </>}

            {step === 2 && <>
                <h2 style={{
              fontSize: '1rem',
              margin: '0 0 0.4rem'
            }}>{tt("ui.choose.payment.method.7a13", "Choose payment method")}</h2>
                <p className={styles.methodPointer}>
                  {payProviders.status === 'loading'
                    ? tt('pay.methodsLoading', 'Finding the ways you can pay...')
                    : optionKeys.length > 1
                      ? tt('pay.pickOne', 'Pick one of the options below, then press Pay.')
                      : optionKeys.length === 1
                        ? tt('pay.onlyOne', '{name} is the way to pay right now, so it is already chosen for you.')
                          .replace('{name}', chosenLabel)
                        : null}
                </p>

                {payProviders.status === 'failed' && <div className={`${styles.notice} ${styles.noticeError}`}>
                    {tt('pay.methodsFailed', 'The ways to pay could not be loaded. Check your connection and try again.')}
                    {' '}
                    <button type="button" className={styles.linkBtn} onClick={payProviders.retry}>
                      {tt('ui.retry.9f5c', 'Retry')}
                    </button>
                  </div>}
                {payProviders.status === 'ready' && optionKeys.length === 0 && <div className={`${styles.notice} ${styles.noticeInfo}`}>
                    {tt('pay.noneAvailable', 'Online payment is not available right now. Please try again later.')}
                  </div>}

                {cardsOffered.map(card => {
              const key = `card:${card.id}`;
              const chosen = paymentMethod === key;
              return (
                <button type="button" key={card.id}
                  className={styles.bankRow + (chosen ? ' ' + styles.bankRowActive : '')}
                  onClick={() => setPaymentMethod(key)}>
                  <div>
                    <div className={styles.bankName}>
                      {tt('topup.savedCard', '{brand} ending {last4}')
                        .replace('{brand}', card.brand || 'Card')
                        .replace('{last4}', card.last4 || '')}
                    </div>
                    <div className={styles.bankHolder}>
                      {tt('topup.savedCardHint', 'Charged where it stands, with nothing to type')}
                    </div>
                  </div>
                  {chosen
                    ? <span className={styles.bankDefault}>{tt("ui.selected.b0ec", "✓ Selected")}</span>
                    : null}
                </button>
              );
            })}

                {providers.map(p => <button type="button" key={p.key}
                  className={styles.bankRow + (paymentMethod === p.key ? ' ' + styles.bankRowActive : '')}
                  aria-pressed={paymentMethod === p.key}
                  onClick={() => setPaymentMethod(p.key)}>
                  <div>
                    <div className={styles.bankName}>
                      {p.key === 'flutterwave' ? tt('pay.flutterwave', 'Flutterwave') : tt("ui.paystack.c851", "Paystack")}
                      {p.test_mode ? ` ${tt('pay.providerTestMode', '(test mode, no real money)')}` : ''}
                    </div>
                    <div className={styles.bankHolder}>
                      {p.key === 'flutterwave'
                        ? tt('pay.flutterwaveMethods', 'Card, bank transfer, USSD, mobile money and more')
                        : tt("ui.card.bank.transfer.ussd.334b", "Card • Bank Transfer • USSD")}
                    </div>
                  </div>
                  {paymentMethod === p.key
                    ? <span className={styles.bankDefault}>{tt("ui.selected.b0ec", "✓ Selected")}</span>
                    : null}
                </button>)}

                <div className={styles.summaryList}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.pay.2d77", "You pay")}</span>
                    <span className={styles.summaryVal}>₦{formatNumber(ngn)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.receive.29cc", "You receive")}</span>
                    <span className={`${styles.summaryVal} ${styles.summaryGrn}`}>{formatNumber(numericVc)} VC</span>
                  </div>
                  <div className={styles.summaryHr} />
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("pay.ventFee", "V-ENT fee")}</span>
                    <span className={styles.summaryVal}>₦0</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.total.b259", "Total")}</span>
                    <span className={styles.summaryVal}>₦{formatNumber(ngn)}</span>
                  </div>
                </div>

                {paymentMethod === 'flutterwave' && <p className={styles.methodPointer}>
                    {tt('pay.gatewayFee', 'V-ENT charges no fee. Flutterwave may add its own processing fee, which it shows you on its page before you pay.')}
                  </p>}

                <div className={`${styles.notice} ${styles.noticeInfo}`}>
                  {tt("ui.after.payment.wallet.will.ad96", "After payment your wallet will be credited within seconds. You can leave this page once redirected.")}
                </div>

                {polling && <div className={styles.processingState}>
                    <div className={styles.spinner} />
                    <p className={styles.processingTitle}>{tt("ui.processing.payment.da92", "Processing payment…")}</p>
                    <p className={styles.processingSub}>{tt("pay.verifying", "Checking the payment. Please do not close this page.")}</p>
                  </div>}

                {error && !polling && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

                {!polling && <div className={styles.btnRow}>
                    <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setStep(1)} disabled={submitting}>
                      {tt("ui.back.b52b", "Back")}
                    </button>
                    <button type="button" className={`${styles.btn} ${styles.btnGrn}`} onClick={handlePayNow}
                      disabled={submitting || !paymentMethod} aria-describedby="payHint">
                      {submitting
                        ? tx("Please wait…")
                        : paymentMethod
                          ? tt('topup.payWith', 'Pay ₦{amount} with {name}')
                            .replace('{amount}', formatNumber(ngn)).replace('{name}', chosenLabel)
                          : tt('pay.chooseToPay', 'Choose how to pay')}
                    </button>
                  </div>}
                {!polling && !paymentMethod && payProviders.status === 'ready' && optionKeys.length > 1 &&
                  <p id="payHint" className={styles.methodPointer}>
                    {tt('pay.chooseFirst', 'Choose how to pay above first.')}
                  </p>}
              </>}

            {step === 3 && <div className={styles.successCenter}>
                <div className={styles.successIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--v-ent-gold)" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className={styles.successTitle}>{tt("ui.top.up.successful.3de2", "Top-up Successful")}</h2>
                <p className={styles.successSub}>
                  <strong style={{
                color: 'var(--v-ent-gold)'
              }}>{formatNumber(numericVc)} {tt("ui.vent.coins.536d", "VENT COINS")}</strong> {tt("ui.have.been.added.wallet.8083", "have been added to your wallet.")}
                </p>

                <div className={styles.summaryList} style={{
              textAlign: 'left'
            }}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.paid.15d1", "You paid")}</span>
                    <span className={styles.summaryVal}>₦{formatNumber(ngn)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryKey}>{tt("ui.reference.db1c", "Reference")}</span>
                    <span className={`${styles.summaryVal} ${styles.summaryRef}`}>{reference || '-'}</span>
                  </div>
                  {newBalance != null && <div className={styles.summaryRow}>
                      <span className={styles.summaryKey}>{tt("ui.new.balance.193e", "New balance")}</span>
                      <span className={`${styles.summaryVal} ${styles.summaryGrn}`}>{formatNumber(newBalance)} VC</span>
                    </div>}
                </div>

                <button type="button" className={`${styles.btn} ${styles.btnRed} ${styles.btnFull}`} onClick={handleDone}>
                  {tt("ui.back.wallet.4f88", "Back to Wallet")}
                </button>
              </div>}
          </div>
        </div>
      </main>

      <BottomMenu />
    </div>;
};
export default TopupPage;