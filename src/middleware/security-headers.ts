/**
 * Security Headers Middleware
 *
 * ⚠️ CRITICAL: FULLY OPEN FOR GOOGLE AND ALL SEARCH ENGINES
 *
 * This configuration is INTENTIONALLY PERMISSIVE to ensure:
 * - Google AdSense works without any restrictions
 * - Google Analytics tracks properly
 * - Google Search Console can access all content
 * - All search engines (Google, Bing, Yandex, etc.) can crawl freely
 * - No CSP violations for any Google services
 *
 * Security measures are MINIMAL to prioritize SEO and monetization.
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Content Security Policy - FULLY OPEN
 * Allows ALL HTTPS sources for maximum compatibility with Google services
 */
const CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for Next.js dev mode
    "https:", // Allow ALL HTTPS scripts (Google, Bing, etc.)
    "http:", // Allow HTTP for development
  ],
  "style-src": [
    "'self'",
    "'unsafe-inline'", // Required for styled-components, Tailwind
    "https:", // Allow ALL HTTPS styles
  ],
  "img-src": [
    "'self'",
    "data:",
    "https:", // Allow ALL HTTPS images
    "http:", // Allow HTTP images
    "blob:",
  ],
  "font-src": [
    "'self'",
    "data:",
    "https:", // Allow ALL HTTPS fonts
  ],
  "connect-src": [
    "'self'",
    "https:", // Allow ALL HTTPS connections (Google Analytics, AdSense, Search Console, etc.)
    "http:", // Allow HTTP for development
    "wss:", // Allow ALL secure WebSockets
    "ws:", // Allow WebSockets for development
  ],
  "frame-src": [
    "'self'",
    "https:", // Allow ALL HTTPS iframes (Google Ads, AdSense, etc.)
    "http:", // Allow HTTP for development
  ],
  "frame-ancestors": ["'self'"], // Allow embedding from same origin (changed from 'none')
  "base-uri": ["'self'"],
  "form-action": ["'self'", "https:"], // Allow form submissions to HTTPS
  "object-src": ["'none'"],
  "media-src": ["'self'", "https:", "data:", "blob:"], // Allow media from anywhere
  "worker-src": ["'self'", "blob:"], // Allow service workers
  "child-src": ["'self'", "https:", "blob:"], // Allow child contexts
  // NO upgrade-insecure-requests - Allow mixed content for Google services
};

/**
 * Build CSP header string from directives
 */
function buildCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(" ")}`;
    })
    .join("; ");
}

/**
 * Permissions Policy
 * Controls which browser features can be used
 */
const PERMISSIONS_POLICY = [
  "geolocation=()",
  "microphone=()",
  "camera=()",
  "payment=()",
  "usb=()",
  "magnetometer=()",
  "gyroscope=()",
  "accelerometer=()",
].join(", ");

/**
 * Add security headers to response
 * OWASP A02: Security Misconfiguration - Comprehensive headers
 */
export function addSecurityHeaders(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  // X-Frame-Options: REMOVED - Allow Google and search engines to frame content
  // response.headers.set("X-Frame-Options", "DENY");

  // X-Content-Type-Options: Prevents MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // X-XSS-Protection: Legacy XSS protection (still useful for older browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Strict-Transport-Security: Forces HTTPS (only in production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  // Content-Security-Policy: FULLY OPEN for Google and all search engines
  response.headers.set("Content-Security-Policy", buildCSP());

  // Referrer-Policy: OPEN - Allow full referrer for analytics and tracking
  response.headers.set("Referrer-Policy", "no-referrer-when-downgrade");

  // Permissions-Policy: REMOVED - Allow all features for Google services
  // response.headers.set("Permissions-Policy", PERMISSIONS_POLICY);

  // X-DNS-Prefetch-Control: ON - Allow DNS prefetching for performance
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // X-Permitted-Cross-Domain-Policies: OPEN - Allow cross-domain
  response.headers.set("X-Permitted-Cross-Domain-Policies", "all");

  // X-Robots-Tag: ALLOW ALL search engines
  response.headers.set("X-Robots-Tag", "index, follow, all");

  return response;
}

/**
 * Security headers for API routes
 * Additional headers specific to API responses
 */
export function addApiSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent caching of sensitive API responses
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");

  // CORS headers (if needed)
  // response.headers.set("Access-Control-Allow-Origin", "https://yourdomain.com");
  // response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  // response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return response;
}
