/**
 * Session Management Endpoint
 *
 * GET /api/auth/session - Get current session
 * DELETE /api/auth/session - Logout (revoke session)
 *
 * OWASP A07:2021 - Identification and Authentication Failures
 * Skill: api-patterns → Session management
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCurrentSession,
  validateSession,
  revokeAllSessions,
} from "@/lib/auth/session";
import { signOut } from "@/lib/auth";

/**
 * GET - Get current session info
 */
export async function GET() {
  try {
    const validation = await validateSession();

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: validation.error,
          needsRefresh: validation.needsRefresh,
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      session: validation.session,
      needsRefresh: validation.needsRefresh,
    });
  } catch (error) {
    console.error("Session validation error:", error);

    return NextResponse.json(
      {
        error: "Session doğrulanamadı",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE - Logout (revoke current session)
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Aktif session bulunamadı",
        },
        { status: 401 },
      );
    }

    // Sign out
    await signOut();

    return NextResponse.json({
      success: true,
      message: "Çıkış yapıldı",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        error: "Çıkış yapılırken hata oluştu",
      },
      { status: 500 },
    );
  }
}

/**
 * POST - Revoke all sessions (logout from all devices)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        {
          error: "Aktif session bulunamadı",
        },
        { status: 401 },
      );
    }

    // Revoke all sessions
    await revokeAllSessions(session.user.id);

    // Sign out current session
    await signOut();

    return NextResponse.json({
      success: true,
      message: "Tüm cihazlardan çıkış yapıldı",
    });
  } catch (error) {
    console.error("Revoke all sessions error:", error);

    return NextResponse.json(
      {
        error: "Session'lar iptal edilirken hata oluştu",
      },
      { status: 500 },
    );
  }
}
