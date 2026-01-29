import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale, localePrefix } from "./i18n";
import { NextResponse } from "next/server";

// 1. Create Auth Middleware (Edge Compatible)
const { auth } = NextAuth(authConfig);

// 2. Create Intl Middleware
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix,
});

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // files with extensions
  ) {
    return NextResponse.next();
  }

  // Handle Admin Routes
  if (pathname.startsWith("/admin")) {
    const isLoggedIn = !!req.auth;
    const isLoginPage = pathname === "/admin/login";

    // Redirect to login if not authenticated (except on login page)
    if (!isLoggedIn && !isLoginPage) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("callbackUrl", encodeURI(pathname));
      return NextResponse.redirect(url);
    }

    // Redirect to dashboard if already logged in and on login page
    if (isLoggedIn && isLoginPage) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Allow admin routes to proceed
    return NextResponse.next();
  }

  // Handle i18n for public routes
  try {
    return intlMiddleware(req);
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Match all pathnames except for:
    // - API routes
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico, sitemap.xml, robots.txt (public files)
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*|sw.js|manifest.json).*)",
  ],
};
