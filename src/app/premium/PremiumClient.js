'use client';

// What premium is, what it costs, and the button that turns it on.
//
// This page exists because of one sentence. Until 10 September every premium
// refusal on the platform ended with "Ask a V-ENT admin to turn premium on for
// this account", and the CEO's answer to that was "They shouldnt be requesting
// a vent admin to turn on anything". A refusal that names a person to go and
// find is a dead end with instructions.
//
// So every one of those refusals now links here, and here there is always
// something to press. When there is a price, the press buys it from the wallet.
// When there is not, the press records that somebody wanted it, and the console
// can read that list. Nobody is ever sent to find a member of staff.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/header/Header';
import MobileHeader from '@/components/mobile-header/MobileHeader';
import BottomMenu from '@/components/bottom-menu/BottomMenu';
import Sidebar from '@/components/sidebar/Sidebar';
import { useT } from '@/i18n/LanguageProvider';
import { apiMessage } from '@/lib/apiMessage';
import { formatDate, formatNumber } from '@/lib/datetime';
import { useViewer, signInHref, signUpHref } from '@/lib/gating';
import styles from './premium.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

// What each gated feature is, in the reader's language. Keyed by the SAME keys
// `vent_auth/premium.py` gates on, so a feature added there without a sentence
// here falls back to the server's English rather than disappearing.
const FEATURE_KEY = (key) => `premium.feature.${key}`;

