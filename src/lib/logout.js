// One way out, used by all four places that offer one.
//
// The sidebar, the mobile sidebar, the header and the bottom menu each carried
// their own copy of the logout block. Four copies of the same twenty lines
// means a fix to one is a fix to one, and all four shared the same fault:
// `signOut()` clears the NextAuth token and leaves the `session` cookie, which
// the middleware accepts on its own, so Logout did not log anybody out.

import { signOut } from 'next-auth/react';

/** Expire the httpOnly cookies a page script cannot reach.
 *
 * Exported on its own because the session-expiry guard needs it too: an
 * expired token used to call signOut() alone and leave the `session` cookie
 * behind, which the middleware accepts by itself.
 */
export async function clearSessionCookies() {
  try {
    await fetch('/api/auth/clear-session', { method: 'POST', credentials: 'include' });
  } catch {
    // Offline, or the route is unreachable. Never a reason to keep somebody
    // on a page they asked to leave.
  }
}

/**
 * Sign out, properly, then land on the login page.
 *
 * Order matters. The server route expires the httpOnly cookies first, because
 * a page script cannot reach them and `signOut()` does not know about them.
 * Only then is the NextAuth token cleared and the browser sent away, so there
 * is no moment where the middleware sees a half-cleared state and bounces the
 * person back into the account they are trying to leave.
 */
export async function logOut() {
  try {
    localStorage.removeItem('userProfile');
    localStorage.removeItem('authToken');
    sessionStorage.clear();
  } catch {
    // A private window, or storage refused. Never a reason to stay signed in.
  }

  await clearSessionCookies();

  try {
    await signOut({ redirect: false });
  } catch {
    /* see above */
  }

  // A full load rather than a router push, so nothing in memory survives:
  // a cached session, a half-rendered page, somebody's name in a header.
  window.location.href = '/login';
}
