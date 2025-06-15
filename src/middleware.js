import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = ["/events", "/anime", "/user-profile", "/edit-user-profile","/teams","/edit-team-profile"];  
const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

export default async function middleware(req) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => path === route);

  const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const sessionCookie = cookies().get("session")?.value;
  
  const isLoggedOutCookie = cookies().get("isLoggedOut")?.value === "true";
  
  console.log("Path:", path);
  console.log("NextAuth Token:", nextAuthToken ? "exists" : "none");
  console.log("Session Cookie:", sessionCookie ? "exists" : "none");
  console.log("isLoggedOut Cookie:", isLoggedOutCookie ? "true" : "false");

  if (isLoggedOutCookie) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("isLoggedOut");
    return response;
  }

  if (isProtectedRoute && !nextAuthToken && !sessionCookie) {
    console.log("Redirecting to login (no authentication)");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isPublicRoute && (nextAuthToken || sessionCookie)) {
    const fromEditProfile = req.nextUrl.searchParams.get("from") === "edit-profile";

  // Allow access to forgot-password if came from edit profile
  if (path === "/forgot-password" && fromEditProfile) {
    console.log("Allowed access to /forgot-password from edit-profile despite auth.");
    return NextResponse.next();
  }
    console.log("Redirecting to events (already authenticated)");
    return NextResponse.redirect(new URL("/user-profile", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Exclude API and static routes
  ],
};
