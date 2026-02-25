/**
 * Next.js Middleware
 * Applies security headers and admin page authentication
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  addSecurityHeaders,
  addApiSecurityHeaders,
} from "./middleware/security-headers";
import { jwtVerify } from "jose";

// CRITICAL: JWT_SECRET must be set in production
// Using fallback in development is acceptable but not in production
const getJwtSecret = (): Uint8Array => {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXTAUTH_SECRET must be set in production environment",
      );
    }
    // Development-only fallback with clear warning
    console.warn(
      "⚠️ WARNING: Using dev-only JWT secret. Set NEXTAUTH_SECRET in production!",
    );
    return new TextEncoder().encode("dev-only-secret-change-in-production");
  }
  return new TextEncoder().encode(secret);
};

const JWT_SECRET = getJwtSecret();

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // IndexNow key verification: serve key file dynamically
  // This bypasses Cloudflare challenges/caching that block Bing's key verification bot
  const uuidMatch = pathname.match(
    /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.txt$/i,
  );
  if (uuidMatch) {
    const requestedKey = uuidMatch[1].toLowerCase();
    return new NextResponse(requestedKey, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "X-Robots-Tag": "noindex",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // Skip middleware for:
  // - Login page
  // - Auth API routes (NextAuth handles its own security)
  // - Public API routes
  // - Static files
  const isPublicRoute =
    pathname === "/admin/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth/") || // NextAuth routes
    pathname.startsWith("/api/public/"); // Public API routes

  // Only check auth for admin PAGES (not API routes)
  // Admin API routes handle their own auth via auth() function
  if (
    pathname.startsWith("/admin") &&
    !isPublicRoute &&
    !pathname.startsWith("/admin/api")
  ) {
    const token = request.cookies.get("admin-session")?.value;

    if (!token) {
      console.log("[MIDDLEWARE] No token, redirecting to login");
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      console.log("[MIDDLEWARE] Token valid, allowing access to:", pathname);
    } catch (error) {
      console.log("[MIDDLEWARE] Invalid token, redirecting to login");
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Create response
  const response = NextResponse.next();

  // Add security headers to all responses
  const secureResponse = addSecurityHeaders(request, response);

  // Add additional API security headers for API routes
  if (pathname.startsWith("/api/")) {
    return addApiSecurityHeaders(secureResponse);
  }

  return secureResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - sw.js (service worker)
     * - manifest.json (PWA manifest)
     */
    "/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)",
  ],
};
