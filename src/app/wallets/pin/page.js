'use client';

import InfoTip from '@/components/info-tip/InfoTip';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import styles from '../wallets.module.css';
import pinStyles from './pin.module.css';
import { useT } from '@/i18n/LanguageProvider';
import { useTx } from '@/i18n/LanguageProvider';

// Keep only digits, cap at 4.
const clean4 = val => val.replace(/\D/g, '').slice(0, 4);
const PinPage = () => {
  const tx = useTx();
  const tt = useT();
  const {
    data: session,
    status
  } = useSession();
  const token = session?.user?.sessionToken;
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState(null); // null until balance loads

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const authHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? {
      Authorization: `Bearer ${token}`
    } : {})
  });

  // Load balance → has_pin (only once the token exists).
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/balance/`, {
          headers: authHeaders()
        });
        const data = await res.json();
        if (!cancelled && data?.status === 'success') {
          setHasPin(Boolean(data.data?.has_pin));
        } else if (!cancelled) {
          setError(data?.message || tt("api.couldNotLoadYourWallet", "Could not load your wallet."));
        }
      } catch (err) {
        console.error('Balance fetch error:', err);
        if (!cancelled) setError(tt("msg.networkErrorWhileLoadingYour", "Network error while loading your wallet."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
  const inputType = showPin ? 'text' : 'password';
  const changing = hasPin === true;
  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    // Client validation before hitting the backend.
    if (changing && currentPin.length !== 4) {
      setError(tt("msg.enterYourCurrentDigitPin", "Enter your current 4-digit PIN."));
      return;
    }
    if (newPin.length !== 4) {
      setError(tt("msg.pinMustBeExactlyDigits", "PIN must be exactly 4 digits."));
      return;
    }
    if (confirmPin.length !== 4 || newPin !== confirmPin) {
      setError(tt("msg.newPinAndConfirmationDo", "New PIN and confirmation do not match."));
      return;
    }
    if (changing && currentPin === newPin) {
      setError(tt("msg.yourNewPinMustBe", "Your new PIN must be different from your current PIN."));
      return;
    }
    setSubmitting(true);
    const payload = changing ? {
      new_pin: newPin,
      current_pin: currentPin
    } : {
      new_pin: newPin
    };
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/pin/set/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data?.status !== 'success') {
        setError(data?.message || tt("api.couldNotUpdateYourWallet", "Could not update your wallet PIN."));
        setSubmitting(false);
        return;
      }
      // Success → clear fields and flip to change-mode.
      setSuccess('Wallet PIN updated.');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setHasPin(true);
    } catch (err) {
      console.error('PIN update error:', err);
      setError(tt("msg.networkErrorPleaseTryAgain", "Network error. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  // Decide what renders inside the right pane.
  let content;
  if (status === 'loading' || !token && status !== 'unauthenticated' || loading && hasPin === null && !error) {
    // Loading / token-not-ready state.
    content = <div className={styles.formCard}>
        <div className={styles.processingState}>
          <div className={styles.spinner} />
          <p className={styles.processingTitle}>{tt("ui.loading.wallet.8518", "Loading wallet…")}</p>
          <p className={styles.processingSub}>{tt("ui.checking.pin.status.40ca", "Checking your PIN status.")}</p>
        </div>
      </div>;
  } else if (!token && status === 'unauthenticated') {
    // Signed-out fallback.
    content = <div className={styles.formCard}>
        <div className={styles.successCenter}>
          <h3 className={styles.successTitle}>{tt("ui.sign.required.934d", "Sign in required")}</h3>
          <p className={styles.successSub}>
            {tt("ui.log.set.change.wallet.d33d", "Log in to set or change your wallet PIN.")}
          </p>
          <Link href="/login" className={`${styles.btn} ${styles.btnRed} ${styles.btnFull}`}>
            {tt("ui.go.login.376d", "Go to login")}
          </Link>
        </div>
      </div>;
  } else {
    // Set / change PIN form.
    content = <div className={styles.formCard}>
        <div className={styles.formCardHeader}>
          <h2 className={styles.formCardTitle}>
            {changing ? tx("Change wallet PIN") : tx("Set your wallet PIN")}
          </h2>
          <p className={styles.formCardSub}>
            {changing ? tx("Enter your current PIN, then choose a new 4-digit PIN.") : tx("Choose a 4-digit PIN. You will use it to authorise sends and withdrawals.")}
          </p>
        </div>

        {changing && <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="currentPin">{tt("ui.current.pin.91fe", "Current PIN")}<InfoTip id="currentPin" /></label>
            <input id="currentPin" className={`${styles.formInput} ${pinStyles.pinField}`} type={inputType} inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={currentPin} onChange={e => {
          setCurrentPin(clean4(e.target.value));
          setError('');
          setSuccess('');
        }} />
          </div>}

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="newPin">{tt("ui.new.pin.bd54", "New PIN")}<InfoTip id="walletPin" /></label>
          <input id="newPin" className={`${styles.formInput} ${pinStyles.pinField}`} type={inputType} inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={newPin} onChange={e => {
          setNewPin(clean4(e.target.value));
          setError('');
          setSuccess('');
        }} />
          <p className={pinStyles.helperText}>
            {tt("ui.use.digits.you'll.remember.ede1", "Use 4 digits you'll remember. Avoid 1234 or your birth year.")}
          </p>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="confirmPin">{tt("ui.confirm.pin.96b3", "Confirm PIN")}<InfoTip id="confirmPin" /></label>
          <input id="confirmPin" className={`${styles.formInput} ${pinStyles.pinField}`} type={inputType} inputMode="numeric" autoComplete="off" maxLength={4} placeholder="••••" value={confirmPin} onChange={e => {
          setConfirmPin(clean4(e.target.value));
          setError('');
          setSuccess('');
        }} />
        </div>

        <label className={styles.checkboxRow}>
          <input type="checkbox" checked={showPin} onChange={e => setShowPin(e.target.checked)} />
          {tt("ui.show.pin.6ffb", "Show PIN")}
        <InfoTip id="showPin" /></label>

        <div className={`${styles.notice} ${styles.noticeInfo}`}>
          {tt("ui.pin.protects.wallet.spends.84a2", "Your PIN protects wallet spends. Never share it - V-ENT staff will never ask for it.")}
        </div>

        {success && <div className={`${styles.notice} ${pinStyles.noticeSuccess}`}>{success}</div>}
        {error && <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div>}

        <div className={styles.btnRow}>
          <Link href="/wallets" className={`${styles.btn} ${styles.btnGhost}`}>
            {tt("ui.cancel.77df", "Cancel")}
          </Link>
          <button type="button" className={`${styles.btn} ${styles.btnGrn}`} onClick={handleSubmit} disabled={submitting}>
            {submitting ? tx("Saving…") : changing ? tx("Update PIN") : tx("Set PIN")}
          </button>
        </div>
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
              <h1 className={styles.pageTitle}>{tt("ui.wallet.pin.2cdf", "Wallet PIN")}</h1>
              <p className={styles.pageSubtitle}>
                {tt("ui.secure.sends.withdrawals.digit.1db8", "Secure your sends and withdrawals with a 4-digit PIN.")}
              </p>
            </div>
            <Link href="/wallets" className={styles.sectionLink}>
              {tt("ui.back.wallet.f0f5", "← Back to wallet")}
            </Link>
          </div>

          {content}
        </div>
      </main>

      <BottomMenu />
    </div>;
};
export default PinPage;