/**
 * CSRF Token Endpoint
 *
 * GET /api/auth/csrf - Get CSRF token for client-side requests
 *
 * OWASP A01:2021 - Broken Access Control
 * Skill: vulnerability-scanner → CSRF protection
 */

import { NextResponse } from "next/server";
import { setCSRFToken } from "@/lib/auth/csrf";

export async function GET() {
  try {
    const token = await setCSRFToken();

    return NextResponse.json({
      csrfToken: token,
    });
  } catch (error) {
    console.error("CSRF token generation error:", error);

    return NextResponse.json(
      {
        error: "CSRF token oluşturulamadı",
      },
      { status: 500 },
    );
  }
}
