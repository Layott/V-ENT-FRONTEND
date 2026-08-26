// Which language an address is in.
//
// The site serves the same 81 routes in three languages. Moving every page under
// an `app/[locale]/` segment would have meant touching all of them, so the
// prefix is handled in middleware: `/fr/tournaments` is rewritten to
// `/tournaments` with the locale carried in a header, and the pages themselves
// never learn that prefixes exist.
//
// The prefix has to exist at all because hreflang is worthless without it. Three
// alternates all pointing at one URL tells a search engine nothing, and French
// and Portuguese pages would never rank as French or Portuguese pages.

export const LOCALES = ['en', 'fr', 'pt'];
export const DEFAULT_LOCALE = 'en';

// English is served unprefixed. `/en/tournaments` would be a second address for
// a page that already has one, which is the duplicate content the prefix exists
// to avoid.
export const PREFIXED = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

export const LOCALE_HEADER = 'x-vent-locale';
export const LOCALE_COOKIE = 'vent_locale';

/** Split "/fr/tournaments/x" into { locale: 'fr', path: '/tournaments/x' }. */
export function splitLocale(pathname) {
  const parts = (pathname || '/').split('/');
  const first = parts[1];
  if (PREFIXED.includes(first)) {
    const rest = `/${parts.slice(2).join('/')}`;
    return { locale: first, path: rest === '/' ? '/' : rest.replace(/\/$/, '') || '/' };
  }
  return { locale: DEFAULT_LOCALE, path: pathname || '/' };
}

/** The address of `path` in `locale`. English keeps the bare path. */
export function localePath(path, locale) {
  const clean = path?.startsWith('/') ? path : `/${path || ''}`;
  if (!PREFIXED.includes(locale)) return clean;
  return clean === '/' ? `/${locale}` : `/${locale}${clean}`;
}

/**
 * Best language for an Accept-Language header.
 *
 * Quality-weighted, because "fr-CA,fr;q=0.9,en;q=0.8" means French, and a naive
 * first-match on the raw string gets that right by accident and gets
 * "en;q=0.2,pt;q=0.9" wrong.
 */
export function preferredLocale(acceptLanguage) {
  if (!acceptLanguage) return null;
  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='));
      return {
        base: tag.trim().toLowerCase().split('-')[0],
        q: q ? parseFloat(q.slice(2)) || 0 : 1,
      };
    })
    .filter((entry) => LOCALES.includes(entry.base))
    .sort((a, b) => b.q - a.q);
  return ranked.length ? ranked[0].base : null;
}

// Countries where somebody is far more likely to want French or Portuguese
// than English. Used only when the browser sends no usable Accept-Language,
// which is rare but happens - and this platform is Africa-first, so most of the
// list is African rather than European.
export const COUNTRY_LOCALE = {
  // French
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr',
  SN: 'fr', CI: 'fr', ML: 'fr', BF: 'fr', NE: 'fr', GN: 'fr', TG: 'fr', BJ: 'fr',
  CM: 'fr', GA: 'fr', CG: 'fr', CD: 'fr', TD: 'fr', CF: 'fr', MG: 'fr', DJ: 'fr',
  RW: 'fr', BI: 'fr', KM: 'fr', SC: 'fr', MU: 'fr',
  DZ: 'fr', MA: 'fr', TN: 'fr',
  // Portuguese
  PT: 'pt', BR: 'pt',
  AO: 'pt', MZ: 'pt', CV: 'pt', GW: 'pt', ST: 'pt', TL: 'pt',
};

export const localeForCountry = (code) =>
  COUNTRY_LOCALE[String(code || '').toUpperCase()] || null;
