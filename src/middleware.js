import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedRoutes = ["/events", "/anime", "/user-profile", "/edit-user-profile", "/teams", "/edit-team-profile"];  
const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];

// Helper function to get cookies from request
function getCookie(req, name) {
  const cookie = req.cookies.get(name);
  return cookie?.value;
}

export async function middleware(req) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  const isPublicRoute = publicRoutes.some(route => path === route);
  
  // Handle OAuth error redirects first
  const { searchParams } = req.nextUrl;
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl");
  
  // If we have an OAuth error and a localhost callback, fix it
  if (error === "OAuthCallback" && callbackUrl && callbackUrl.includes("localhost")) {
    // Get host from request or use NEXTAUTH_URL
    const host = req.headers.get("host") || new URL(process.env.NEXTAUTH_URL).host;
    const protocol = host.includes("localhost") ? "http" : "https";
    const productionDomain = `${protocol}://${host}`;
    
    const fixedCallbackUrl = callbackUrl.replace(/http:\/\/localhost:\d+/g, productionDomain);
    const newUrl = new URL(req.url);
    newUrl.searchParams.set("callbackUrl", fixedCallbackUrl);
    return NextResponse.redirect(newUrl);
  }

  const nextAuthToken = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const sessionCookie = getCookie(req, "session");
  const isLoggedOutCookie = getCookie(req, "isLoggedOut") === "true";
  
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
    console.log("Redirecting to events (already authenticated)");
    return NextResponse.redirect(new URL("/events", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)', // Exclude API and static routes
  ],
};