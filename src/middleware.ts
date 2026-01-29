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

  // Handle Admin Routes first
  if (pathname.startsWith("/admin")) {
    const isLoggedIn = !!req.auth;
    const isLoginPage = pathname === "/admin/login";

    if (!isLoggedIn && !isLoginPage) {
      const url = new URL("/admin/login", req.url);
      url.searchParams.set("callbackUrl", encodeURI(pathname));
      return NextResponse.redirect(url);
    }
    
    // If logged in and on login page, redirect to dashboard
    if (isLoggedIn && isLoginPage) {
        return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  }

  // Handle i18n for public routes
  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};


