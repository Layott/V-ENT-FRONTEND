import { headers } from 'next/headers';
import { dictionaries } from './dictionaries';

// The translator for server components.
//
// Loading skeletons, `not-found`, and the metadata builders all run on the
// server, where there is no React context and therefore no useT(). They were
// the last places on the platform still writing English into the page
// directly, and they are not incidental: a loading skeleton is the first thing
// somebody sees on a slow connection, which is most of this audience, and
// `not-found` is where a stale link lands.
//
// Turning them into client components to reach the hook would be the wrong
// trade - a route-level skeleton exists precisely because it renders on the
// server before any JavaScript arrives. So the locale is read from the header
// middleware already sets, and the same dictionary is read directly.
//
// `t` here has the same signature as the client `t`, so a component can be
// moved between the two without its call sites changing.
//
// No `server-only` guard: the package is not a dependency here, and importing
// this from a client component fails on next/headers anyway, loudly and at the
// right moment.

const LOCALE_HEADER = 'x-vent-locale';

export function serverLocale() {
  try {
    const value = headers().get(LOCALE_HEADER);
    return value && dictionaries[value] ? value : 'en';
  } catch {
    // headers() throws outside a request - a static build, for instance -
    // where English is the right answer.
    return 'en';
  }
}

/** `const t = getT()` in a server component, then `t('key', 'English')`. */
export function getT() {
  const table = dictionaries[serverLocale()] || dictionaries.en;
  return (key, fallback) => table[key] ?? dictionaries.en[key] ?? fallback ?? key;
}

export default getT;
