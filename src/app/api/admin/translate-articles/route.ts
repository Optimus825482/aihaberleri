/**
 * Admin API: Migrate existing articles to multi-language
 * POST /api/admin/translate-articles
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { translateAndSaveArticle } from "@/lib/translation";

export async function POST(request: Request) {
  try {
    // Get batch size from query params
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get("batch") || "5", 10);

    // Find articles without English translations
    const articlesWithoutTranslations = await db.$queryRaw<
      { id: string; title: string }[]
    >`
      SELECT a.id, a.title
      FROM "Article" a 
      LEFT JOIN "ArticleTranslation" at ON a.id = at."articleId" AND at.locale = 'en'
      WHERE a.status = 'PUBLISHED' 
      AND at.id IS NULL
      LIMIT ${batchSize}
    `;

    if (articlesWithoutTranslations.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All articles are already translated!",
        translated: 0,
        remaining: 0,
      });
    }

    console.log(
      `🌍 Starting translation batch: ${articlesWithoutTranslations.length} articles`,
    );

    const results = [];
    for (const article of articlesWithoutTranslations) {
      try {
        console.log(`📝 Translating: ${article.title.substring(0, 50)}...`);
        await translateAndSaveArticle(article.id, "tr");
        results.push({ id: article.id, status: "success" });
        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to translate: ${article.id}`, error);
        results.push({ id: article.id, status: "error", error: String(error) });
      }
    }

    // Count remaining
    const remainingCount = await db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM "Article" a 
      LEFT JOIN "ArticleTranslation" at ON a.id = at."articleId" AND at.locale = 'en'
      WHERE a.status = 'PUBLISHED' 
      AND at.id IS NULL
    `;

    const remaining = Number(remainingCount[0]?.count || 0);

    return NextResponse.json({
      success: true,
      message: `Translated ${results.filter((r) => r.status === "success").length} articles`,
      translated: results.filter((r) => r.status === "success").length,
      failed: results.filter((r) => r.status === "error").length,
      remaining,
      results,
    });
  } catch (error) {
    console.error("Translation API error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    // Get translation stats
    const [totalArticles, translatedArticles] = await Promise.all([
      db.article.count({ where: { status: "PUBLISHED" } }),
      db.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT at."articleId") as count
        FROM "ArticleTranslation" at
        WHERE at.locale = 'en'
      `,
    ]);

    const translated = Number(translatedArticles[0]?.count || 0);
    const pending = totalArticles - translated;
    const percentage =
      totalArticles > 0 ? Math.round((translated / totalArticles) * 100) : 0;

    return NextResponse.json({
      total: totalArticles,
      translated,
      pending,
      percentage,
    });
  } catch (error) {
    console.error("Translation stats error:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 },
    );
  }
}
