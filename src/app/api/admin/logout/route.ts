import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * POST /api/admin/logout
 * Simple logout - just clear the cookie
 */
export async function POST() {
  try {
    console.log("[SIMPLE_LOGOUT] Logging out");

    // Clear cookie
    cookies().delete("admin-session");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SIMPLE_LOGOUT] Error:", error);
    return NextResponse.json(
      { error: "Çıkış yapılırken bir hata oluştu" },
      { status: 500 },
    );
  }
}
