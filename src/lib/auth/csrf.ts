/**
 * CSRF Token Management
 *
 * OWASP A01:2021 - Broken Access Control
 * Double Submit Cookie Pattern
 *
 * Skill: vulnerability-scanner → CSRF protection
 * Skill: api-patterns → Security headers
 */

import { randomBytes } from "crypto";
import { cookies } from "next/headers";

/**
 * CSRF token generation
 */
export function generateCSRFToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Set CSRF token in cookie
 */
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();

  (await cookies()).set("csrf-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCSRFToken(): Promise<string | undefined> {
  return (await cookies()).get("csrf-token")?.value;
}

/**
 * Validate CSRF token
 */
export async function validateCSRFToken(headerToken: string): Promise<boolean> {
  const cookieToken = await getCSRFToken();

  if (!cookieToken || !headerToken) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}
