/**
 * SEO Analyzer Service
 * AI-powered SEO recommendations for articles
 */

import { prisma } from "./prisma";

interface SEOAnalysisResult {
  score: number; // 0-100
  recommendations: Array<{
    type: string;
    severity: "critical" | "high" | "medium" | "low";
    message: string;
    suggestion: string;
  }>;
}

/**
 * Analyze article for SEO optimization
 */
export async function analyzeArticleSEO(
  articleId: string,
): Promise<SEOAnalysisResult> {
  try {
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { category: true },
    });

    if (!article) {
      throw new Error("Article not found");
    }

    const recommendations = [];
    let score = 100;

    // 1. Title Analysis
    const titleLength = article.title.length;
    if (titleLength < 30) {
      recommendations.push({
        type: "title",
        severity: "high" as const,
        message: "Başlık çok kısa",
        suggestion: `Başlık ${30 - titleLength} karakter daha uzun olmalı (optimal: 50-60)`,
      });
      score -= 15;
    } else if (titleLength > 70) {
      recommendations.push({
        type: "title",
        severity: "medium" as const,
        message: "Başlık çok uzun",
        suggestion: "Başlık 70 karakterden kısa olmalı (optimal: 50-60)",
      });
      score -= 10;
    }

    // 2. Meta Description
    const descLength = article.excerpt?.length || 0;
    if (descLength < 120) {
      recommendations.push({
        type: "description",
        severity: "high" as const,
        message: "Meta açıklama çok kısa",
        suggestion: `Meta açıklama ${120 - descLength} karakter daha uzun olmalı (optimal: 150-160)`,
      });
      score -= 15;
    } else if (descLength > 160) {
      recommendations.push({
        type: "description",
        severity: "medium" as const,
        message: "Meta açıklama çok uzun",
        suggestion: "Meta açıklama 160 karakterden kısa olmalı",
      });
      score -= 10;
    }

    // 3. Content Length
    const contentLength = article.content.length;
    if (contentLength < 300) {
      recommendations.push({
        type: "content",
        severity: "critical" as const,
        message: "İçerik çok kısa",
        suggestion: `En az ${300 - contentLength} karakter daha eklemelisiniz (optimal: 1000+)`,
      });
      score -= 25;
    } else if (contentLength < 1000) {
      recommendations.push({
        type: "content",
        severity: "medium" as const,
        message: "İçerik uzatılabilir",
        suggestion:
          "Daha detaylı içerik SEO için daha iyi (optimal: 1000+ karakter)",
      });
      score -= 10;
    }

    // 4. Keywords in Title
    const titleWords = article.title.toLowerCase().split(" ");
    const contentWords = article.content.toLowerCase();
    let keywordsInContent = 0;
    titleWords.forEach((word) => {
      if (word.length > 3 && contentWords.includes(word)) {
        keywordsInContent++;
      }
    });

    if (keywordsInContent < 2) {
      recommendations.push({
        type: "keywords",
        severity: "high" as const,
        message: "Başlıktaki anahtar kelimeler içerikte yok",
        suggestion: "Başlıktaki önemli kelimeleri içerikte kullanın",
      });
      score -= 15;
    }

    // 5. Image Check
    const hasImage = article.imageUrl !== null && article.imageUrl !== "";
    if (!hasImage) {
      recommendations.push({
        type: "images",
        severity: "high" as const,
        message: "Görsel eksik",
        suggestion: "En az 1 görselli makale SEO için daha iyi",
      });
      score -= 15;
    }

    // 6. Slug Quality
    const slugWords = article.slug.split("-");
    if (slugWords.length < 3) {
      recommendations.push({
        type: "title",
        severity: "low" as const,
        message: "URL çok kısa",
        suggestion: "URL daha açıklayıcı olabilir",
      });
      score -= 5;
    }

    // 7. Reading Time
    const wordsCount = article.content.split(/\s+/).length;
    const readingTime = Math.ceil(wordsCount / 200); // 200 words per minute
    if (readingTime < 2) {
      recommendations.push({
        type: "content",
        severity: "medium" as const,
        message: "Okuma süresi çok kısa",
        suggestion: "En az 2-3 dakikalık içerik daha iyi engagement sağlar",
      });
      score -= 10;
    }

    // Update article SEO score and reading time
    await prisma.article.update({
      where: { id: articleId },
      data: {
        seoScore: Math.max(0, score),
        readingTime,
      },
    });

    return {
      score: Math.max(0, score),
      recommendations,
    };
  } catch (error) {
    console.error("[SEO_ANALYSIS_ERROR]", error);
    throw error;
  }
}

/**
 * Save SEO recommendations to database
 */
export async function saveSEORecommendations(
  articleId: string,
  recommendations: SEOAnalysisResult["recommendations"],
) {
  try {
    // Delete old recommendations
    await prisma.sEORecommendation.deleteMany({
      where: { articleId },
    });

    // Create new recommendations
    await prisma.sEORecommendation.createMany({
      data: recommendations.map((rec) => ({
        articleId,
        type: rec.type,
        severity: rec.severity,
        message: rec.message,
        suggestion: rec.suggestion,
      })),
    });
  } catch (error) {
    console.error("[SAVE_SEO_RECOMMENDATIONS_ERROR]", error);
    throw error;
  }
}

/**
 * Get SEO recommendations for an article
 */
export async function getArticleSEORecommendations(articleId: string) {
  try {
    return await prisma.sEORecommendation.findMany({
      where: { articleId },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });
  } catch (error) {
    console.error("[GET_SEO_RECOMMENDATIONS_ERROR]", error);
    throw error;
  }
}

/**
 * Mark SEO recommendation as resolved
 */
export async function resolveSEORecommendation(recommendationId: string) {
  try {
    return await prisma.sEORecommendation.update({
      where: { id: recommendationId },
      data: { isResolved: true },
    });
  } catch (error) {
    console.error("[RESOLVE_SEO_RECOMMENDATION_ERROR]", error);
    throw error;
  }
}
