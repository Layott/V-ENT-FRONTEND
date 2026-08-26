'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { LANGUAGES, dictionaries } from './dictionaries';

// The language the interface is in.
//
// Three rules:
//
// 1. **The change is immediate.** Choosing a language re-renders the app; it
//    does not wait for a save, a reload or a round trip.
// 2. **It survives.** The choice is written to the account so it follows the
//    person to another device, and mirrored into localStorage so the very next
//    paint on this device is already right rather than flashing English first.
// 3. **A missing translation shows English**, never the key. An untranslated
//    label is a blemish; `settings.privacy.title` on screen is a bug.

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback ?? key,
  languages: LANGUAGES,
});

const STORAGE_KEY = 'vent:language';
const SUPPORTED = LANGUAGES.map((l) => l.code);

const normalise = (value) => (SUPPORTED.includes(value) ? value : 'en');

export const LanguageProvider = ({ children }) => {
  const { data: session } = useSession();
  const token = session?.user?.sessionToken;
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const [language, setLanguageState] = useState('en');

  // Whatever this device last used, applied before anything is fetched.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setLanguageState(normalise(stored));
    } catch {
      /* private mode, or storage refused */
    }
  }, []);

  // Then the account's own choice, which is the one that follows a person to a
  // new device.
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/setting/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const body = await res.json();
        const stored = body?.data?.settings?.language;
        if (!cancelled && stored) {
          const next = normalise(stored);
          setLanguageState(next);
          try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
        }
      } catch {
        /* the interface stays in whatever it is already showing */
      }
    })();
    return () => { cancelled = true; };
  }, [apiBase, token]);

  const setLanguage = useCallback(async (code) => {
    const next = normalise(code);
    setLanguageState(next);                       // immediate, before any network
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    if (typeof document !== 'undefined') document.documentElement.lang = next;

    if (!token) return true;
    try {
      const res = await fetch(`${apiBase}/setting/update/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: next }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }, [apiBase, token]);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key, fallback) => {
    const table = dictionaries[language] || dictionaries.en;
    return table[key] ?? dictionaries.en[key] ?? fallback ?? key;
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, t, languages: LANGUAGES }),
    [language, setLanguage, t],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);

/** Shorthand for components that only need the translator. */
export const useT = () => useContext(LanguageContext).t;

export default LanguageProvider;
