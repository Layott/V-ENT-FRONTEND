'use client';

// Coming back from Paystack, wherever they land.
//
// Found by walking it on 13 September 2026: the buy panel offered the card,
// the payment page opened, and coming back the coins were never credited.
// The verify lived inside the buy modal, and a modal is shut on a fresh page
// load, so the reference sat in the address doing nothing and the money was
// at Paystack with nothing to show for it.
//
// So the verify is mounted once, in the root layout, where it cannot be
// missing from the one screen somebody happened to come back to. It reads
// `?reference=` (Paystack also sends `trxref=`), credits the coins through
// the same endpoint the wallet's own top-up uses, takes the parameter out of
// the address so a reload cannot ask twice, and says what happened.
//
// It does NOT resume the purchase. A screen that can resume (the tournament
// register keeps a draft) still does its own thing; everywhere else the
// buyer lands with the coins in the wallet and the button in front of them.
// That is the honest version: nobody is sent to the wallet, and no payment
// is left hanging on whether a modal survived a redirect.

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { apiMessage } from '@/lib/apiMessage';
import { formatNumber } from '@/lib/datetime';
import { useT } from '@/i18n/LanguageProvider';
import styles from './paystack-return.module.css';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function PaystackReturn() {
  const tt = useT();
  const { data: session, status } = useSession();
  const token = session?.user?.sessionToken;
  const [said, setSaid] = useState(null);
  const done = useRef(false);

  useEffect(() => {
    // Decide after the session resolves: signed out and "still asking" look
    // the same in the data, and asking tokenless answers 400.
    if (status === 'loading' || !token || done.current) return;
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('reference') || params.get('trxref');
    if (!reference) return;
    done.current = true;

    (async () => {
      let body = {};
      let ok = false;
      try {
        const res = await fetch(`${API}/auth/wallet/topup/verify/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reference }),
        });
        body = await res.json().catch(() => ({}));
        ok = res.ok && body.status === 'success';
      } catch {
        body = { code: 'NETWORK_UNREACHABLE' };
      }

      // Spent either way: a reload must not ask about a payment that has
      // already been counted.
      const url = new URL(window.location.href);
      url.searchParams.delete('reference');
      url.searchParams.delete('trxref');
      window.history.replaceState({}, '', url.toString());

      if (ok) {
        const coins = Number(body.data?.vent_coins ?? body.data?.coins_added ?? 0);
        setSaid({
          good: true,
          text: coins > 0
            ? tt('pay.paidSaid', '{n} VENT COINS added. Carrying on.')
              .replace('{n}', formatNumber(coins))
            : tt('pay.alreadyCounted', 'That payment was already counted.'),
        });
        // Anything on the page that draws a balance can listen for this
        // rather than each screen writing its own poll.
        window.dispatchEvent(new CustomEvent('vent:wallet-changed',
          { detail: { reference, coins } }));
      } else {
        setSaid({
          good: false,
          text: apiMessage(tt, body, 'pay.verifyFailed',
            'That payment could not be confirmed. Nothing was taken twice; check your wallet before trying again.'),
        });
      }
    })();
  }, [status, token, tt]);

  if (!said) return null;
  return (
    <div className={`${styles.note} ${said.good ? styles.good : styles.bad}`} role="status">
      <span>{said.text}</span>
      <button type="button" className={styles.close} onClick={() => setSaid(null)}
              aria-label={tt('ui.close.bbfa', 'Close')}>
        ×
      </button>
    </div>
  );
}
