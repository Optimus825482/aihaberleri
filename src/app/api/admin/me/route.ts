import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/me
 * Get current user from session
 */
export async function GET() {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    return NextResponse.json({
      success: true,
      user: session,
    });
  } catch (error) {
    console.error("[GET_ME] Error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
