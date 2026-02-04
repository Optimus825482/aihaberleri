/**
 * Process Winners API
 *
 * POST /api/ab-testing/process-winners
 * Checks all articles with A/B tests and locks winners where applicable
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processWinners } from "@/lib/title-ab-testing";

export async function POST(request: NextRequest) {
  try {
    // Auth check - admin only
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processWinners();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      locked: result.locked,
      message: `Processed ${result.processed} articles, locked ${result.locked} winners`,
    });
  } catch (error) {
    console.error("Error processing winners:", error);
    return NextResponse.json(
      { error: "Failed to process winners" },
      { status: 500 },
    );
  }
}
