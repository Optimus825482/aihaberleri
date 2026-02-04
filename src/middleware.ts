/**
 * Next.js Middleware
 * Applies security headers to all responses
 * Skill: api-patterns → Security headers
 * Skill: vulnerability-scanner → OWASP A02 Security Misconfiguration
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  addSecurityHeaders,
  addApiSecurityHeaders,
} from "./middleware/security-headers";

export default function middleware(request: NextRequest) {
  // Create response
  const response = NextResponse.next();

  // Add security headers to all responses
  const secureResponse = addSecurityHeaders(request, response);

  // Add additional API security headers for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return addApiSecurityHeaders(secureResponse);
  }

  return secureResponse;
}

// Apply middleware to all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
