import { NextRequest, NextResponse } from "next/server";
import { processGoogleIndexingBatches } from "@/lib/google-indexing-batch-worker";

/**
 * Google Indexing Batch Cron Job
 *
 * Bu endpoint, Vercel Cron tarafından her saat çalıştırılır.
 *
 * Vercel Dashboard'da cron job ayarı:
 * - Path: /api/cron/google-indexing-batch
 * - Schedule: 0 * * * * (Her saat başı)
 *
 * Alternatif olarak vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/google-indexing-batch",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional but recommended)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    console.log("[Cron] Google Indexing Batch job started");

    // Process batches
    const result = await processGoogleIndexingBatches();

    console.log("[Cron] Google Indexing Batch job completed:", result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error) {
    console.error("[Cron] Google Indexing Batch job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

// Allow POST as well (for manual triggers)
export async function POST(request: NextRequest) {
  return GET(request);
}
