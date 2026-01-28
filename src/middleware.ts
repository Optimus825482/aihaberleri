import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale, localePrefix } from "./i18n";

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Only add prefix for non-default locale
  // TR: / → no prefix
  // EN: /en/ → with prefix
  localePrefix,
});

export const config = {
  // Match only internationalized pathnames
  // Exclude: api, admin, _next, static files, etc.
  matcher: [
    // Middleware disabled to fix 404s on static routes
  ],
};
