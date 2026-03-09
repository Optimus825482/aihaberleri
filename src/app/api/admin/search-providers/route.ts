import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getWhoogleStats } from "@/lib/searxng";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdminAuth();
  if (session instanceof Response) {
    return session;
  }

  const whoogle = getWhoogleStats();

  return NextResponse.json(
    {
      success: true,
      data: {
        whoogle,
        timestamp: new Date().toISOString(),
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    },
  );
}
