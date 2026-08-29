// Expire the cookies that keep somebody signed in.
//
// `signOut()` from next-auth clears the NextAuth JWT and nothing else. The
// middleware accepts EITHER that token OR a `session` cookie:
//
//     if (isProtectedRoute && !nextAuthToken && !sessionCookie) -> /login
//     if (isPublicRoute    && (nextAuthToken || sessionCookie)) -> /home
//
// So after pressing Logout the `session` cookie survived and the person was
// still signed in: /login bounced them straight back to /home. Watched
// happening, not reasoned about - four presses of Logout and three cookie
// clears from the console left the account open, because the cookie is
// httpOnly and a page script cannot touch it.
//
// The `isLoggedOut` cookie the logout handlers set is a sixty second
// band-aid over the same hole: it bounces one navigation and then expires,
// leaving a signed-in session behind on the device.
//
// That matters most on exactly the devices this platform is used on. A phone
// handed to a friend at an event, a machine in an internet cafe: Logout has to
// mean logged out.

import { NextResponse } from 'next/server';

// Everything that can hold a signed-in state. Named rather than wildcarded,
// because expiring a cookie nobody knows the purpose of is how a language
// preference or a cart quietly disappears.
const CREDENTIAL_COOKIES = [
  'session',
  'next-auth.session-token',
  '__Secure-next-auth.session-token',
  'next-auth.csrf-token',
  '__Host-next-auth.csrf-token',
  'isLoggedOut',
];

export async function POST() {
  const response = NextResponse.json({ status: 'success', data: {}, message: 'Signed out.' });
  for (const name of CREDENTIAL_COOKIES) {
    // Deleting by name only misses a cookie written with an explicit path, so
    // it is expired at the root as well.
    response.cookies.set(name, '', { path: '/', maxAge: 0 });
    response.cookies.delete(name);
  }
  return response;
}
