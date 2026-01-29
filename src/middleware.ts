import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale, localePrefix } from "./i18n";
import { NextRequest } from "next/server";

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Only add prefix for non-default locale
  // TR: / → no prefix
  // EN: /en/ → with prefix
  localePrefix,

  // Always return a locale (tr as default)
  localeDetection: true,

  // Alternative locales (fallback chain)
  alternateLinks: true,
});

export default function middleware(req: NextRequest) {
  // Apply intl middleware with locale detection
  return intlMiddleware(req);
}

export const config = {
  // Match only internationalized pathnames (exclude API and admin)
  matcher: [
    // Match all pathnames except those starting with:
    // - api (API routes)
    // - admin (admin panel - no i18n)
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - Files with extensions (e.g., .png, .jpg, .svg)
    // - robots.txt, sitemap.xml
    "/((?!api|admin|_next/static|_next/image|favicon.ico|.*\\..*|robots.txt|sitemap.xml).*)",
  ],
};
