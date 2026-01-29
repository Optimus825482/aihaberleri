import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecentAuditLogs, getAuditStats } from "@/lib/audit";

/**
 * GET /api/admin/audit-logs
 * Get audit logs (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only SUPER_ADMIN and ADMIN can view audit logs
    if (!["SUPER_ADMIN", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const statsOnly = searchParams.get("stats") === "true";

    if (statsOnly) {
      const stats = await getAuditStats(7);
      return NextResponse.json(stats);
    }

    const logs = await getRecentAuditLogs(limit);

    return NextResponse.json({
      logs,
      total: logs.length,
    });
  } catch (error) {
    console.error("[AUDIT_LOGS_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
