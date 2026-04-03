import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { getCache } from "@/lib/cache";
import {
  researchBySlug,
  generateContentForSlug,
  publishRecoveredArticle,
  slugToQuery,
} from "@/lib/slug-recovery";

export const dynamic = "force-dynamic";
// AI + web araştırma zaman alır, 120 sn yeterli
export const maxDuration = 120;

/**
 * GET /api/admin/articles/slug-recovery?slug=xxx
 * → Brave ile araştır, kaynak listesi döndür (önizleme)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const slug = request.nextUrl.searchParams.get("slug")?.trim();
    if (!slug) {
      return NextResponse.json(
        { success: false, error: "slug parametresi gerekli" },
        { status: 400 },
      );
    }

    const research = await researchBySlug(slug);

    return NextResponse.json({
      success: true,
      slug,
      query: research.query,
      sources: research.sources,
    });
  } catch (error) {
    console.error("[SLUG-RECOVERY] Araştırma hatası:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/articles/slug-recovery
 * Body: { slug: string; categoryId: string }
 * → Araştır + İçerik üret + Yayınla
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
    const categoryId = typeof body?.categoryId === "string" ? body.categoryId.trim() : "";

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "slug alanı zorunlu" },
        { status: 400 },
      );
    }
    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "categoryId alanı zorunlu" },
        { status: 400 },
      );
    }

    // 1. Araştır
    const research = await researchBySlug(slug);

    if (research.sources.length === 0) {
      return NextResponse.json(
        { success: false, error: `"${slugToQuery(slug)}" için kaynak bulunamadı` },
        { status: 422 },
      );
    }

    // 2. İçerik üret
    const content = await generateContentForSlug(slug, research);

    // 3. Yayınla
    const result = await publishRecoveredArticle(slug, content, categoryId);

    // 4. Cache temizle
    const cache = getCache();
    await cache.invalidateByTag("articles");

    return NextResponse.json({
      success: true,
      articleId: result.articleId,
      trSlug: result.trSlug,
      enSlug: result.enSlug,
      trUrl: `/news/${result.trSlug}`,
      enUrl: `/en/news/${result.enSlug}`,
      trTitle: content.tr.title,
      enTitle: content.en.title,
      sourcesUsed: research.sources.length,
      message: `✅ "${content.tr.title}" başarıyla yayınlandı`,
    });
  } catch (error) {
    console.error("[SLUG-RECOVERY] Yayınlama hatası:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Bilinmeyen hata" },
      { status: 500 },
    );
  }
}
