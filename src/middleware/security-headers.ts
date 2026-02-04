/**
 * Security Headers Middleware
 * Skill: api-patterns → Security headers
 * Skill: vulnerability-scanner → OWASP A02 Security Misconfiguration
 *
 * Implements comprehensive security headers for all responses
 */

import { NextRequest, NextResponse } from "next/server";

/**
 * Content Security Policy
 * Prevents XSS, clickjacking, and other code injection attacks
 */
const CSP_DIRECTIVES = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'", // Required for Next.js
    "'unsafe-eval'", // Required for Next.js dev mode
    "https://www.googletagmanager.com",
    "https://www.google-analytics.com",
    "https://pagead2.googlesyndication.com", // Google AdSense
    "https://static.cloudflareinsights.com", // Cloudflare Analytics
  ],
  "style-src": [
    "'self'",
    "'unsafe-inline'", // Required for styled-components, Tailwind
    "https://fonts.googleapis.com",
  ],
  "img-src": [
    "'self'",
    "data:",
    "https:",
    "blob:",
    "https://images.unsplash.com",
    "https://images.pexels.com",
    "https://image.pollinations.ai",
    "https://aihaberleri.org",
    "https://images.aihaberleri.org",
    "https://pub-32620931b6ce48bca2549881c536b806.r2.dev",
  ],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
  "connect-src": [
    "'self'",
    "https://www.google-analytics.com",
    "https://analytics.google.com", // Google Analytics collect endpoint
    "https://api.openai.com",
    "wss://aihaberleri.org", // WebSocket for real-time updates
    "ws://localhost:3000", // WebSocket for local development
  ],
  "frame-ancestors": ["'none'"], // Prevents clickjacking
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "object-src": ["'none'"],
  "upgrade-insecure-requests": [],
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
  // X-Frame-Options: Prevents clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // X-Content-Type-Options: Prevents MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // X-XSS-Protection: Legacy XSS protection (still useful for older browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Strict-Transport-Security: Forces HTTPS
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  // Content-Security-Policy: Comprehensive XSS protection
  response.headers.set("Content-Security-Policy", buildCSP());

  // Referrer-Policy: Controls referrer information
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions-Policy: Controls browser features
  response.headers.set("Permissions-Policy", PERMISSIONS_POLICY);

  // X-DNS-Prefetch-Control: Controls DNS prefetching
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // X-Permitted-Cross-Domain-Policies: Prevents Adobe Flash/PDF cross-domain
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");

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
