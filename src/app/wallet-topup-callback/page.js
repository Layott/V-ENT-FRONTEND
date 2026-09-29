'use client';

/**
 * Where a payer lands back from the payment page.
 *
 * CEO, 29 September 2026, on a cancelled Flutterwave payment: "this page
 * doesnt look nice. the ui". It was a bare box on an empty page, its sentence
 * was drawn in the TEXT colour meant for light pages (black on dark), and a
 * payment somebody chose to cancel read as a failure with one cramped button.
 *
 * Now it sits in the site's own frame and says which of four things happened,
 * each with what to do next:
 *   verifying   the server is asking the gateway
 *   success     coins added; the balance, then back to where they came from
 *   cancelled   they closed the payment page; nothing charged; try again
 *   failed      the gateway said no; nothing charged; try again
 *   unsure      the answer could not be read yet; check again, or the wallet
 */
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LuCheck, LuX, LuRotateCw } from 'react-icons/lu';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import Sidebar from '@/components/sidebar/Sidebar';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import styles from './wallet-topup-callback.module.css';

// Only a path on this site: the address is read from the query string.
const safeReturn = (value) => (value && value.startsWith('/') && !value.startsWith('//') ? value : '/wallets');

function Outcome() {
  const tt = useT();
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState('verifying');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const reference = params.get('reference') || params.get('trxref') || params.get('tx_ref') || '';
  const gatewaySaid = (params.get('status') || '').toLowerCase();
  const back = safeReturn(params.get('redirect_to'));
  const token = session?.user?.sessionToken;

  const verify = useCallback(async () => {
    setState('verifying');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/wallet/topup/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reference }),
      });
      const body = await res.json().catch(() => ({}));
      if (body.status === 'success') {
        setResult(body.data || {});
        setState('success');
        return;
      }
      if (body.code === 'PAYMENT_NOT_SUCCESSFUL') {
        setState(gatewaySaid === 'cancelled' ? 'cancelled' : 'failed');
        return;
      }
      setMessage(apiMessage(tt, body, 'topup.callback.unsureBody',
        'We could not confirm this payment yet. If you paid, it will reach your wallet shortly; nothing is charged twice.'));
      setState('unsure');
    } catch {
      setMessage(tt('api.NETWORK_UNREACHABLE', 'Could not reach the server. Check the connection and try again.'));
      setState('unsure');
    }
  }, [token, reference, gatewaySaid, tt]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!reference) {
      setMessage(tt('msg.noPaymentReferenceFound', 'No payment reference found.'));
      setState('unsure');
      return;
    }
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    verify();
  }, [sessionStatus, token, reference, verify, router, tt]);

  useEffect(() => {
    if (state !== 'success') return undefined;
    const timer = setTimeout(() => router.replace(back), 4000);
    return () => clearTimeout(timer);
  }, [state, back, router]);

  return (
    <div className={styles.card} aria-live="polite">
      {state === 'verifying' && <>
        <div className={styles.spinner} aria-hidden="true" />
        <h1 className={styles.title}>{tt('topup.callback.checking', 'Checking your payment')}</h1>
        <p className={styles.body}>{tt('pay.verifying', 'Checking the payment. Please do not close this page.')}</p>
      </>}

      {state === 'success' && <>
        <span className={`${styles.badge} ${styles.badgeOk}`} aria-hidden="true"><LuCheck /></span>
        <h1 className={styles.title}>{tt('topup.callback.successTitle', 'Top-up complete')}</h1>
        <p className={styles.body}>
          {result?.coins_added
            ? tt('topup.callback.added', '{n} VENT COINS were added to your wallet.')
              .replace('{n}', formatNumber(result.coins_added))
            : tt('msg.topUpSuccessfulYourWallet', 'Top-up successful! Your wallet has been credited.')}
        </p>
        {(result?.balance ?? result?.new_balance) != null && <p className={styles.fact}>
          {tt('topup.callback.balance', 'Balance now: {n} VC')
            .replace('{n}', formatNumber(result.balance ?? result.new_balance))}
        </p>}
        <div className={styles.actions}>
          <Link href={back} className={`${styles.btn} ${styles.btnPrimary}`}>
            {tt('ui.go.wallet.191c', 'Go to Wallet')}
          </Link>
        </div>
        <p className={styles.note}>{tt('topup.callback.takingYouBack', 'Taking you back in a few seconds.')}</p>
      </>}

      {(state === 'cancelled' || state === 'failed') && <>
        <span className={`${styles.badge} ${styles.badgeStop}`} aria-hidden="true"><LuX /></span>
        <h1 className={styles.title}>
          {state === 'cancelled'
            ? tt('topup.callback.cancelledTitle', 'Payment cancelled')
            : tt('topup.callback.failedTitle', 'Payment did not go through')}
        </h1>
        <p className={styles.body}>
          {state === 'cancelled'
            ? tt('topup.callback.cancelledBody', 'You left the payment page before paying. Nothing was charged and nothing was added.')
            : tt('topup.callback.failedBody', 'The payment was not completed, so nothing was charged and nothing was added. You can try again, or choose another way to pay.')}
        </p>
        <div className={styles.actions}>
          <Link href="/wallets/topup" className={`${styles.btn} ${styles.btnPrimary}`}>
            {tt('topup.callback.tryAgain', 'Try again')}
          </Link>
          <Link href={back} className={`${styles.btn} ${styles.btnQuiet}`}>
            {tt('ui.back.wallet.4f88', 'Back to Wallet')}
          </Link>
        </div>
      </>}

      {state === 'unsure' && <>
        <span className={`${styles.badge} ${styles.badgeWait}`} aria-hidden="true"><LuRotateCw /></span>
        <h1 className={styles.title}>{tt('topup.callback.unsureTitle', 'Not confirmed yet')}</h1>
        <p className={styles.body}>{message}</p>
        <div className={styles.actions}>
          {reference && token && <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={verify}>
            {tt('topup.callback.checkAgain', 'Check again')}
          </button>}
          <Link href={back} className={`${styles.btn} ${styles.btnQuiet}`}>
            {tt('ui.back.wallet.4f88', 'Back to Wallet')}
          </Link>
        </div>
      </>}

      {reference && <p className={styles.ref}>
        {tt('ui.reference.db1c', 'Reference')}: <span>{reference}</span>
      </p>}
    </div>
  );
}

export default function WalletTopupCallback() {
  const tt = useT();
  return (
    <div className={styles.page}>
      <Header />
      <MobileHeader />
      <main className={styles.main}>
        <Sidebar />
        <div className={styles.pane}>
          <Suspense fallback={<div className={styles.card}><div className={styles.spinner} aria-hidden="true" />
            <p className={styles.body}>{tt('ui.loading.33ce', 'Loading…')}</p></div>}>
            <Outcome />
          </Suspense>
        </div>
      </main>
      <BottomMenu />
    </div>
  );
}
