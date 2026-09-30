'use client';
/**
 * An event's ticket types, for the places that sell them outside the event
 * page: the embed on somebody else's site and the organiser's own website
 * (inbox 360).
 *
 * It lists and it links; it never takes a payment. Pressing a type opens the
 * event page's own checkout with that type chosen (`?tab=tickets&tier=`), so
 * wallet, guest checkout, access codes, limits per address, both providers
 * and every currency stay one code path. From a frame the checkout opens in a
 * new tab, because a payment page inside somebody else's site is a page the
 * buyer cannot see the address of.
 */
import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/i18n/LanguageProvider';
import { formatDate, formatNumber } from '@/lib/datetime';
import { formatMoney } from '@/lib/money';
import { checkoutPath } from '@/lib/embed';
import styles from './event-tickets.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function EventTickets({ slug, ended = false, newTab = false, origin = '' }) {
  const { t: tt, language } = useLanguage();
  const [state, setState] = useState({ status: 'loading', tiers: [], code: '' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    fetch(`${API}/event/${encodeURIComponent(slug)}/ticket-types/`, { cache: 'no-store' })
      .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
      .then(({ ok, b }) => {
        if (cancelled) return;
        if (!ok || b?.status !== 'success') {
          setState({ status: 'failed', tiers: [], code: b?.code || '' });
          return;
        }
        setState({ status: 'ready', tiers: b.data?.tiers || [], code: '' });
      })
      .catch(() => { if (!cancelled) setState({ status: 'failed', tiers: [], code: '' }); });
    return () => { cancelled = true; };
  }, [slug, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  if (state.status === 'loading') {
    return (
      <div className={styles.list} aria-busy="true" aria-label={tt('embed.loadingTickets', 'Loading tickets')}>
        {[0, 1].map((i) => <div key={i} className={styles.skeleton} />)}
      </div>
    );
  }

  if (state.status === 'failed') {
    return (
      <div className={styles.note}>
        <p>{state.code === 'EVENT_CANCELLED'
          ? tt('embed.cancelled', 'This event was cancelled. Anybody who paid is refunded.')
          : tt('embed.ticketsFailed', 'The tickets could not be loaded.')}</p>
        {state.code !== 'EVENT_CANCELLED' && (
          <button type="button" className={styles.retry} onClick={retry}>
            {tt('embed.tryAgain', 'Try again')}
          </button>
        )}
      </div>
    );
  }

  if (!state.tiers.length) {
    return <p className={styles.note}>{tt('embed.noTickets', 'No tickets are on sale for this event yet.')}</p>;
  }

  return (
    <ul className={styles.list}>
      {state.tiers.map((tier) => {
        const vc = Number(tier.price_now_vc ?? tier.price_vc ?? tier.price ?? 0);
        const ngn = Number(tier.price_ngn ?? 0);
        const soldOut = !!tier.sold_out || Number(tier.remaining ?? 0) <= 0;
        const when = tier.day
          ? (tier.day_label ? `${formatDate(tier.day)} · ${tier.day_label}` : formatDate(tier.day))
          : '';
        const href = `${origin}${checkoutPath(slug, tier.id)}`;
        return (
          <li key={tier.id} className={styles.row}>
            <div className={styles.what}>
              <p className={styles.name}>{tier.name}</p>
              {when && <p className={styles.meta}>{when}</p>}
              <p className={styles.price}>
                {vc > 0
                  ? tt('embed.price', '{vc} VC, which is {naira}')
                    .replace('{vc}', formatNumber(vc))
                    .replace('{naira}', formatMoney(ngn, 'NGN', '₦', language))
                  : tt('embed.free', 'Free')}
              </p>
            </div>
            {ended || soldOut ? (
              <span className={styles.gone}>
                {ended ? tt('embed.over', 'Event over') : tt('embed.soldOut', 'Sold out')}
              </span>
            ) : (
              <a className={styles.buy} href={href}
                 {...(newTab ? { target: '_blank', rel: 'noopener' } : {})}>
                {vc > 0 ? tt('embed.buy', 'Buy') : tt('embed.get', 'Get ticket')}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
