'use client';

// The event's own shop, from the organiser's side (inbox 550).
//
// An event can sell things of its own: merch, food, the drinks at the door.
// That shop is a stall like any other, so it is run from the same screen, and
// this panel only opens it or points there. Premium decides who may open one,
// so the sentence about Premium is shown before anybody presses the button.
//
// Buyers collect at the venue on the day, which is why the pickup place and
// window are read out in full here: the organiser is the one staffing it.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiMessage } from '@/lib/apiMessage';
import { useAutoRefresh } from '@/lib/useLiveData';
import { formatDateTime, formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import styles from './EventShopPanel.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

const REFUND_WORDS = {
  none: ['shop.refundNone', 'No refunds'],
  until_event_start: ['shop.refundUntilStart', 'Buyers can cancel for their coins back until the event starts'],
  until_collected: ['shop.refundUntilCollected', 'Buyers can cancel for their coins back until the order is collected'],
};

const EventShopPanel = ({ eventRef, token }) => {
  const tt = useT();
  const [shop, setShop] = useState(null);
  const [premium, setPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const call = useCallback(async (method) => {
    const res = await fetch(`${API}/event/${encodeURIComponent(eventRef)}/shop/`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(method === 'POST' ? { body: '{}' } : {}),
    });
    const body = await res.json().catch(() => ({ status: 'error', code: `HTTP_${res.status}` }));
    return { ok: res.ok && body.status === 'success', body };
  }, [eventRef, token]);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!token || !eventRef) return;
    // A quiet refresh never clears a refusal somebody is still reading.
    if (!quiet) { setLoading(true); setError(''); }
    const { ok, body } = await call('GET');
    if (ok) {
      setShop(body.data?.shop || null);
      setPremium(!!body.data?.premium);
    } else if (!quiet) {
      setError(apiMessage(tt, body, 'api.somethingWentWrong', 'Something went wrong.'));
    }
    if (!quiet) setLoading(false);
    // `tt` is left out on purpose: it changes identity on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call, token, eventRef]);

  useEffect(() => { load(); }, [load]);
  // Opened from another tab or by a co-manager, the summary follows.
  useAutoRefresh(() => load({ quiet: true }));

  const openShop = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    const { ok, body } = await call('POST');
    setBusy(false);
    if (ok) {
      setShop(body.data?.shop || null);
      setPremium(!!body.data?.premium);
      return;
    }
    // The button is disabled without Premium, so this is the server saying so
    // on a stale page rather than a control that was offered and failed.
    if (body.code === 'PREMIUM_REQUIRED') {
      setPremium(false);
      return;
    }
    setError(apiMessage(tt, body, 'api.shopOpenFailed', 'The shop could not be opened.'));
  };

  if (loading) {
    return <div className={styles.card}>
      <p className={styles.muted}>{tt('shop.loading', 'Loading the shop...')}</p>
    </div>;
  }

  if (error && !shop) {
    return <div className={styles.card}>
      <p className={styles.error} role="alert">{error}</p>
      <button type="button" className={styles.ghost} onClick={load}>
        {tt('ui.tryAgain', 'Try again')}
      </button>
    </div>;
  }

  if (!shop) {
    return <div className={styles.card}>
      <h3 className={styles.title}>{tt('shop.heading', 'The event shop')}</h3>
      <p className={styles.muted}>
        {tt('shop.intro', 'A shop of the event\'s own, for merch, food or drinks. Buyers pay with VENT COINS or a card and collect at the venue on the event day. You run it from the same screen as every other stall.')}
      </p>
      {!premium && <div className={styles.premiumBox}>
        <p className={styles.muted}>
          {tt('shop.premiumNeeded', 'An event shop is part of Premium. Premium is what lets an event sell things of its own.')}
        </p>
        <Link href="/premium" className={styles.ghost}>
          {tt('shop.seePremium', 'See Premium')}
        </Link>
      </div>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.primary}
                disabled={busy || !premium} onClick={openShop}>
          {busy ? tt('ui.saving', 'Saving...') : tt('shop.open', 'Open the shop')}
        </button>
      </div>
    </div>;
  }

  const refund = REFUND_WORDS[shop.refund_policy] || REFUND_WORDS.none;
  const opens = shop.pickup_opens_at ? formatDateTime(shop.pickup_opens_at) : '';
  const closes = shop.pickup_closes_at ? formatDateTime(shop.pickup_closes_at) : '';

  return <div className={styles.card}>
    <h3 className={styles.title}>{shop.name}</h3>
    <p className={styles.muted}>
      {tt('shop.productCount', '{n} on sale').replace('{n}', formatNumber(shop.product_count || 0))}
    </p>

    <dl className={styles.facts}>
      <div className={styles.fact}>
        <dt className={styles.label}>{tt('shop.pickupPlace', 'Collected at')}</dt>
        <dd className={styles.value}>
          {shop.pickup_location || tt('shop.pickupPlaceNotSet', 'Not set yet. Add it on the stall.')}
        </dd>
      </div>
      <div className={styles.fact}>
        <dt className={styles.label}>{tt('shop.pickupWindow', 'Collection window')}</dt>
        <dd className={styles.value}>
          {opens && closes
            ? tt('shop.pickupWindowBoth', 'From {from} to {to}').replace('{from}', opens).replace('{to}', closes)
            : tt('shop.pickupWindowNotSet', 'Not set yet. Add it on the stall.')}
        </dd>
      </div>
      <div className={styles.fact}>
        <dt className={styles.label}>{tt('shop.refund', 'Refunds')}</dt>
        <dd className={styles.value}>{tt(refund[0], refund[1])}</dd>
      </div>
    </dl>

    <div className={styles.actions}>
      <Link href={`/my-stalls/${encodeURIComponent(shop.slug)}`} className={styles.primary}>
        {tt('shop.manage', 'Manage the shop')}
      </Link>
    </div>
  </div>;
};

export default EventShopPanel;
