import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { getPipelineMetrics } from "@/lib/pipeline-tracer";

export async function GET(request: Request) {
  const [session, adminSession] = await Promise.all([
    auth(),
    getAdminSession(),
  ]);
  if (!session && !adminSession) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7");

  try {
    const metrics = await getPipelineMetrics(days);
    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Pipeline metrics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline metrics" },
      { status: 500 },
    );
  }
}
