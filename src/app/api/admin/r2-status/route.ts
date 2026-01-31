import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/admin/r2-status
 * Check R2 storage configuration status
 */
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requiredVars = [
    "R2_ENDPOINT",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "R2_PUBLIC_URL",
  ];

  const status: Record<
    string,
    { set: boolean; value?: string; preview?: string }
  > = {};

  for (const key of requiredVars) {
    const value = process.env[key];
    status[key] = {
      set: !!value,
      // Show first/last 4 chars for secrets, full for non-secret
      preview: value
        ? key.includes("SECRET")
          ? `${value.slice(0, 4)}...${value.slice(-4)}`
          : value.length > 50
            ? `${value.slice(0, 50)}...`
            : value
        : undefined,
    };
  }

  const allConfigured = requiredVars.every((key) => !!process.env[key]);

  return NextResponse.json({
    configured: allConfigured,
    status,
    hint: allConfigured
      ? "R2 is properly configured ✅"
      : "Missing environment variables. Set them in Coolify Dashboard → Environment Variables, then Redeploy the App container.",
  });
}
