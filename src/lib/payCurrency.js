'use client';
/**
 * Paying in your own currency through Flutterwave (inbox 361).
 *
 * CEO, 29 September 2026: "yeah using flutterwave, we have options of payment
 * available for different countries and options which you can check."
 *
 * Prices stay in naira. What changes is how somebody pays: the server quotes
 * the naira price in each currency the Flutterwave account can take, with
 * Flutterwave's own rate, and signs the quote. The payer sees the amount and
 * the rate here, before paying, and the checkout charges exactly that quote.
 * A quote lasts 15 minutes; this asks for a fresh one after 10, and again the
 * moment the server says a quote is stale, so a slow payer never pays a price
 * they were not shown.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;
const REFRESH_MS = 10 * 60 * 1000;

/** The codes the server answers when a quote cannot be charged. */
export const QUOTE_CODES = ['QUOTE_EXPIRED', 'QUOTE_INVALID', 'QUOTE_MISMATCH', 'CURRENCY_UNAVAILABLE', 'CURRENCY_BELOW_MINIMUM'];

/**
 * `{status, options, selected, choose, choice, refresh}` for `amountNgn`.
 * `choice` is what a checkout sends: `{currency, quote}` (nothing for naira).
 */
export function useCurrencyQuotes(amountNgn, { token = '', active = true } = {}) {
  const [state, setState] = useState({ status: 'idle', options: [], fallback: 'NGN' });
  const [selected, setSelected] = useState('');
  const [attempt, setAttempt] = useState(0);
  const picked = useRef('');

  const amount = Math.max(0, Math.round(Number(amountNgn) || 0));

  useEffect(() => {
    if (!active || amount <= 0) {
      setState({ status: 'idle', options: [], fallback: 'NGN' });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    fetch(`${API}/auth/pay/currencies/?amount_ngn=${amount}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((b) => {
        if (cancelled) return;
        if (b?.status !== 'success') throw new Error('currencies');
        const options = b.data?.currencies || [];
        const fallback = b.data?.default || 'NGN';
        setState({ status: 'ready', options, fallback });
        // Keep what the payer picked across a refresh; otherwise their own.
        const keep = picked.current && options.some((o) => o.code === picked.current);
        setSelected(keep ? picked.current : fallback);
      })
      .catch(() => {
        // Naira still works without a quote, so a failure leaves naira.
        if (!cancelled) setState({ status: 'failed', options: [], fallback: 'NGN' });
      });
    const timer = setTimeout(() => setAttempt((n) => n + 1), REFRESH_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [amount, token, active, attempt]);

  const choose = useCallback((code) => {
    picked.current = code;
    setSelected(code);
  }, []);

  const current = state.options.find((o) => o.code === selected) || null;
  const choice = current && current.code !== 'NGN'
    ? { currency: current.code, quote: current.quote }
    : {};

  return {
    ...state,
    selected,
    current,
    choose,
    choice,
    refresh: () => setAttempt((n) => n + 1),
  };
}
