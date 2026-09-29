'use client';
/**
 * The ways somebody can pay right now, for every door that takes money.
 *
 * CEO, 29 September 2026: "i did not select any payment method and it showed
 * this, the selecting of payment method flow should be very user intuitive
 * with pointers." The top-up page started with Paystack chosen before it knew
 * whether Paystack existed; production has no Paystack key, so the choice was
 * invisible and pressing Pay was refused with "That way to pay is not
 * available right now".
 *
 * So, at every door:
 *  - nothing is chosen until the server has said what exists;
 *  - one option is chosen for the payer, and the screen says it is the only one;
 *  - several options wait for the payer to pick, and Pay says so until they do;
 *  - no options, or a list that could not be read, is said plainly.
 */
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL;

/** `{status: 'loading'|'ready'|'failed', providers: [{key, test_mode}], retry}` */
export function usePayProviders() {
  const [state, setState] = useState({ status: 'loading', providers: [] });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    fetch(`${API}/auth/wallet/pay/providers/`)
      .then((r) => r.json())
      .then((b) => {
        if (cancelled) return;
        if (b?.status !== 'success') throw new Error('providers');
        setState({ status: 'ready', providers: b?.data?.providers || [] });
      })
      .catch(() => { if (!cancelled) setState({ status: 'failed', providers: [] }); });
    return () => { cancelled = true; };
  }, [attempt]);
  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

/** The key to choose for the payer: the only option, or nothing. */
export function onlyOption(keys) {
  return keys.length === 1 ? keys[0] : '';
}

/** A gateway's name as a person reads it. */
export function providerName(tt, key) {
  if (key === 'flutterwave') return tt('pay.flutterwave', 'Flutterwave');
  if (key === 'paystack') return tt('ui.paystack.c851', 'Paystack');
  return key;
}
