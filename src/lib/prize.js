// One way to write a prize, everywhere.
//
// CEO, 12 October 2026 (inbox 444): "this event was created and prizepool was
// inputted in Naira, but it shows in coins after being publish and under
// review, it supposed to show in the currency it was selected in". A prize is
// paid in VENT COINS (inbox 403), so the coins stay; what the organiser typed
// comes first: "₦50,000 (50 VC)". A prize set in coins is just "50 VC".
//
// The server sends `prize: { vc, amount, currency, symbol }` on every card and
// detail (vent_tournament/money.prize_shown). Fifteen screens printed
// `prize_pool` with " VC" glued on, and four older ones put a dollar sign in
// front of coins; scripts/check-prize-display.mjs fails on either now.

import { appLocale } from '@/lib/appLocale';
import { formatNumber, readable } from '@/lib/datetime';

/** The prize object, from a card, a detail or an older payload. */
export function prizeOf(t) {
  const p = t?.prize;
  if (p && typeof p === 'object') {
    const amount = p.amount != null && p.amount !== '' ? Number(p.amount) : null;
    return {
      vc: Number(p.vc) || 0,
      amount: Number.isFinite(amount) && amount > 0 ? amount : null,
      currency: String(p.currency || 'VC').toUpperCase(),
    };
  }
  const vc = Number(t?.prize_pool ?? t?.prize_pool_vc ?? 0) || 0;
  return { vc, amount: null, currency: 'VC' };
}

/** An amount in a real currency, the reader's way: "₦50,000", "50 000 ₦". */
export function formatPrizeMoney(amount, currency) {
  const n = Number(amount) || 0;
  try {
    return readable(new Intl.NumberFormat(appLocale(), {
      style: 'currency', currency, currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: n % 1 ? 2 : 0,
    }).format(n));
  } catch {
    return `${formatNumber(n)} ${currency}`;
  }
}

/** Coins, the reader's way: "50 VC". */
export const coinText = (vc) => `${formatNumber(Number(vc) || 0)} VC`;

/** "₦50,000 (50 VC)", or "50 VC" for a prize set in coins. */
export function prizeText(t) {
  const p = prizeOf(t);
  if (p.amount == null || p.currency === 'VC') return coinText(p.vc);
  return `${formatPrizeMoney(p.amount, p.currency)} (${coinText(p.vc)})`;
}

/** One row of a prize table: its typed amount when there is one. */
export function prizeRowText(row) {
  const vc = Number(row?.prize ?? 0) || 0;
  const amount = row?.amount != null && row.amount !== '' ? Number(row.amount) : null;
  const currency = String(row?.currency || 'VC').toUpperCase();
  if (amount == null || !Number.isFinite(amount) || currency === 'VC') return coinText(vc);
  return `${formatPrizeMoney(amount, currency)} (${coinText(vc)})`;
}
