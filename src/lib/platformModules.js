'use client';

// Which modules the console has switched on.
//
// /admin/settings has had a "Modules" panel with eight switches since it was
// built, including the shop. Nothing read them: the site decided what was
// available from a hardcoded list, so an admin could turn the shop on, save,
// see a success toast, and change nothing anywhere. The console was reporting
// success for an instruction it never carried out.
//
// This reads the flags once per page load and hands them to whatever asks. The
// hardcoded list stays as the answer used before the request lands, so nothing
// flickers between "available" and "coming soon" on a slow connection.

import { createContext, useContext, useEffect, useState } from 'react';
import { COMING_SOON_ROUTES } from './features';

// route -> the flag that decides it. A route with no entry here is not
// something the console governs, and is always available.
const ROUTE_FLAG = {
  '/shop': 'shop_enabled',
  '/marketplace': 'marketplace_enabled',
  '/anime': 'anime_enabled',
  '/wager': 'wager_enabled',
  '/events': 'events_enabled',
  '/tournaments': 'tournaments_enabled',
  '/wallets': 'wallet_enabled'
};

const ModulesContext = createContext(null);

export function PlatformModulesProvider({
  children
}) {
  const [flags, setFlags] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/platform/modules/`);
        const data = await res.json();
        if (!cancelled && data?.status === 'success') setFlags(data.data?.feature_flags || {});
      } catch {
        // Leave flags null. Everything then falls back to the built-in list,
        // which is the honest answer when we could not ask.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return <ModulesContext.Provider value={flags}>{children}</ModulesContext.Provider>;
}

/** Whether a route is still behind a Coming Soon page.
 *
 *  Falls back to the built-in list until the flags arrive, so the answer does
 *  not change under the reader mid-render.
 */
export function useComingSoon() {
  const flags = useContext(ModulesContext);
  return href => {
    // A module with no implementation is Coming Soon whatever the console says.
    // The switch can take a built module offline; it cannot conjure a shop that
    // does not exist, and letting it would put "available" in the nav above a
    // page that still reads Coming Soon.
    if (COMING_SOON_ROUTES.has(href)) return true;
    const flag = ROUTE_FLAG[href];
    if (flags && flag && flag in flags) return !flags[flag];
    return false;
  };
}

export function usePlatformFlags() {
  return useContext(ModulesContext);
}
