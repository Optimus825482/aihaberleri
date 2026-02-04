/**
 * Title A/B Testing API Routes
 *
 * Endpoints:
 * - GET /api/ab-testing/[articleId] - Get A/B test stats
 * - POST /api/ab-testing/[articleId]/view - Track view
 * - POST /api/ab-testing/[articleId]/click - Track click
 * - POST /api/ab-testing/[articleId]/lock - Lock winner
 * - POST /api/ab-testing/process-winners - Process all eligible winners
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getABTestStats,
  trackVariantView,
  trackVariantClick,
  lockWinner,
  TitleVariantType,
} from "@/lib/title-ab-testing";

export async function GET(
  request: NextRequest,
  { params }: { params: { articleId: string } },
) {
  try {
    const { articleId } = params;

    const stats = await getABTestStats(articleId);

    if (!stats) {
      return NextResponse.json(
        { error: "No A/B test data found for this article" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting A/B test stats:", error);
    return NextResponse.json(
      { error: "Failed to get A/B test stats" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { articleId: string } },
) {
  try {
    const { articleId } = params;
    const body = await request.json();
    const { action, variant } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 },
      );
    }

    switch (action) {
      case "view": {
        if (!variant || !isValidVariant(variant)) {
          return NextResponse.json(
            { error: "Valid variant is required for view tracking" },
            { status: 400 },
          );
        }
        await trackVariantView(articleId, variant as TitleVariantType);
        return NextResponse.json({ success: true, action: "view_tracked" });
      }

      case "click": {
        if (!variant || !isValidVariant(variant)) {
          return NextResponse.json(
            { error: "Valid variant is required for click tracking" },
            { status: 400 },
          );
        }
        await trackVariantClick(articleId, variant as TitleVariantType);
        return NextResponse.json({ success: true, action: "click_tracked" });
      }

      case "lock": {
        const result = await lockWinner(articleId);
        return NextResponse.json({
          success: result.success,
          winner: result.winner,
          newTitle: result.newTitle,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: view, click, or lock" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Error processing A/B test action:", error);
    return NextResponse.json(
      { error: "Failed to process A/B test action" },
      { status: 500 },
    );
  }
}

function isValidVariant(variant: string): boolean {
  return ["primary", "clickbait", "seo"].includes(variant);
}
