import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Matched with startsWith, so a bare "/events" here would also gate
// "/events/lagos-anime-con". That is what it used to do, and it meant every
// event and team page - the pages carrying the structured data, the ones the
// sitemap advertises - answered a crawler with a redirect to /login. Public
// content nobody outside can read is content that never ranks.
//
// So browsing is public, in line with tournaments, which were already public.
// Doing anything is not: creating, registering, editing and anything with money
// or personal data on it stays listed below.
const protectedRoutes = [
  "/home",
  "/anime",
  "/user-profile",
  "/edit-user-profile",
  "/onboarding",
  "/edit-team-profile",
  "/teams/create-team",
  "/events/create-event",
  "/events/my-tickets",
  "/events/attendees",
  "/events/register-event",
  "/events/vendor-shop/vendor",
  "/tournaments/create-tournament",
  "/tournaments/drafts",
  "/tournaments/register-tournament",
  "/tournaments/my-tournaments",
  "/tournaments/manage",
  "/community/dm",
  "/wallets",
  "/production",
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
  const path = req.nextUrl.pathname;

  // ── Admin route protection ──────────────────────────────────────
  const isAdminRoute = path.startsWith('/admin');
  const isAdminLoginRoute = path === '/admin/login';
  if (isAdminRoute && !isAdminLoginRoute) {
    const adminToken = cookies().get('adminToken')?.value;
    if (!adminToken) {
      return redirectTo('/admin/login', req);
    }
  }

  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => path === route);

  const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const sessionCookie = cookies().get("session")?.value;
  
  const isLoggedOutCookie = cookies().get("isLoggedOut")?.value === "true";
  
  if (isLoggedOutCookie) {
    const response = redirectTo('/login', req);
    response.cookies.delete("isLoggedOut");
    return response;
  }

  if (isProtectedRoute && !nextAuthToken && !sessionCookie) {
    return redirectTo('/login', req);
  }

  if (isPublicRoute && (nextAuthToken || sessionCookie)) {
    const fromEditProfile = req.nextUrl.searchParams.get("from") === "edit-profile";

    // Allow access to forgot-password if came from edit profile
    if (path === "/forgot-password" && fromEditProfile) {
      return NextResponse.next();
    }
    return redirectTo('/home', req);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Exclude API and static routes
  ],
};
