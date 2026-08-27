'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { LANGUAGES, dictionaries } from './dictionaries';
import { DEFAULT_LOCALE, LOCALE_COOKIE, localePath, splitLocale } from '@/lib/locale';
import { setAppLocale } from '@/lib/appLocale';

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
  tx: (text) => text,
  languages: LANGUAGES,
});

const STORAGE_KEY = 'vent:language';

// Middleware reads this on every request to decide whether to send somebody to
// their language's address. Without writing it here, choosing English while on
// /fr would be undone by the very next navigation - middleware would still see
// the old cookie and redirect straight back.
const writeCookie = (code) => {
  try {
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch {
    /* cookies refused; the account still holds the choice */
  }
};
const SUPPORTED = LANGUAGES.map((l) => l.code);

const normalise = (value) => (SUPPORTED.includes(value) ? value : 'en');

export const LanguageProvider = ({ children }) => {
  const { data: session } = useSession();
  const token = session?.user?.sessionToken;
  const apiBase = process.env.NEXT_PUBLIC_API_URL;
  const pathname = usePathname() || '/';
  const router = useRouter();

  // The address wins over everything. Somebody who opened /fr/tournaments is
  // reading French, whatever their account happens to say, because the URL is
  // the most explicit statement of intent there is - and it is what they would
  // have shared with somebody else.
  const urlLocale = splitLocale(pathname).locale;

  const [language, setLanguageState] = useState(urlLocale);

  // Publish it for the formatters that cannot call a hook. Set during render
  // rather than in an effect, because a date formatted on this very render
  // would otherwise print in the language the page was last in.
  setAppLocale(language);

  // Whatever this device last used, applied before anything is fetched - but
  // never over a language stated in the address.
  useEffect(() => {
    if (urlLocale !== DEFAULT_LOCALE) {
      setLanguageState(urlLocale);
      writeCookie(urlLocale);
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setLanguageState(normalise(stored));
    } catch {
      /* private mode, or storage refused */
    }
  }, [urlLocale]);

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
        // Not over an explicit language in the address.
        if (!cancelled && stored && urlLocale === DEFAULT_LOCALE) {
          const next = normalise(stored);
          setLanguageState(next);
          try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
        }
      } catch {
        /* the interface stays in whatever it is already showing */
      }
    })();
    return () => { cancelled = true; };
  }, [apiBase, token, urlLocale]);

  const setLanguage = useCallback(async (code) => {
    const next = normalise(code);
    setLanguageState(next);                       // immediate, before any network
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    if (typeof document !== 'undefined') document.documentElement.lang = next;
    writeCookie(next);

    // Move to that language's address, so the URL matches what is on screen and
    // the page can be shared as the language it is being read in.
    const { path } = splitLocale(pathname);
    const target = localePath(path, next);
    if (target !== pathname) router.replace(target);

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
  }, [apiBase, token, pathname, router]);

  useEffect(() => {
    if (typeof document !== 'undefined') document.documentElement.lang = language;
  }, [language]);

  // Translate by the English text rather than by a key.
  //
  // Config arrays - the tab strips, the settings rows, the filter menus - are
  // built at module scope, where a hook cannot run, so their labels cannot be
  // written as t('some.key'). They stay in English in the source and are
  // translated here at the point they are rendered, by looking the English up
  // in a reverse index of the English dictionary.
  //
  // The index is built once and memoised. A string that is not in the
  // dictionary comes back unchanged, which is the correct answer for a game
  // title or somebody's username.
  const byText = useMemo(() => {
    const index = new Map();
    for (const [key, value] of Object.entries(dictionaries.en)) {
      if (!index.has(value)) index.set(value, key);
    }
    return index;
  }, []);

  const tx = useCallback((text) => {
    if (typeof text !== 'string' || !text) return text;
    const key = byText.get(text);
    if (!key) return text;
    const table = dictionaries[language] || dictionaries.en;
    return table[key] ?? text;
  }, [byText, language]);

  const t = useCallback((key, fallback) => {
    const table = dictionaries[language] || dictionaries.en;
    return table[key] ?? dictionaries.en[key] ?? fallback ?? key;
  }, [language]);

  // Publish it for the date formatters, which are often plain helpers rather
  // than components and so cannot call a hook.
  setAppLocale(language);

  const value = useMemo(
    () => ({ language, setLanguage, t, tx, languages: LANGUAGES }),
    [language, setLanguage, t, tx],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);

/** Shorthand for components that only need the translator. */
export const useT = () => useContext(LanguageContext).t;

/** Translate a string by its English text. For labels that come from config
 *  arrays built at module scope, where a key cannot be used. */
export const useTx = () => useContext(LanguageContext).tx;

export default LanguageProvider;
