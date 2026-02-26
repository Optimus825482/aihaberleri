import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  getSEOAutoOptimizeState,
  startSEOAutoOptimizeJob,
  updateSEOAutopilotSettings,
} from "@/services/seo-auto-optimize.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/seo/auto-optimize
 *
 * Arka planda toplu SEO optimizasyonu başlatır.
 * Sayfa kapansa bile server'da çalışmaya devam eder.
 *
 * Body: { maxScore?: number, limit?: number, language?: "tr" | "en" | "all" | "enb" }
 * Returns: { jobId: string } (202 Accepted)
 */
export async function POST(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  let maxScore = 99;
  let limit = 100;
  let language: "tr" | "en" | "all" = "tr";

  try {
    const body = await request.json();
    if (body.maxScore) maxScore = body.maxScore;
    if (body.limit) {
      limit = Math.min(Number(body.limit), 200);
    }
    if (body.language) {
      const normalized = String(body.language).toLowerCase();
      if (normalized === "tr" || normalized === "en" || normalized === "all") {
        language = normalized;
      } else if (normalized === "enb") {
        language = "en";
      }
    }
  } catch {
    // defaults
  }

  const result = await startSEOAutoOptimizeJob({
    maxScore,
    limit,
    language,
    source: "manual",
  });

  if (!result.started && result.reason === "active-job") {
    return NextResponse.json(
      { error: result.message, jobId: result.jobId },
      { status: 409 },
    );
  }

  if (!result.started && result.reason === "no-candidate") {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  if (!result.started) {
    return NextResponse.json({ error: result.message }, { status: 400 });
  }

  return NextResponse.json(
    {
      jobId: result.jobId,
      language: result.language,
      maxScore: result.maxScore,
      limit: result.limit,
      total: result.total,
    },
    { status: 202 },
  );
}

/**
 * GET /api/admin/seo/auto-optimize?jobId=xxx(&since=N)
 *
 * Job durumunu ve incremental progress döner.
 * jobId yoksa aktif job varsa onu döner.
 */
export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId") || undefined;
  const sinceStr = searchParams.get("since");
  const sinceIndex = sinceStr ? parseInt(sinceStr, 10) : 0;

  const state = await getSEOAutoOptimizeState(jobId, sinceIndex);

  if (state.error === "Job bulunamadı") {
    return NextResponse.json(state, { status: 404 });
  }

  return NextResponse.json(state, { status: 200 });
}

export async function PATCH(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const body = await request.json();
    const merged = await updateSEOAutopilotSettings({
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      intervalMinutes:
        typeof body.intervalMinutes === "number"
          ? body.intervalMinutes
          : undefined,
      maxScore: typeof body.maxScore === "number" ? body.maxScore : undefined,
      language:
        body.language === "tr" ||
        body.language === "en" ||
        body.language === "all"
          ? body.language
          : undefined,
      delayMs: typeof body.delayMs === "number" ? body.delayMs : undefined,
    });

    return NextResponse.json({ success: true, autopilot: merged });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Ayar güncellenemedi",
        message: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 400 },
    );
  }
}
