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
  // Match only internationalized pathnames and admin routes
  matcher: [
    "/admin/:path*",
    // Exclude static files
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|robots.txt|sitemap.xml).*)",
  ],
};
