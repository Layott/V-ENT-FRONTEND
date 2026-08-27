// The language the interface is currently in, readable from anywhere.
//
// Dates were formatted with a hardcoded 'en-GB' in 28 files, so a French page
// printed "Fri, Sep 4" and a Portuguese one did the same. The zone was always
// the reader's own, since toLocaleString sees to that, but the words were not.
//
// A hook would have been the obvious fix, except a third of those places are
// plain helper functions (walletHelpers, formatters defined above a component)
// where a hook cannot be called. So the provider publishes the language here
// and anything that formats can ask for it, component or not.
//
// It lives apart from lib/locale.js on purpose: that file is imported by the
// middleware, which runs per request on the edge, and a module-level value
// shared between requests there would be somebody else's language.
//
// Deliberately a plain value rather than state: nothing needs to re-render on
// the change, because the provider that sets it re-renders the whole tree on
// the same change anyway.

let current = 'en';

/** Called by LanguageProvider whenever the interface language changes. */
export function setAppLocale(code) {
  if (code) current = code;
}

/** The current interface language, for toLocaleDateString and friends. */
export function appLocale() {
  return current;
}
