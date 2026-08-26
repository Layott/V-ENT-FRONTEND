import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  DEFAULT_LOCALE, LOCALES as LOCALE_CODES, LOCALE_COOKIE, LOCALE_HEADER, PREFIXED,
  localeForCountry, localePath, preferredLocale, splitLocale,
} from "@/lib/locale";

// Matched with startsWith, so a bare "/events" here would also gate
// "/events/lagos-anime-con". That is what it used to do, and it meant every
// event and team page - the pages carrying the structured data, the ones the
// sitemap advertises - answered a crawler with a redirect to /login. Public
// content nobody outside can read is content that never ranks.
//
// So browsing is public, in line with tournaments, which were already public.
// Doing anything is not: creating, registering, editing and anything with money
// or personal data on it stays listed below.
//
// The test for this list is "does visiting it do something, or show somebody
// else's private data". A profile, a team, a storefront, a thread and a
// placeholder page all fail that test and are public - they are also the pages
// worth being found in a search, which is the other half of the same decision.
// A wallet, an inbox, a draft and every create form pass it and stay here.
const protectedRoutes = [
  "/home",
  "/edit-user-profile",
  "/onboarding",
  "/edit-team-profile",
  "/teams/create-team",
  "/events/create-event",
  "/events/my-tickets",
  "/events/attendees",
  "/events/register-event",
  "/tournaments/create-tournament",
  "/tournaments/drafts",
  "/tournaments/register-tournament",
  "/tournaments/my-tournaments",
  "/tournaments/manage",
  "/community/dm",
  "/community/scrim/create",
  "/wallets",
  "/settings",
  "/notifications",
  "/disputes",
];
const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

// Redirect to a path on the host the visitor is actually using.
//
// `new URL(path, req.url)` uses Next's internal listen address behind a proxy,
// so production answered protected routes with
// `Location: https://localhost:3000/login`. A relative Location is not an
// option either - Next validates the header with `new URL()` and throws
// "Invalid URL" - so the absolute URL is rebuilt from the forwarding headers
// nginx sets, falling back to the request's own origin when there is no proxy.
function redirectTo(path, req) {
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || req.nextUrl.protocol.replace(':', '');
  const base = host ? `${proto}://${host}` : req.nextUrl.origin;
  return NextResponse.redirect(new URL(path, base));
}

