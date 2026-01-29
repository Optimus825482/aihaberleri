import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale, localePrefix } from "./i18n";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

const intlMiddleware = createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale,

  // Only add prefix for non-default locale
  // TR: / → no prefix
  // EN: /en/ → with prefix
  localePrefix,
});

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Admin Route Protection
  if (pathname.startsWith("/admin")) {
    // Exclude login page from protection to prevent loop
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const session = await auth();
    if (!session) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("callbackUrl", encodeURI(pathname));
      return NextResponse.redirect(url);
    }
  }

  // 2. Internationalization Middleware
  return intlMiddleware(req);
}


export const config = {
  // Match only internationalized pathnames
  // Exclude: api, admin, _next, static files, etc.
  matcher: [
    // Middleware disabled to fix 404s on static routes
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};

