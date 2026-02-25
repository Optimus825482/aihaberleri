import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type AdSenseAnalysisDelegate = {
  findMany: (...args: any[]) => Promise<any[]>;
  update: (...args: any[]) => Promise<any>;
};

const adSenseAnalysisTable = (db as any)["adSenseAnalysis"] as
  | AdSenseAnalysisDelegate
  | undefined;

/**
 * GET: Analiz geçmişi
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50);
    const status = searchParams.get("status"); // PENDING | REVIEWED | APPLIED | DISMISSED

    const where: any = {};
    if (status) where.status = status;

    if (!adSenseAnalysisTable) {
      return NextResponse.json(
        { success: false, error: "AdSenseAnalysis modeli bulunamadı" },
        { status: 500 },
      );
    }

    const analyses = await adSenseAnalysisTable.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ success: true, data: analyses });
  } catch (error: any) {
    console.error("[AdSense Analyses List]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Analizler alınamadı" },
      { status: 500 },
    );
  }
}

/**
 * PATCH: Analiz durumunu güncelle (review, dismiss, apply)
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const { id, status, reviewNotes, actionsApplied } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Analiz ID gerekli" },
        { status: 400 },
      );
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (reviewNotes !== undefined) updateData.reviewNotes = reviewNotes;
    if (actionsApplied) updateData.actionsApplied = actionsApplied;
    if (status === "REVIEWED" || status === "APPLIED") {
      updateData.reviewedAt = new Date();
    }

    if (!adSenseAnalysisTable) {
      return NextResponse.json(
        { success: false, error: "AdSenseAnalysis modeli bulunamadı" },
        { status: 500 },
      );
    }

    const updated = await adSenseAnalysisTable.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[AdSense Analyses Update]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Güncelleme başarısız" },
      { status: 500 },
    );
  }
}
