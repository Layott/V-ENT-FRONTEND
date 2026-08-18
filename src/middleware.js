import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = [
  "/home",
  "/events",
  "/anime",
  "/user-profile",
  "/edit-user-profile",
  "/onboarding",
  "/teams",
  "/edit-team-profile",
  "/tournaments/create-tournament",
  "/tournaments/drafts",
  "/tournaments/register-tournament",
  "/tournaments/my-tournaments",
  "/wallets",
  "/production",
  "/settings",
  "/notifications",
  "/disputes",
];
const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

// Redirect to a path on whatever host the visitor is actually using.
//
// `new URL(path, req.url)` produces an ABSOLUTE Location, and behind nginx
// req.url carries the internal listen address, so production was answering
// protected routes with `Location: https://localhost:3000/login`. Any browser
// following that - including Next's own prefetch of a protected link - tried to
// reach the user's own machine.
//
// A relative Location is valid per RFC 7231 and the browser resolves it against
// the current origin, so this cannot drift from the public hostname.
function redirectTo(path) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

export default async function middleware(req) {
  const path = req.nextUrl.pathname;

  // ── Admin route protection ──────────────────────────────────────
  const isAdminRoute = path.startsWith('/admin');
  const isAdminLoginRoute = path === '/admin/login';
  if (isAdminRoute && !isAdminLoginRoute) {
    const adminToken = cookies().get('adminToken')?.value;
    if (!adminToken) {
      return redirectTo('/admin/login');
    }
  }

  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => path === route);

  const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const sessionCookie = cookies().get("session")?.value;
  
  const isLoggedOutCookie = cookies().get("isLoggedOut")?.value === "true";
  
  if (isLoggedOutCookie) {
    const response = redirectTo('/login');
    response.cookies.delete("isLoggedOut");
    return response;
  }

  if (isProtectedRoute && !nextAuthToken && !sessionCookie) {
    return redirectTo('/login');
  }

  if (isPublicRoute && (nextAuthToken || sessionCookie)) {
    const fromEditProfile = req.nextUrl.searchParams.get("from") === "edit-profile";

    // Allow access to forgot-password if came from edit profile
    if (path === "/forgot-password" && fromEditProfile) {
      return NextResponse.next();
    }
    return redirectTo('/home');
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Exclude API and static routes
  ],
};
