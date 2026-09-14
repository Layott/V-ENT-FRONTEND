'use client';

// "Pay with a card" at every door that can refuse for want of coins.
//
// CEO, 13 September 2026: "Also i hope people can still bu stuff directly on
// the platform without having to buy V-ENT coins, that option must always be
// vaailable."
//
// Before this, one door in the platform took a card. Everybody else was told
// INSUFFICIENT_BALANCE and sent to the wallet to buy coins as a separate
// errand, then back to find what they were doing. The tournament register had
// built its own way through, alone, which is exactly how a thing ends up
// existing on one screen out of six.
//
// What this does, given how many coins the purchase needs:
//
//   enough coins already   -> nothing is drawn; the caller carries on
//   a saved card           -> one press charges the shortfall and calls
//                             onPaid(); the buyer never leaves the page
//   no saved card          -> one press sends them to Paystack and brings
//                             them back here, where the coins are credited
//                             and onPaid() runs
//   no Paystack key at all -> it says so, rather than offering a button that
//                             fails on press
//
// The amount is never computed here. The door said what it needed, the server
// subtracts the balance, and the charge is the difference: two tabs open on
// the same wallet cannot make this pay for coins somebody already has.

import { useCallback, useEffect, useRef, useState } from 'react';
import { LuCreditCard } from 'react-icons/lu';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import styles from './pay-shortfall.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

/** Where a purchase was up to, held across the trip to Paystack. */
const RESUME_KEY = 'vent.pay.resume';

export function rememberResume(what) {
  try {
    sessionStorage.setItem(RESUME_KEY, JSON.stringify(what || {}));
  } catch {
    // A private window with storage off. The payment still works; only the
    // "carry on where you were" part is lost, and the coins are in the wallet.
  }
}

export function takeResume() {
  try {
    const raw = sessionStorage.getItem(RESUME_KEY);
    sessionStorage.removeItem(RESUME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function PayShortfall({
  needVc,            // what the purchase costs, in whole coins
  token,
  purpose = 'purchase',
  resume = null,     // anything the caller wants back after the Paystack trip
  onPaid,            // called once the coins are there
  label,             // the button's words, when the default is too vague
}) {
  const tt = useT();
  const [methods, setMethods] = useState(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [said, setSaid] = useState('');
  const paidOnce = useRef(false);

  const headers = useCallback(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/wallet/pay/methods/`, { headers: headers() });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.status === 'success') setMethods(body.data);
    } catch {
      // Leave `methods` null: the panel draws its own loading line rather
      // than guessing that cards work and offering one that cannot.
    }
  }, [token, headers]);

  useEffect(() => { load(); }, [load]);

  // Coming back from Paystack. The reference is in the address; the coins are
  // credited by the same verify the wallet's own top-up uses, and then the
  // purchase carries on where it left off.
  useEffect(() => {
    if (!token || paidOnce.current) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;
    paidOnce.current = true;
    (async () => {
      setBusy(true);
      try {
        const res = await fetch(`${API}/auth/wallet/topup/verify/`, {
          method: 'POST', headers: headers(), body: JSON.stringify({ reference }),
        });
        const body = await res.json().catch(() => ({}));
        // The reference is spent whether or not it worked: a second run would
        // verify a payment that has already been counted.
        const url = new URL(window.location.href);
        url.searchParams.delete('reference');
        url.searchParams.delete('trxref');
        window.history.replaceState({}, '', url.toString());
        if (res.ok && body.status === 'success') {
          await load();
          if (onPaid) onPaid({ ...(takeResume() || {}), reference, viaCard: true });
        } else {
          setProblem(apiMessage(tt, body, 'pay.verifyFailed',
            'That payment could not be confirmed. Nothing was taken twice; check your wallet before trying again.'));
        }
      } catch {
        setProblem(tt('api.NETWORK_UNREACHABLE',
          'Could not reach the server. Check the connection and try again.'));
      } finally {
        setBusy(false);
      }
    })();
  }, [token, headers, load, onPaid, tt]);

  const need = Math.max(0, Math.ceil(Number(needVc) || 0));
  const balance = methods ? Number(methods.balance_vc || 0) : 0;
  const short = Math.max(0, need - balance);

  // Nothing to do: they can already pay for it from the wallet.
  if (!token || need <= 0 || (methods && short <= 0)) return null;
  if (!methods) {
    return <p className={styles.hint}>{tt('ui.loading.33ce', 'Loading…')}</p>;
  }

  if (!methods.cards_enabled) {
    // Told plainly rather than offered and refused. This is the one case
    // where somebody does have to top up another way, and saying so beats a
    // button that answers 503.
    return (
      <div className={styles.panel}>
        <p className={styles.hint}>
          {tt('pay.noCards', 'Card payment is not set up on this platform yet, so this has to be paid from VENT COINS.')}
        </p>
      </div>
    );
  }

  const press = async () => {
    setBusy(true);
    setProblem('');
    setSaid('');
    if (resume) rememberResume(resume);
    try {
      const res = await fetch(`${API}/auth/wallet/pay/`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          coins: need,
          purpose,
          callback_url: window.location.href,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.status !== 'success') {
        setProblem(apiMessage(tt, body, 'pay.failed', 'That payment did not go through.'));
        return;
      }
      if (body.data.paid) {
        setSaid(tt('pay.paidSaid', '{n} VENT COINS added. Carrying on.')
          .replace('{n}', formatNumber(body.data.coins_added || 0)));
        await load();
        if (onPaid) onPaid({ ...(resume || {}), reference: body.data.reference, viaCard: true });
      } else {
        window.location.href = body.data.authorization_url;
      }
    } catch {
      setProblem(tt('api.NETWORK_UNREACHABLE',
        'Could not reach the server. Check the connection and try again.'));
    } finally {
      setBusy(false);
    }
  };

  const card = methods.saved_card;
  const naira = short * Number(methods.ngn_per_coin || 1000);

  return (
    <div className={styles.panel}>
      <p className={styles.hint}>
        {tt('pay.short', 'You are {n} VENT COINS short. Pay the rest with a card and this goes through now.')
          .replace('{n}', formatNumber(short))}
      </p>
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      {said && <p className={styles.said}>{said}</p>}
      <button type="button" className={styles.pay} disabled={busy} onClick={press}>
        <LuCreditCard aria-hidden="true" />
        {busy
          ? tt('pay.working', 'Paying...')
          : (label || (card
            ? tt('pay.withSavedCard', 'Pay {amount} naira with {brand} ending {last4}')
              .replace('{amount}', formatNumber(naira))
              .replace('{brand}', card.brand || 'card')
              .replace('{last4}', card.last4)
            : tt('pay.withCard', 'Pay {amount} naira with a card')
              .replace('{amount}', formatNumber(naira))))}
      </button>
      {methods.test_mode && <p className={styles.hint}>
        {tt('pay.testMode', 'This platform is on Paystack test keys, so no real money moves.')}
      </p>}
    </div>
  );
}
