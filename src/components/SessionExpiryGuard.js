'use client';
import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

/**
 * Global session-expiry handler.
 *
 * The backend uses a single, short-lived `login_session_token` (regenerated on
 * every login, 120-min timeout). When it dies, authed API calls come back 401.
 * Without this guard the app keeps rendering stale/blank data (0 VC, wrong
 * identity) instead of sending the user to re-authenticate.
 *
 * Rule: sign out ONLY when a request that CARRIED an `Authorization: Bearer`
 * header comes back 401 - i.e. "the token I sent is dead". A 401 on a tokenless
 * request (a race before the session hydrates) is ignored, so we never
 * false-logout a still-valid session. Non-API and NextAuth (/api/auth/*) traffic
 * is excluded by the API_BASE prefix check.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';
const AUTH_PATH = /^\/(login|signup|forgot-password|reset-password|verify-email|email-verified|onboarding)/;

// Module-level latch so concurrent 401s trigger exactly one signOut.
let signingOut = false;

function hadBearer(input, init) {
  try {
    let raw = init && init.headers;
    if (!raw && input && typeof input === 'object' && 'headers' in input) raw = input.headers;
    if (!raw) return false;
    const auth = new Headers(raw).get('authorization') || '';
    return /^bearer\s+\S/i.test(auth);
  } catch {
    return false;
  }
}

export default function SessionExpiryGuard() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.fetch) return;

    const orig = window.fetch;
    if (orig.__ventExpiryWrapped) return;

    const wrapped = async (...args) => {
      const res = await orig(...args);
      try {
        const [input, init] = args;
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (
          res.status === 401 &&
          API_BASE &&
          url.startsWith(API_BASE) &&
          !signingOut &&
          hadBearer(input, init)
        ) {
          const path = window.location.pathname;
          // The admin portal has its own identity (adminToken) and its own
          // login screen. A dead admin token must not sign the user out of the
          // main app or dump them on the player login page.
          if (path.startsWith('/admin')) {
            if (path !== '/admin/login') {
              try {
                localStorage.removeItem('adminUser');
                document.cookie = 'adminToken=; Max-Age=0; path=/';
              } catch {}
              window.location.replace('/admin/login?expired=1');
            }
          } else if (!AUTH_PATH.test(path)) {
            signingOut = true;
            // Drop the stale identity cache so the next login paints fresh.
            try {
              localStorage.removeItem('userProfile');
              localStorage.removeItem('authToken');
            } catch {}
            // Absolute URL on purpose. NEXTAUTH_URL is a server-only variable,
            // so it is not inlined into the browser bundle and next-auth's client
            // falls back to http://localhost:3000 - which is what a relative
            // callbackUrl resolves against in production.
            signOut({ callbackUrl: `${window.location.origin}/login?expired=1` });
          }
        }
      } catch {
        /* never let the guard break a real response */
      }
      return res;
    };
    wrapped.__ventExpiryWrapped = true;
    window.fetch = wrapped;

    return () => {
      // Only unpatch if nothing re-wrapped on top of us.
      if (window.fetch === wrapped) window.fetch = orig;
    };
  }, []);

  return null;
}
