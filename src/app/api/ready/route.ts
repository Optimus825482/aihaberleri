import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Lightweight readiness endpoint for container health checks.
 * Keeps deployment probes independent from downstream service latency.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ready",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
