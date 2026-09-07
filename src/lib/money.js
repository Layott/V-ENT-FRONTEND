'use client';

import { useSession } from 'next-auth/react';
import { setAppRegion } from './appRegion';

// Prices, read in whichever money the reader thinks in.
//
// V-ENT prices in naira because that is what Paystack settles and what a VENT
// COIN is worth. Somebody in Accra still thinks in cedis, and should not have to
// do arithmetic to work out what a ticket costs.
//
// **Conversion is for reading.** The charge is settled in naira. A converted
// figure tells somebody roughly what they are paying; showing it as if it were
// the amount billed would be a lie about their money, so anything that displays
// one also says what the actual price is.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const CurrencyContext = createContext(null);
const PREFERENCE_KEY = 'vent.currency';

export function CurrencyProvider({
  children
}) {
  const [rates, setRates] = useState(null);
  const [preferred, setPreferred] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/currencies/`);
        const body = await res.json();
        if (!cancelled && body?.status === 'success') setRates(body.data?.results || []);
      } catch {
        // Left null. Everything then shows the price as stored, which is the
        // honest answer when the rates could not be asked for.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PREFERENCE_KEY);
      if (saved) setPreferred(saved);
    } catch {
      // Private window, or storage refused. No preference is fine.
    }
  }, []);

  // The ACCOUNT's own currency, timezone and date format, published for the
  // whole site.
  //
  // CEO, 7 September 2026, of the Currency and region panel: "do these work?"
  // They did not. All three were written to the account and read by nothing:
  // the currency preference lived in a separate localStorage key this panel
  // never touched, dates rendered in the browser's zone whatever the setting
  // said, and the date format was read nowhere at all.
  //
  // Fetched here because this provider is already mounted for the whole app
  // inside the session wrapper, so it is the one place that can ask once and
  // publish to everything. A second provider would mean a second request for
  // the same three values.
  //
  // The account WINS over the localStorage preference, because it is the one
  // that follows somebody to a new device. That is the whole reason to store
  // it on the account rather than in the browser.
  const { data: session, status: sessionStatus } = useSession();
  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      // Signed out: the browser's guess for the zone, the language's own date
      // order, VENT COINS for prices. Published explicitly so signing out
      // clears whoever was here before on a shared machine.
      setAppRegion({ timezone: '', dateFormat: '', currency: '' });
      return undefined;
    }
    const token = session?.user?.sessionToken;
    if (!token) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/settings/`,
                                { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json().catch(() => ({}));
        if (cancelled || body?.status !== 'success') return;
        const s = body.data?.settings || {};
        setAppRegion({
          timezone: s.timezone || '',
          dateFormat: s.date_format || '',
          currency: (s.payments || {}).default_currency || '',
        });
        const chosen = (s.payments || {}).default_currency;
        if (chosen) setPreferred(chosen);
      } catch {
        // The site works on the browser's guess. A failed preference lookup
        // must never be the reason a date does not render.
      }
    })();
    return () => { cancelled = true; };
  }, [sessionStatus, session?.user?.sessionToken]);
  const choose = useCallback(code => {
    setPreferred(code);
    try {
      if (code) localStorage.setItem(PREFERENCE_KEY, code);else localStorage.removeItem(PREFERENCE_KEY);
    } catch {
      // The choice still applies to this page; it just will not be remembered.
    }
  }, []);

  // Memoised for the same reason as the admin toast provider, which shipped
  // this exact fault: an object literal here is a new value on every render,
  // so every consumer re-renders and anything that lists the context in a
  // `useCallback` dependency array is rebuilt, re-running whatever effect
  // depends on it. Nothing does that here today; the point is that it becomes
  // a refetch loop the first time somebody does, and it is invisible until it
  // reaches a slow connection.
  const value = useMemo(() => ({ rates, preferred, choose }),
    [rates, preferred, choose]);

  return <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>;
}
export function useCurrency() {
  return useContext(CurrencyContext) || {
    rates: null,
    preferred: null,
    choose: () => {}
  };
}

/** Format an amount in a currency, using the reader's own number formatting. */
export function formatMoney(amount, code, symbol, locale) {
  const n = Number(amount || 0);
  const shown = n.toLocaleString(locale || undefined, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
  return symbol ? `${symbol}${shown}` : `${shown} ${code || ''}`.trim();
}

/**
 * A price as stored, plus what it is worth to this reader.
 *
 * Returns { original, converted } where converted is null when there is nothing
 * to add - no rates, no preference, or the reader already thinks in the
 * currency the price is in.
 */
export function usePrice() {
  const {
    rates,
    preferred
  } = useCurrency();
  return (amount, storedCode = 'NGN', locale) => {
    const stored = (rates || []).find(c => c.code === (storedCode || 'NGN'));
    const original = formatMoney(amount, storedCode, stored?.symbol, locale);
    if (!rates || !preferred || preferred === storedCode) {
      return {
        original,
        converted: null
      };
    }
    const to = rates.find(c => c.code === preferred);
    if (!to) return {
      original,
      converted: null
    };

    // Rates are held against the naira, so anything not already in naira goes
    // through it. One hop each way, and no rate is invented.
    const fromRate = Number(stored?.rate_from_ngn || 1);
    const toRate = Number(to.rate_from_ngn || 1);
    if (!fromRate) return {
      original,
      converted: null
    };
    const inNgn = Number(amount || 0) / fromRate;
    return {
      original,
      converted: formatMoney(inNgn * toRate, to.code, to.symbol, locale)
    };
  };
}

export default { CurrencyProvider, useCurrency, usePrice, formatMoney };