export default async function middleware(req) {
  // ── Language prefix ─────────────────────────────────────────────
  //
  // `/fr/tournaments` is the French address for `/tournaments`. The prefix is
  // stripped here and the locale carried on a header, so the 81 routes
  // underneath never learn that prefixes exist and nothing had to move.
  //
  // Stripped BEFORE the auth checks below, deliberately: those match on
  // `path.startsWith('/settings')`, so a prefixed `/fr/settings` would sail
  // straight past every one of them.
  const { locale, path: unprefixed } = splitLocale(req.nextUrl.pathname);
  const hasPrefix = locale !== DEFAULT_LOCALE;
  const path = unprefixed;

  // Keep somebody in their language, whichever link they followed.
  //
  // Two jobs in one place. On a first visit with no stated preference, a French
  // or Portuguese browser is sent to its own address. After that the cookie
  // carries the choice, so a plain <Link href="/tournaments"> inside the app -
  // and there are hundreds of them - lands on /fr/tournaments rather than
  // quietly dropping the person back into English. Doing it here rather than
  // rewriting every Link means no link can be forgotten.
  //
  // A crawler is never redirected: it sends no cookie and no Accept-Language,
  // so it stays on the English URL and indexes it. Auto-redirecting crawlers is
  // how a site ends up with one language indexed and the others invisible.
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  if (!hasPrefix && req.method === 'GET' && !path.startsWith('/api')) {
    const wanted = LOCALE_CODES.includes(cookieLocale)
      ? cookieLocale
      : (preferredLocale(req.headers.get('accept-language'))
        || localeForCountry(req.headers.get('x-vercel-ip-country')
          || req.headers.get('cf-ipcountry')));

    if (wanted && PREFIXED.includes(wanted)) {
      const res = redirectTo(
        localePath(path, wanted) + (req.nextUrl.search || ''), req,
      );
      // Written on the way past so this happens once, not on every request.
      res.cookies.set(LOCALE_COOKIE, wanted, {
        path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax',
      });
      return res;
    }
  }

  // ── Admin route protection ──────────────────────────────────────
  const isAdminRoute = path.startsWith('/admin');
  const isAdminLoginRoute = path === '/admin/login';
  if (isAdminRoute && !isAdminLoginRoute) {
    const adminToken = cookies().get('adminToken')?.value;
    if (!adminToken) {
      return redirectTo('/admin/login', req);   // admin is English only
    }
  }

  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => path === route);

  const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const sessionCookie = cookies().get("session")?.value;
  
  const isLoggedOutCookie = cookies().get("isLoggedOut")?.value === "true";
  
  if (isLoggedOutCookie) {
    const response = redirectTo(localePath('/login', locale), req);
    response.cookies.delete("isLoggedOut");
    return response;
  }

  if (isProtectedRoute && !nextAuthToken && !sessionCookie) {
    // Localised, so somebody reading in French is not dropped onto an English
    // sign-in page halfway through what they were doing.
    return redirectTo(localePath('/login', locale), req);
  }

  if (isPublicRoute && (nextAuthToken || sessionCookie)) {
    const fromEditProfile = req.nextUrl.searchParams.get("from") === "edit-profile";

    // Allow access to forgot-password if came from edit profile
    if (path === "/forgot-password" && fromEditProfile) {
      return NextResponse.next();
    }
    return redirectTo(localePath('/home', locale), req);
  }

  return withLocale(req, locale, hasPrefix);
}

/**
 * Serve the unprefixed route, and tell it which language it is being read in.
 *
 * A rewrite rather than a redirect: the address the person sees stays
 * `/fr/tournaments` - which is the entire point of having the prefix - while
 * the route that renders is the one that already exists.
 */
function withLocale(req, locale, hasPrefix) {
  // On the REQUEST, not the response.
  //
  // generateMetadata reads request headers. Setting this on the response only
  // meant currentLocale() saw nothing and every locale page canonicalised to
  // the English URL - which tells a search engine the French page is a
  // duplicate and should not be indexed at all, the exact opposite of why the
  // prefixes exist.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(LOCALE_HEADER, locale);

  // The rewrite target has to be an origin that actually answers.
  //
  // Behind nginx this app is reached at https://v-ent.co and listens on
  // 127.0.0.1:3000. Next builds `nextUrl` from its own listen address but
  // takes the scheme from X-Forwarded-Proto, so the origin it hands you is one
  // that exists nowhere: `https://localhost:3000`. Next emits the rewrite as
  // that absolute URL and then proxies to it - writing TLS at a plain HTTP
  // port. EPROTO, and a 500 on every locale URL while the unprefixed routes
  // were fine, because only the prefixed ones rewrite.
  //
  // Two things that do not fix it, both tried in production: cloning `nextUrl`
  // (the bad origin is what gets cloned) and setting `x-middleware-rewrite` by
  // hand on a `next()` response (Next does not honour it, 500 everywhere).
  //
  // What fixes it is forcing the internal hop back to http when the host is
  // loopback. The scheme the visitor used is nginx's business and is already
  // carried on X-Forwarded-Proto; this hop never speaks TLS.
  let res;
  if (hasPrefix) {
    const target = req.nextUrl.clone();
    target.pathname = req.nextUrl.pathname.replace(`/${locale}`, '') || '/';
    if (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(target.host)) {
      target.protocol = 'http:';
    }
    res = NextResponse.rewrite(target, { request: { headers: requestHeaders } });
  } else {
    res = NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Also on the response, so a client that wants to know can read it.
  res.headers.set(LOCALE_HEADER, locale);
  if (hasPrefix) {
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax',
    });
  }
  return res;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Exclude API and static routes
  ],
};
