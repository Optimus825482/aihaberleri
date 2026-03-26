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
import { REDIRECT_MAP } from "./data/redirect-map";
import { getJwtSecret } from "./lib/auth/jwt-secret";

const JWT_SECRET = getJwtSecret();

// Dead pages that Google still crawls — return 410 Gone so they get deindexed
const GONE_PAGES = new Set([
  "/best-open-source-ai-gateways",
  "/derin-ogrenme-guvenilirligi",
  "/ai-automation-python",
  "/ai-psikolojisi-nedir",
  "/ai-guvenilirlik-olcume-2026",
  "/ai-autonomy-risks",
  "/sarvam-30b-karsilastirma",
  "/2026-ai-forecast-report",
  "/python-financial-modeling-2026",
  "/openai-codex-nedir",
  "/github-copilot-price-analysis",
  "/data-preprocessing-guide",
  "/google-ai-sorumluluk-politikasi",
  "/gpt-4o-vs-deepseek-v4",
  "/yapay-zeka-not-alma-araclari",
  "/yapay-zeka-kodlama-araçlari",
  "/blog/ai-development-trends-2026",
  "/category/saglik-yz",
  "/category/bilgisayarli-goru",
  "/en/category/yapay-zeka-regulasyon",
  "/hakkimizda",
]);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Return 410 Gone for dead pages — tells Google to deindex them
  if (GONE_PAGES.has(pathname)) {
    return new NextResponse("Gone", { status: 410 });
  }

  // IndexNow key verification: serve key file dynamically
  // This bypasses Cloudflare challenges/caching that block Bing's key verification bot
  // Supports both UUID format (with dashes) and plain hex (32 chars, no dashes)
  const keyFileMatch = pathname.match(
    /^\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{32})\.txt$/i,
  );
  if (keyFileMatch) {
    const requestedKey = keyFileMatch[1].toLowerCase();
    return new NextResponse(requestedKey, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        // Aggressive caching — Cloudflare edge'de cache'lesin ki
        // IndexNow/Bing verification botu challenge'a takılmasın
        "Cache-Control":
          "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
        "CDN-Cache-Control": "public, max-age=604800",
        "Cloudflare-CDN-Cache-Control": "public, max-age=604800",
        "X-Robots-Tag": "noindex",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // www → non-www redirect (301)
  const host = request.headers.get("host") || "";
  if (host.startsWith("www.")) {
    const newUrl = new URL(request.url);
    newUrl.host = host.replace("www.", "");
    return NextResponse.redirect(newUrl, 301);
  }

  // 404 redirect map — old slugs → new slugs (301 permanent)
  const redirectDest = REDIRECT_MAP.get(pathname);
  if (redirectDest) {
    const newUrl = new URL(redirectDest, request.url);
    return NextResponse.redirect(newUrl, 301);
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
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(token, JWT_SECRET);
    } catch (error) {
      console.warn("[MIDDLEWARE] Invalid token, redirecting to login");
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Create response
  const response = NextResponse.next();

  // noindex for search pages (prevent duplicate content + 403 from Cloudflare bot protection)
  if (pathname.startsWith("/search") || pathname.startsWith("/en/search")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

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
