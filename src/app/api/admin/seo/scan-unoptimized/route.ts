import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { countUnoptimizedArticles } from "@/services/seo-auto-optimize.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/seo/scan-unoptimized?maxScore=80
 *
 * Optimize edilmemiş makale sayısını dil bazlı döner.
 * Hızlı count sorgusu — ağır işlem yapmaz.
 */
export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const maxScoreStr = searchParams.get("maxScore");
  const maxScore = maxScoreStr
    ? Math.min(Math.max(Number(maxScoreStr), 40), 95)
    : 80;

  try {
    const counts = await countUnoptimizedArticles(maxScore);

    return NextResponse.json({
      maxScore,
      counts,
      timestamp: Date.now(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Tarama başarısız",
        message: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
