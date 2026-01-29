import createMiddleware from "next-intl/middleware";
import { locales, defaultLocale, localePrefix } from "./i18n";
import { NextRequest, NextResponse } from "next/server";
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

  // Apply intl middleware first
  const intlResponse = intlMiddleware(req);

  // Session timeout check for admin routes
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = await auth();

    if (!session) {
      // Not authenticated - redirect to login
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }

    // Check session timeout (30 minutes = 1800000ms)
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const lastActivity = req.cookies.get("last_activity")?.value;

    if (lastActivity) {
      const timeSinceLastActivity = Date.now() - parseInt(lastActivity, 10);

      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        // Session timed out - clear and redirect
        const response = NextResponse.redirect(
          new URL("/admin/login?timeout=true", req.url),
        );
        response.cookies.delete("last_activity");
        return response;
      }
    }

    // Update last activity timestamp
    const response = intlResponse || NextResponse.next();
    response.cookies.set("last_activity", Date.now().toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_TIMEOUT / 1000, // 30 minutes in seconds
    });

    return response;
  }

  return intlResponse;
}

export const config = {
  // Match only internationalized pathnames and admin routes
  matcher: [
    "/admin/:path*",
    // Exclude static files
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|robots.txt|sitemap.xml).*)",
  ],
};