const PremiumClient = () => {
  const tt = useT();
  const viewer = useViewer();

  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [months, setMonths] = useState(1);
  const [holder, setHolder] = useState('');   // '' = me, otherwise an org slug

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/premium/offer/`, {
        headers: viewer.token
          ? { Authorization: `Bearer ${viewer.token}` }
          : {},
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.status !== 'success') {
        setError(apiMessage(body, tt, tt('premium.loadFailed',
          'We could not load the premium offer just now.')));
        return;
      }
      setOffer(body.data);
    } catch {
      setError(tt('premium.loadFailed',
        'We could not load the premium offer just now.'));
    } finally {
      setLoading(false);
    }
  }, [tt, viewer.token]);

  useEffect(() => {
    if (viewer.loading) return;
    load();
  }, [viewer.loading, load]);

  const buy = async () => {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch(`${API}/auth/premium/buy/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({ months, organisation: holder || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.status !== 'success') {
        setToast(apiMessage(body, tt, tt('premium.buyFailed',
          'That did not go through.')));
        return;
      }
      setToast(tt('premium.bought', 'Premium is on.'));
      await load();
    } catch {
      setToast(tt('premium.buyFailed', 'That did not go through.'));
    } finally {
      setBusy(false);
    }
  };

  const registerInterest = async () => {
    setBusy(true);
    setToast(null);
    try {
      const res = await fetch(`${API}/auth/premium/interest/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${viewer.token}`,
        },
        body: JSON.stringify({ surface: 'premium-page' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.status !== 'success') {
        setToast(apiMessage(body, tt, tt('premium.interestFailed',
          'We could not record that just now.')));
        return;
      }
      setToast(tt('premium.interestNoted',
        'Noted. We will tell you the day it goes on sale.'));
    } catch {
      setToast(tt('premium.interestFailed',
        'We could not record that just now.'));
    } finally {
      setBusy(false);
    }
  };

  const shell = (inner) => (
    <div className={styles.pageContainer}>
      <Header />
      <MobileHeader />
      <main className={styles.mainContainer}>
        <Sidebar />
        <div className={styles.rightPaneContainer}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              {tt('premium.title', 'V-ENT premium')}
            </h1>
            <p className={styles.pageSubtitle}>
              {tt('premium.subtitle',
                'Eight things that are switched off on a free account, and what '
                + 'it takes to switch them on.')}
            </p>
          </div>
          {inner}
        </div>
      </main>
      <BottomMenu />
      {toast ? <div className={styles.toast} role="status">{toast}</div> : null}
    </div>
  );

  if (loading) {
    return shell(<>
      <div className={styles.skeleton} />
      <div className={styles.skeleton} />
    </>);
  }

  if (error) {
    return shell(
      <div className={styles.error}>
        <span>{error}</span>
        <button type="button" className={styles.retry} onClick={load}>
          {tt('common.tryAgain', 'Try again')}
        </button>
      </div>,
    );
  }

  const onSale = Boolean(offer?.on_sale);
  const monthly = Number(offer?.price_vc_monthly || 0);
  const yearly = Number(offer?.price_vc_yearly || 0);
  const cost = months === 12 && yearly > 0 ? yearly : monthly * months;
  const balance = Number(offer?.balance_vc || 0);
  const chosen = holder
    ? (offer?.organisations || []).find((o) => o.slug === holder)
    : offer?.me;
  const alreadyGranted = Boolean(chosen?.granted);
  const canAfford = balance >= cost;

  return shell(
    <>
      {/* What it actually unlocks, from the module that gates it rather than
          from marketing copy that can drift away from the code. */}
      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {tt('premium.whatTitle', 'What premium switches on')}
        </h2>
        <ul className={styles.featureList}>
          {(offer?.features || []).map((f) => (
            <li key={f.key} className={styles.feature}>
              {tt(FEATURE_KEY(f.key), f.name)}
            </li>
          ))}
        </ul>
      </section>

      {/* Where the reader stands, before anything is offered to them. */}
      {offer?.signed_in && chosen?.is_premium ? (
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>
            {tt('premium.standingOn', 'Premium is on')}
          </h2>
          <p className={styles.standing}>
            {chosen.granted
              ? tt('premium.standingGranted',
                'V-ENT turned this on for this account. It has no end date.')
              : tt('premium.standingUntil', 'It runs until {date}.')
                .replace('{date}', chosen.premium_until
                  ? formatDate(chosen.premium_until) : '')}
          </p>
          {chosen.premium_note ? (
            <p className={styles.standingNote}>{chosen.premium_note}</p>
          ) : null}
        </section>
      ) : null}

      <section className={styles.card}>
        <h2 className={styles.cardTitle}>
          {onSale
            ? tt('premium.priceTitle', 'What it costs')
            : tt('premium.notOnSaleTitle', 'Not on sale yet')}
        </h2>

        {!onSale ? (
          <>
            <p className={styles.priceBody}>
              {tt('premium.notOnSaleBody',
                'We have not set a price yet. Tell us you want it and we will '
                + 'tell you the day it goes on sale.')}
            </p>
            {!viewer.signedIn ? (
              <div className={styles.actions}>
                <Link href={signUpHref('/premium')} className={styles.action}>
                  {tt('needsAccount.create', 'Create an account')}
                </Link>
                <Link href={signInHref('/premium')}
                      className={`${styles.action} ${styles.actionQuiet}`}>
                  {tt('needsAccount.signIn', 'Log in')}
                </Link>
              </div>
            ) : (
              <div className={styles.actions}>
                <button type="button" className={styles.action}
                        disabled={busy} onClick={registerInterest}>
                  {tt('premium.wantIt', 'I want premium')}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <p className={styles.price}>
              <span className={styles.priceNumber}>{formatNumber(monthly)}</span>
              <span className={styles.priceUnit}>
                {tt('premium.perMonth', 'VENT COINS a month')}
              </span>
            </p>
            {yearly > 0 ? (
              <p className={styles.priceBody}>
                {tt('premium.yearlyLine', 'Or {coins} VENT COINS for a year.')
                  .replace('{coins}', formatNumber(yearly))}
              </p>
            ) : null}

            {!viewer.signedIn ? (
              <div className={styles.actions}>
                <Link href={signUpHref('/premium')} className={styles.action}>
                  {tt('needsAccount.create', 'Create an account')}
                </Link>
                <Link href={signInHref('/premium')}
                      className={`${styles.action} ${styles.actionQuiet}`}>
                  {tt('needsAccount.signIn', 'Log in')}
                </Link>
              </div>
            ) : (
              <>
                {/* Who it is for. Somebody who runs an organisation is usually
                    buying it for the organisation, because an organisation's
                    premium carries everybody running anything in its name. */}
                {(offer?.organisations || []).length > 0 ? (
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="premium-holder">
                      {tt('premium.forWho', 'Turn it on for')}
                    </label>
                    <select id="premium-holder" className={styles.select}
                            value={holder}
                            onChange={(e) => setHolder(e.target.value)}>
                      <option value="">
                        {tt('premium.forMe', 'My account')}
                      </option>
                      {offer.organisations.map((o) => (
                        <option key={o.slug} value={o.slug}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="premium-months">
                    {tt('premium.howLong', 'How long')}
                  </label>
                  <select id="premium-months" className={styles.select}
                          value={months}
                          onChange={(e) => setMonths(Number(e.target.value))}>
                    <option value={1}>{tt('premium.oneMonth', 'One month')}</option>
                    <option value={3}>{tt('premium.threeMonths', 'Three months')}</option>
                    <option value={6}>{tt('premium.sixMonths', 'Six months')}</option>
                    <option value={12}>{tt('premium.twelveMonths', 'A year')}</option>
                  </select>
                </div>

                <p className={styles.totalLine}>
                  {tt('premium.totalLine',
                    '{coins} VENT COINS now. Your balance is {balance}.')
                    .replace('{coins}', formatNumber(cost))
                    .replace('{balance}', formatNumber(balance))}
                </p>

                {alreadyGranted ? (
                  <p className={styles.priceBody}>
                    {tt('premium.alreadyGranted',
                      'This account already has premium with no end date, so '
                      + 'there is nothing to buy.')}
                  </p>
                ) : (
                  <div className={styles.actions}>
                    <button type="button" className={styles.action}
                            disabled={busy || !canAfford} onClick={buy}>
                      {tt('premium.buy', 'Turn premium on')}
                    </button>
                    {!canAfford ? (
                      <Link href="/wallets"
                            className={`${styles.action} ${styles.actionQuiet}`}>
                        {tt('premium.topUp', 'Top up your wallet')}
                      </Link>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </section>
    </>,
  );
};

export default PremiumClient;
