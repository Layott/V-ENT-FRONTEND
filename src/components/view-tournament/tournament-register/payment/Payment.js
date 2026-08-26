// ./src/components/view-tournament/tournament-register/payment/Payment.js
//
// Real-money registration step. Talks to the wallet + tournament register
// APIs via the shared tournamentApi helper (never re-implements fetch/token
// handling here). Flow, in order:
//   1. Load wallet balance + entry fee.
//   2. KYC gate - paid tournaments (prize_pool > 0) require kyc_verified.
//   3. Free tournaments (fee === 0) skip straight to registration, no PIN.
//   4. Insufficient balance → "Top up & pay" → Paystack → back here → verify
//      → resume at the PIN step.
//   5. Sufficient balance → inline 4-digit PIN → verify → register.
'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './payment.module.css';
import { API, entryFeeVc, tokenFrom, ventFetch } from '@/components/tournament-lib/tournamentApi';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';
const EMPTY_PIN = ['', '', '', ''];
const CoinIcon = ({
  size = 16
}) => <svg className={styles.coinIcon} width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#D4AF37" strokeWidth="2" fill="#D4AF37" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="white" strokeWidth="2" fill="none" />
    <line x1="12" y1="16" x2="12" y2="17.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>;
const PaymentModal = ({
  isOpen,
  onClose,
  onBack,
  onComplete,
  tournament,
  selectedTeam,
  teamMembers,
  registrationData,
  resumeReference
}) => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session
  } = useSession();
  const token = tokenFrom(session);
  const router = useRouter();
  const pathname = usePathname();

  // When this tournament runs inside an event with shared ticketing on and the
  // viewer holds a valid ticket, the server waives the entry fee - no debit and
  // no PIN. Treat it as a zero-cost registration here, but say why.
  const listedFee = entryFeeVc(tournament);
  const coveredByTicket = Boolean(tournament?.entry_covered_by_ticket) && listedFee > 0;
  const fee = coveredByTicket ? 0 : listedFee;
  const prizePool = Number(tournament?.prize_pool ?? tournament?.prize_pool_vc ?? 0) || 0;
  const mode = registrationData?.type === 'team' ? 'team' : 'individual';
  const team = selectedTeam || registrationData?.team || null;
  const roster = (teamMembers && teamMembers.length ? teamMembers : registrationData?.members) || [];
  const tournamentName = tournament?.tournament_title || tournament?.name || 'this tournament';

  // ── phase: 'loading' | 'verifying-topup' | 'kyc' | 'insufficient'
  //         | 'review' | 'pin' | 'blocked' | 'error'
  const [phase, setPhase] = useState('loading');
  const [loadingLabel, setLoadingLabel] = useState('Loading payment details…');
  const [wallet, setWallet] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [pin, setPin] = useState(EMPTY_PIN);
  const [pinError, setPinError] = useState('');
  const [pinVerifying, setPinVerifying] = useState(false);
  const [registering, setRegistering] = useState(false);
  // A tournament running at the same time as one they are already in.
  const [conflict, setConflict] = useState(null);
  const [overlapAcknowledged, setOverlapAcknowledged] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [topUpError, setTopUpError] = useState('');
  const [blockedMessage, setBlockedMessage] = useState('');
  const [resumeNotice, setResumeNotice] = useState('');
  const pinRefs = useRef([]);
  const autoRegisteredRef = useRef(false);
  const draftKey = tournament?.id ? `ventRegDraft:${tournament.id}` : null;
  const saveDraft = () => {
    if (!draftKey || typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(draftKey, JSON.stringify({
        type: mode,
        team,
        members: roster
      }));
    } catch {
      // Storage unavailable (private mode / quota) - non-fatal, worst case
      // the resumed flow falls back to an individual registration.
    }
  };
  const clearDraft = () => {
    if (!draftKey || typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(draftKey);
    } catch {/* ignore */}
  };

  // Drop the one-time `?reference=` param once we've consumed it, so a page
  // refresh doesn't re-trigger verification. Keeps `?id=` intact.
  const stripReferenceFromUrl = () => {
    if (!tournament?.id) return;
    try {
      router.replace(`${pathname}`);
    } catch {/* ignore */}
  };
  const doRegister = async pinValue => {
    setRegistering(true);
    setBlockedMessage('');
    try {
      const body = {
        tournament_id: tournament?.id,
        mode
      };
      if (pinValue) body.pin = pinValue;
      // Set once the person has seen which tournament this clashes with and
      // said to go ahead anyway.
      if (overlapAcknowledged) body.acknowledge_overlap = true;
      if (mode === 'team') {
        body.team_id = team?.id ?? null;
        body.roster = roster;
      }
      const data = await ventFetch(API.TOURNAMENT.REGISTER, {
        method: 'POST',
        token,
        body
      });
      clearDraft();
      if (onComplete) {
        onComplete({
          paymentMethod: coveredByTicket ? 'event_ticket' : fee === 0 ? 'free' : 'wallet',
          amount: fee,
          coveredByTicket,
          eventName: tournament?.event?.name || null,
          registrationId: data?.id,
          mode
        });
      }
    } catch (err) {
      if (err?.code === 'SCHEDULE_CONFLICT') {
        // Not a refusal - a warning. Show what it collides with and let them
        // decide, because plenty of people genuinely intend to play two things
        // in one evening.
        setConflict(err?.data?.conflict || err?.conflict || null);
        setPhase('conflict');
      } else if (err?.code === 'INSUFFICIENT_BALANCE') {
        setPhase('insufficient');
      } else if (err?.code === 'KYC_REQUIRED') {
        setPhase('kyc');
      } else if (err?.code === 'ALREADY_REGISTERED' || err?.code === 'DEADLINE_PASSED') {
        setBlockedMessage(err?.message || tt("api.thisRegistrationCanNoLonger", "This registration can no longer be completed."));
        setPhase('blocked');
      } else {
        setBlockedMessage(err?.message || tt("api.registrationFailedPleaseTryAgain", "Registration failed. Please try again."));
        if (fee === 0) {
          setPhase('blocked');
        } else {
          setPinError(err?.message || tt("api.registrationFailedPleaseTryAgain", "Registration failed. Please try again."));
          setPin(EMPTY_PIN);
          setPhase('pin');
          pinRefs.current[0]?.focus();
        }
      }
    } finally {
      setRegistering(false);
    }
  };
  const gateAndProceed = async (w, {
    afterTopup = false
  } = {}) => {
    if (prizePool > 0 && w.kyc_verified === false) {
      setPhase('kyc');
      return;
    }
    if (fee === 0) {
      if (autoRegisteredRef.current) return;
      autoRegisteredRef.current = true;
      setLoadingLabel(coveredByTicket ? `Your ${tournament?.event?.name || 'event'} ticket covers entry. Registering you for ${tournamentName}…` : `Registering you for ${tournamentName}…`);
      setPhase('loading');
      await doRegister(null);
      return;
    }
    if (w.balance < fee) {
      setPhase('insufficient');
      return;
    }
    setPhase(afterTopup ? 'pin' : 'review');
  };
  const loadWallet = async ({
    afterTopup = false
  } = {}) => {
    setLoadError('');
    setPhase('loading');
    setLoadingLabel('Loading payment details…');
    try {
      const data = await ventFetch(API.WALLET.BALANCE, {
        token
      });
      const w = {
        balance: Number(data?.balance ?? 0) || 0,
        kyc_verified: data?.kyc_verified !== false
      };
      setWallet(w);
      await gateAndProceed(w, {
        afterTopup
      });
    } catch (err) {
      setLoadError(err?.message || tt("api.couldNotLoadWalletBalance", "Could not load wallet balance."));
      setPhase('error');
    }
  };

  // Fires once each time the modal opens. Depends only on isOpen/token -
  // NOT on resumeReference - because we strip `?reference=` from the URL as
  // soon as we've consumed it, and re-running this effect on that change
  // would re-fetch the balance and clobber the 'pin' phase we just resumed
  // into. The closure still reads whatever resumeReference was current when
  // isOpen flipped true, which is exactly what we want.
  useEffect(() => {
    if (!isOpen) {
      autoRegisteredRef.current = false;
      return undefined;
    }
    let cancelled = false;
    (async () => {
      if (resumeReference) {
        setPhase('verifying-topup');
        setLoadError('');
        try {
          await ventFetch(API.WALLET.TOPUP_VERIFY, {
            method: 'POST',
            token,
            body: {
              reference: resumeReference
            }
          });
          if (cancelled) return;
          setResumeNotice('Top-up verified - continue to pay.');
          stripReferenceFromUrl();
          await loadWallet({
            afterTopup: true
          });
        } catch (err) {
          if (cancelled) return;
          setTopUpError(err?.message || tt("api.couldNotVerifyYourTop", "Could not verify your top-up. Please try again."));
          stripReferenceFromUrl();
          setPhase('insufficient');
        }
        return;
      }
      await loadWallet({});
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, token]);
  const handlePinDigit = (idx, raw) => {
    const digit = raw.replace(/[^0-9]/g, '').slice(-1);
    setPin(prev => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
    setPinError('');
    if (digit && idx < 3) pinRefs.current[idx + 1]?.focus();
  };
  const handlePinKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !pin[idx] && idx > 0) {
      pinRefs.current[idx - 1]?.focus();
    }
  };
  const handlePinConfirm = async () => {
    const code = pin.join('');
    if (code.length !== 4) {
      setPinError('Enter all 4 digits.');
      return;
    }
    setPinVerifying(true);
    setPinError('');
    try {
      await ventFetch(API.WALLET.PIN_VERIFY, {
        method: 'POST',
        token,
        body: {
          pin: code
        }
      });
      await doRegister(code);
    } catch (err) {
      if (err?.code === 'WRONG_PIN' || err?.status === 403) {
        setPinError('Incorrect PIN');
      } else {
        setPinError(err?.message || tt("api.couldNotVerifyPinPlease", "Could not verify PIN. Please try again."));
      }
      setPin(EMPTY_PIN);
      pinRefs.current[0]?.focus();
    } finally {
      setPinVerifying(false);
    }
  };
  const handleTopUp = async () => {
    setToppingUp(true);
    setTopUpError('');
    try {
      const shortfall = Math.max(fee - (wallet?.balance || 0), 0);
      const amountNgn = Math.max(1000, Math.ceil(shortfall) * 1000);
      saveDraft();
      const data = await ventFetch(API.WALLET.TOPUP_INITIATE, {
        method: 'POST',
        token,
        body: {
          amount_ngn: amountNgn
        }
      });
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }
      setTopUpError('Could not start top-up. Please try again.');
      setToppingUp(false);
    } catch (err) {
      setTopUpError(err?.message || tt("api.couldNotStartTopUp", "Could not start top-up. Please try again."));
      setToppingUp(false);
    }
  };
  const handleBack = () => {
    if (phase === 'pin') {
      setPinError('');
      setPin(EMPTY_PIN);
      setPhase('review');
      return;
    }
    if (onBack) onBack();
  };
  const handleClose = () => {
    if (onClose) onClose();
  };
  if (!isOpen) return null;
  const TITLES = {
    loading: 'Payment',
    'verifying-topup': 'Verifying Top-Up',
    kyc: 'Identity Verification Required',
    insufficient: 'Insufficient Balance',
    review: 'Confirm Payment',
    pin: 'Enter Wallet PIN',
    blocked: 'Registration Unavailable',
    error: 'Something Went Wrong',
    conflict: 'Two at the same time'
  };
  const backDisabled = phase === 'loading' || phase === 'verifying-topup';
  const renderEntryFeeSection = () => <div className={styles.entryFeeSection}>
      <div className={styles.entryFeeHeader}>
        <svg className={styles.entryFeeIcon} width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="6" width="20" height="12" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
          <line x1="2" y1="10" x2="22" y2="10" stroke="currentColor" strokeWidth="2" />
        </svg>
        <span className={styles.entryFeeLabel}>{tt("ui.entry.fee.a428", "Entry Fee")}</span>
      </div>
      <div className={styles.entryFeeDetails}>
        <span className={styles.entryFeeAmount}>
          {fee > 0 ? <>
              <CoinIcon />
              <span style={{
            color: 'var(--v-ent-gold)'
          }}>{fee.toLocaleString()} VC</span>
            </> : 'FREE'}
        </span>
      </div>
    </div>;
  let body = null;
  let footerPrimary = null;
  if (phase === 'loading' || phase === 'verifying-topup') {
    body = <div className={styles.loadingState}>
        <div className={styles.spinner} />
        <p className={styles.subtitle} style={{
        margin: 0
      }}>
          {phase === 'verifying-topup' ? tx("Verifying your top-up…") : loadingLabel}
        </p>
      </div>;
  } else if (phase === 'error') {
    body = <div className={styles.loadingState}>
        <div className={styles.paymentError}>{loadError}</div>
      </div>;
    footerPrimary = <button className={styles.payButton} onClick={() => loadWallet({})}>{tt("ui.retry.9f5c", "Retry")}</button>;
  } else if (phase === 'kyc') {
    body = <div className={styles.kycBox}>
        <svg className={styles.kycIcon} width="40" height="40" viewBox="0 0 24 24" fill="none">
          <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" stroke="currentColor" strokeWidth="2" />
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h3 className={styles.kycTitle}>{tt("ui.complete.kyc.register.paid.4b12", "Complete KYC to register for paid tournaments")}</h3>
        <p className={styles.kycText}>
          {tournamentName} {tt("ui.has.prize.pool.so.ee8c", "has a prize pool, so we need to verify your identity before you can pay the entry fee and register.")}
        </p>
      </div>;
    footerPrimary = <Link href="/wallets?panel=kyc" className={styles.payButton}>{tt("ui.complete.kyc.4487", "Complete KYC →")}</Link>;
  } else if (phase === 'insufficient') {
    body = <>
        {renderEntryFeeSection()}
        <div className={`${styles.walletSummaryCard} ${styles.insufficient}`}>
          <div className={styles.walletSummaryLeft}>
            <span className={styles.paymentMethodTitle}>{tt("ui.wallet.balance.3b5c", "Wallet Balance")}</span>
            <div className={styles.walletBalance}>
              <CoinIcon />
              <span style={{
              color: 'var(--v-ent-gold)'
            }}>{(wallet?.balance ?? 0).toLocaleString()} VC</span>
            </div>
            <div className={styles.insufficientFunds}>
              {tt("ui.insufficient.funds.need.8556", "Insufficient funds - you need")} {Math.max(fee - (wallet?.balance || 0), 0).toLocaleString()} {tt("ui.more.vc.78f5", "more VC")}
            </div>
          </div>
        </div>
        {topUpError && <div className={styles.paymentError}>{topUpError}</div>}
      </>;
    footerPrimary = <button className={styles.payButton} onClick={handleTopUp} disabled={toppingUp}>
        {toppingUp ? tx("Redirecting…") : `Top up & pay ${fee.toLocaleString()} VC`}
      </button>;
  } else if (phase === 'review') {
    body = <>
        {renderEntryFeeSection()}
        <div className={styles.walletSummaryCard}>
          <div className={styles.walletSummaryLeft}>
            <span className={styles.paymentMethodTitle}>{tt("ui.wallet.balance.3b5c", "Wallet Balance")}</span>
            <div className={styles.walletBalance}>
              <CoinIcon />
              <span style={{
              color: 'var(--v-ent-gold)'
            }}>{(wallet?.balance ?? 0).toLocaleString()} VC</span>
            </div>
          </div>
        </div>
      </>;
    footerPrimary = <button className={styles.payButton} onClick={() => setPhase('pin')}>
        {`Pay ${fee.toLocaleString()} VC`}
      </button>;
  } else if (phase === 'pin') {
    const code = pin.join('');
    const confirmDisabled = code.length !== 4 || pinVerifying || registering;
    body = <>
        {resumeNotice && <div className={styles.resumeBanner}>{resumeNotice}</div>}
        <p className={styles.subtitle}>
          {tt("ui.enter.digit.wallet.pin.2ead", "Enter your 4-digit wallet PIN to authorize")} {fee.toLocaleString()} {tt("ui.vc.4ea1", "VC for")} {tournamentName}.
        </p>
        <div className={styles.pinRow}>
          {pin.map((digit, idx) => <input
        // eslint-disable-next-line react/no-array-index-key
        key={idx} ref={el => {
          pinRefs.current[idx] = el;
        }} type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={1} value={digit} onChange={e => handlePinDigit(idx, e.target.value)} onKeyDown={e => handlePinKeyDown(idx, e)} className={`${styles.pinDigit} ${pinError ? styles.pinDigitError : ''}`} aria-label={`PIN digit ${idx + 1}`} disabled={pinVerifying || registering} />)}
        </div>
        {pinError && <div className={styles.paymentError}>{pinError}</div>}
      </>;
    footerPrimary = <button className={`${styles.payButton} ${confirmDisabled ? styles.disabled : ''}`} onClick={handlePinConfirm} disabled={confirmDisabled}>
        {pinVerifying ? tx("Verifying PIN…") : registering ? tx("Registering…") : tx("Confirm & Register")}
      </button>;
  } else if (phase === 'blocked') {
    body = <div className={styles.kycBox}>
        <div className={styles.paymentError} style={{
        marginBottom: 0
      }}>{blockedMessage}</div>
      </div>;
  } else if (phase === 'conflict') {
    footerPrimary = <button className={`${styles.confirmButton} goldBTN`} onClick={() => {
      setOverlapAcknowledged(true);
      setPhase(fee === 0 ? 'review' : 'pin');
    }}>
        {tt("ui.register.anyway.748d", "Register anyway")}
      </button>;
    // The clash, named, with both options. Plenty of people intend to play two
    // things in one evening; the point is that nobody does it by accident.
    body = <div className={styles.kycBox}>
        <p className={styles.subtitle} style={{
        marginBottom: 12
      }}>
          {tt("ui.this.runs.at.same.4af5", "This runs at the same time as")}{' '}
          <strong>{conflict?.title || tx("another tournament")}</strong>
          {conflict?.starts_at ? `, which starts ${new Date(conflict.starts_at).toLocaleString()}` : ''}
          {tt("ui.are.already.registered.it.03e6", ", and you are already registered for it.")}
        </p>
        <p className={styles.subtitle} style={{
        marginBottom: 0
      }}>
          {tt("ui.can.register.both.but.2cfc", "You can register for both, but you will have to choose between them on the day.")}
        </p>
      </div>;
  }
  return <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <button className={styles.backButton} onClick={handleBack} disabled={backDisabled}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M19 12H5m7-7l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2 className={styles.modalTitle}>{TITLES[phase]}</h2>
          </div>
          <button className={styles.closeButton} onClick={handleClose}>×</button>
        </div>

        <div className={styles.modalBody}>
          {(phase === 'review' || phase === 'insufficient') && <p className={styles.subtitle}>{tt("ui.entry.fee.paid.from.e3c6", "Entry fee is paid from your V-ENT wallet (VENT COINS).")}</p>}
          {body}
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={handleClose}>
            {phase === 'blocked' ? 'Close' : 'Cancel'}
          </button>
          {footerPrimary}
        </div>
      </div>
    </div>;
};
export default PaymentModal;