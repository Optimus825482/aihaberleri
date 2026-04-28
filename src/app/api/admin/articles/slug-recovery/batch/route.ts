import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getQueue, QUEUE_NAMES } from "@/lib/queue-manager";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/articles/slug-recovery/batch
 * 404-recovery-slugs.txt dosyasından slug listesini döndürür.
 */
export async function GET(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  try {
    const filePath = path.join(process.cwd(), "404-recovery-slugs.txt");
    const raw = fs.readFileSync(filePath, "utf-8");
    const slugs = raw
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    return NextResponse.json({ success: true, slugs, count: slugs.length });
  } catch {
    return NextResponse.json(
      { success: false, error: "404-recovery-slugs.txt okunamadı" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/articles/slug-recovery/batch
 * Body: { slugs: string[], categoryId: string }
 * Tüm slug'ları BullMQ SLUG_RECOVERY kuyruğuna ekler.
 * jobId = "slug-recovery:{slug}" — duplicate koruması sağlar.
 */
export async function POST(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const slugs: string[] = Array.isArray(body?.slugs)
      ? body.slugs.map(String).filter(Boolean)
      : [];
    const categoryId: string =
      typeof body?.categoryId === "string" ? body.categoryId.trim() : "";

    if (slugs.length === 0) {
      return NextResponse.json(
        { success: false, error: "En az bir slug gerekli" },
        { status: 400 },
      );
    }
    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "categoryId zorunlu" },
        { status: 400 },
      );
    }

    const queue = getQueue(QUEUE_NAMES.SLUG_RECOVERY);
    if (!queue) {
      return NextResponse.json(
        { success: false, error: "Queue başlatılamadı — Redis bağlantısı yok" },
        { status: 503 },
      );
    }

    // Her slug için ayrı job — jobId ile duplicate önlenir
    let queued = 0;
    let skipped = 0;
    for (const slug of slugs) {
      try {
        await queue.add(
          "recover-slug",
          { slug, categoryId },
          {
            jobId: `sr:${slug}`,
            attempts: 2,
            backoff: { type: "exponential", delay: 15000 },
            removeOnComplete: { count: 500, age: 48 * 3600 },
            removeOnFail: { count: 200, age: 72 * 3600 },
          },
        );
        queued++;
      } catch {
        // Duplicate jobId → atla
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      queued,
      skipped,
      message: `${queued} slug kuyruğa eklendi${skipped > 0 ? `, ${skipped} zaten vardı` : ""}`,
    });
  } catch (error) {
    console.error("[SLUG-RECOVERY-BATCH] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
