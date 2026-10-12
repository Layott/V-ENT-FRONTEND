'use client';

// The route somebody is on, without the language in front of it.
//
// French and Portuguese addresses carry a prefix (/fr/home) that middleware
// rewrites away, so the page that renders is /home while usePathname() still
// answers "/fr/home". Every menu compared that with "/home" and lost: in French
// and Portuguese no menu marked the page you were on, and the console's page
// guard (permsForPath) matched no section at /fr/admin/admins, so a moderator
// reading in French got the screen and its controls (inbox 433, 12 October
// 2026). It was the third time: SessionExpiryGuard had already been caught by
// "/fr/admin" not starting with "/admin", and four files stripped the prefix by
// hand, each with its own pattern.
//
// Compare routes with this. usePathname() is for the visible address only, for
// a redirect that must keep the reader's language. scripts/check-route-path.mjs
// holds both halves.
import { usePathname } from 'next/navigation';
import { splitLocale } from './locale';

export function useRoutePath() {
  return splitLocale(usePathname() || '/').path;
}
