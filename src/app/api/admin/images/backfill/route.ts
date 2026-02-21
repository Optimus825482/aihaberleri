import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { fetchPollinationsImage } from "@/lib/pollinations";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function buildImagePrompt(
  title: string,
  excerpt: string | null,
  category: string,
) {
  const base = `${title} ${excerpt ?? ""} ${category}`.trim();
  return `${base}, professional technology news illustration, no people, no faces, clean composition`;
}

export async function POST(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const inputLimit = Number(body?.limit ?? 20);
    const limit = Number.isFinite(inputLimit)
      ? Math.max(1, Math.min(200, Math.floor(inputLimit)))
      : 20;

    const where = {
      status: "PUBLISHED" as const,
      OR: [
        { imageUrl: null },
        { imageUrl: "" },
        { imageUrl: "/logos/og-image.png" },
      ],
    };

    const candidates = await db.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        category: { select: { name: true } },
      },
    });

    let updated = 0;
    let failed = 0;
    let backupProviderUsed = 0;

    for (const article of candidates) {
      try {
        const prompt = buildImagePrompt(
          article.title,
          article.excerpt,
          article.category.name,
        );

        const imageUrl = await fetchPollinationsImage(
          prompt,
          {
            width: 1200,
            height: 630,
            model: "flux",
            enhance: true,
            nologo: true,
          },
          2,
        );

        if (
          imageUrl.includes("source.unsplash.com") ||
          imageUrl.includes("picsum.photos")
        ) {
          backupProviderUsed += 1;
        }

        if (!dryRun) {
          await db.article.update({
            where: { id: article.id },
            data: {
              imageUrl,
              imageUrlMedium: imageUrl,
              imageUrlSmall: imageUrl,
              imageUrlThumb: imageUrl,
            },
          });
        }

        updated += 1;
      } catch (error) {
        failed += 1;
        console.error("[ImageBackfill] Failed:", article.slug, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        dryRun,
        requestedLimit: limit,
        candidates: candidates.length,
        updated,
        failed,
        backupProviderUsed,
      },
    });
  } catch (error) {
    console.error("[ImageBackfill] Fatal error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Image backfill işleminde beklenmeyen hata",
      },
      { status: 500 },
    );
  }
}
