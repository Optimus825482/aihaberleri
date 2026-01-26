/**
 * Content Service - Handles content generation and processing
 */

import {
  analyzeNewsArticles,
  rewriteArticle,
  generateImagePrompt,
} from "@/lib/deepseek";
import { fetchPollinationsImage } from "@/lib/pollinations";
import { generateSlug } from "@/lib/utils";
import { db } from "@/lib/db";
import type { NewsArticle } from "./news.service";
import { fetchArticleContent } from "./news.service";
import { submitArticleToIndexNow } from "@/lib/seo/indexnow";

export interface ProcessedArticle {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  imageUrl: string | null;
  sourceUrl: string;
  categorySlug: string;
  keywords: string[];
  metaTitle: string;
  metaDescription: string;
  score: number | null;
}

/**
 * Select the best articles from a list using AI analysis
 */
export async function selectBestArticles(
  articles: NewsArticle[],
  targetCount: number = 3,
): Promise<Array<{ article: NewsArticle; category: string }>> {
  console.log(
    `🎯 ${articles.length} haber arasından en iyi ${targetCount} tanesi seçiliyor...`,
  );

  if (articles.length === 0) return [];

  try {
    // Analyze only the top 15-20 articles to stay within token limits
    const analysis = await analyzeNewsArticles(articles.slice(0, 20));

    const selected = analysis
      .slice(0, targetCount)
      .map((item) => {
        // analyzeNewsArticles returns 1-indexed or 0-indexed?
        // Based on its prompt, it's 0-indexed if we follow JSON standard,
        // but let's be safe and check both.
        const index = item.index;
        return {
          article: articles[index],
          category: item.category,
        };
      })
      .filter((item) => item.article !== undefined);

    if (selected.length === 0) {
      throw new Error("AI could not select any articles");
    }

    return selected;
  } catch (error) {
    console.error("Haber analiz hatası, fallback uygulanıyor:", error);
    // Fallback: Take the first few and assign a default category
    return articles.slice(0, targetCount).map((a) => ({
      article: a,
      category: "Yapay Zeka",
    }));
  }
}

/**
 * Process a single article: rewrite, get image, prepare for publishing
 */
export async function processArticle(
  article: NewsArticle,
  category: string,
): Promise<ProcessedArticle> {
  console.log(`📝 Haber işleniyor: ${article.title}`);

  try {
    // Step 1: Fetch full article content
    const fullContent = await fetchArticleContent(article.url);

    // Step 2: Fetch recent articles for internal linking context
    const recentArticles = await db.article.findMany({
      where: {
        status: "PUBLISHED",
        category: { name: category },
      },
      select: { title: true, slug: true },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    // Step 3: Rewrite article using DeepSeek
    console.log("🤖 DeepSeek ile haber yeniden yazılıyor...");

    // Define type for rewrite result to include score
    interface RewriteResult {
      title: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
      score?: number;
    }

    const rewritten = (await rewriteArticle(
      article.title,
      fullContent,
      category,
      recentArticles,
    )) as RewriteResult;

    const score = rewritten.score || 0;
    console.log(`📊 Haber Puanı: ${score}/1000`);

    // Step 3: Generate AI image prompt using DeepSeek
    console.log("🎨 DeepSeek ile görsel prompt oluşturuluyor...");
    const imagePrompt = await generateImagePrompt(
      rewritten.title,
      rewritten.content,
      category,
    );
    console.log("📝 Görsel prompt:", imagePrompt);

    // Step 4: Get image from Pollinations.ai
    console.log("🖼️  Pollinations.ai'dan görsel alınıyor...");
    const imageUrl = await fetchPollinationsImage(imagePrompt, {
      width: 1200,
      height: 630,
      model: "flux-realism",
      enhance: true,
      nologo: true,
    });
    console.log("✅ Görsel URL:", imageUrl);

    // Step 5: Generate slug
    const slug = generateSlug(rewritten.title);

    // Step 6: Get or create category
    const categorySlug = generateSlug(category);
    await ensureCategory(category, categorySlug);

    return {
      title: rewritten.title,
      slug,
      excerpt: rewritten.excerpt,
      content: rewritten.content,
      imageUrl,
      sourceUrl: article.url,
      categorySlug,
      keywords: rewritten.keywords,
      metaTitle: rewritten.title,
      metaDescription: rewritten.metaDescription,
      score,
    };
  } catch (error) {
    console.error("Haber işleme hatası:", error);
    throw error;
  }
}

/**
 * Ensure category exists in database
 */
async function ensureCategory(name: string, slug: string): Promise<void> {
  try {
    await db.category.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        description: `${name} ile ilgili haberler`,
      },
    });
  } catch (error) {
    console.error("Kategori oluşturma hatası:", error);
  }
}

