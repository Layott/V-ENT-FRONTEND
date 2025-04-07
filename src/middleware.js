import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Define routes that require authentication
const protectedRoutes = ["/events", "/anima", "/user-profile"];  
// Define routes that should redirect to dashboard if already authenticated
const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

export default async function middleware(req) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => path === route);

  // Check for session using both NextAuth and custom cookie methods
  const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const sessionCookie = cookies().get("session")?.value;
  
  // Check if user is logged out specifically (flags from logout action)
  const isLoggedOutCookie = cookies().get("isLoggedOut")?.value === "true";
  
  // For debugging
  console.log("Path:", path);
  console.log("NextAuth Token:", nextAuthToken ? "exists" : "none");
  console.log("Session Cookie:", sessionCookie ? "exists" : "none");
  console.log("isLoggedOut Cookie:", isLoggedOutCookie ? "true" : "false");

  // If logged out flag is set, clear it and redirect to login
  if (isLoggedOutCookie) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    // Clear the logged out cookie
    response.cookies.delete("isLoggedOut");
    return response;
  }

  // If trying to access protected route without authentication
  if (isProtectedRoute && !nextAuthToken && !sessionCookie) {
    console.log("Redirecting to login (no authentication)");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If logged in and trying to access login/register pages
  if (isPublicRoute && (nextAuthToken || sessionCookie)) {
    console.log("Redirecting to events (already authenticated)");
    return NextResponse.redirect(new URL("/events", req.url));
  }

  // Continue to the next middleware or request handler
  return NextResponse.next();
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Exclude API and static routes
  ],
};