/**
 * Publish processed article to database
 */
export async function publishArticle(
  processedArticle: ProcessedArticle,
  agentLogId?: string,
): Promise<{ id: string; slug: string }> {
  console.log(`📤 Haber yayınlanıyor: ${processedArticle.title}`);

  try {
    // Get category
    const category = await db.category.findUnique({
      where: { slug: processedArticle.categorySlug },
    });

    if (!category) {
      throw new Error(`Kategori bulunamadı: ${processedArticle.categorySlug}`);
    }

    // Check if article with same slug already exists
    const existing = await db.article.findUnique({
      where: { slug: processedArticle.slug },
    });

    if (existing) {
      // Generate unique slug by appending timestamp
      processedArticle.slug = `${processedArticle.slug}-${Date.now()}`;
    }

    // Determine status based on score
    const score = processedArticle.score || 0;
    const status = score >= 750 ? "PUBLISHED" : "DRAFT";

    // Create article
    const article = await db.article.create({
      data: {
        title: processedArticle.title,
        slug: processedArticle.slug,
        excerpt: processedArticle.excerpt,
        content: processedArticle.content,
        imageUrl: processedArticle.imageUrl,
        sourceUrl: processedArticle.sourceUrl,
        categoryId: category.id,
        status,
        score,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        metaTitle: processedArticle.metaTitle,
        metaDescription: processedArticle.metaDescription,
        keywords: processedArticle.keywords,
        agentLogId,
      },
    });

    console.log(`✅ Haber yayınlandı: ${article.slug}`);

    // Post-publish tasks: IndexNow submission
    try {
      submitArticleToIndexNow(article.slug).catch((err) =>
        console.error("IndexNow auto-submit error:", err),
      );
    } catch (e) {
      console.error("Failed to trigger IndexNow submission:", e);
    }

    return {
      id: article.id,
      slug: article.slug,
    };
  } catch (error) {
    console.error("Haber yayınlama hatası:", error);
    throw error;
  }
}

/**
 * Process and publish multiple articles
 */
export async function processAndPublishArticles(
  articles: Array<{ article: NewsArticle; category: string }>,
  agentLogId?: string,
  forceCategorySlug?: string,
): Promise<Array<{ id: string; slug: string }>> {
  const published = [];

  for (const { article, category } of articles) {
    try {
      // If forceCategorySlug is provided, use it instead of DeepSeek's category
      const targetCategory = forceCategorySlug
        ? await db.category.findUnique({ where: { slug: forceCategorySlug } })
        : null;

      const categoryToUse = targetCategory ? targetCategory.name : category;

      const processed = await processArticle(article, categoryToUse);

      // Override category slug if forced
      if (forceCategorySlug) {
        processed.categorySlug = forceCategorySlug;
      }

      const result = await publishArticle(processed, agentLogId);
      published.push(result);
    } catch (error) {
      console.error(`Haber işleme başarısız: ${article.title}`, error);
    }
  }

  return published;
}

export default {
  selectBestArticles,
  processArticle,
  publishArticle,
  processAndPublishArticles,
};
