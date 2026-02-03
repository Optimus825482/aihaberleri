/**
 * SEO Orchestrator Service
 *
 * SORUMLULUKLAR:
 * 1. Tüm SEO agent'larını koordine et
 * 2. Paralel execution (Analyzer → Content + Technical → Coordinator)
 * 3. Error handling ve retry logic
 * 4. Progress tracking
 * 5. Database update
 *
 * KULLANIM:
 * const orchestrator = new SEOOrchestratorService();
 * const result = await orchestrator.optimizeArticle(articleId, "review");
 */

import { db } from "@/lib/db";
import { SEOAnalyzerAgent } from "@/agents/seo/analyzer.agent";
import { ContentOptimizerAgent } from "@/agents/seo/content-optimizer.agent";
import { TechnicalSEOAgent } from "@/agents/seo/technical-seo.agent";
import { CoordinatorAgent } from "@/agents/seo/coordinator.agent";
import type { FinalSEOChanges } from "@/agents/seo/coordinator.agent";

export interface OptimizationOptions {
  mode: "auto" | "review"; // auto: direkt uygula, review: önce göster
  agents?: string[]; // Hangi agent'lar çalışsın (default: hepsi)
  includeRelatedArticles?: boolean; // Internal linking için
}

export interface OptimizationResult {
  success: boolean;
  mode: "auto" | "review";
  changes?: FinalSEOChanges;
  applied?: boolean;
  error?: string;
  metrics: {
    duration: number;
    agentMetrics: Record<string, any>;
  };
}

export class SEOOrchestratorService {
  private analyzerAgent: SEOAnalyzerAgent;
  private contentOptimizerAgent: ContentOptimizerAgent;
  private technicalSEOAgent: TechnicalSEOAgent;
  private coordinatorAgent: CoordinatorAgent;

  constructor() {
    this.analyzerAgent = new SEOAnalyzerAgent();
    this.contentOptimizerAgent = new ContentOptimizerAgent();
    this.technicalSEOAgent = new TechnicalSEOAgent();
    this.coordinatorAgent = new CoordinatorAgent();
  }

  /**
   * Makaleyi optimize et
   */
  async optimizeArticle(
    articleId: string,
    options: OptimizationOptions = { mode: "review" },
  ): Promise<OptimizationResult> {
    const startTime = Date.now();

    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎯 SEO OPTIMIZATION BAŞLADI`);
    console.log(`   Article ID: ${articleId}`);
    console.log(`   Mode: ${options.mode}`);
    console.log(`   Agents: ${options.agents?.join(", ") || "all"}`);
    console.log(`${"=".repeat(60)}\n`);

    try {
      // 1. Makaleyi getir
      const article = await db.article.findUnique({
        where: { id: articleId },
        include: {
          category: true,
        },
      });

      if (!article) {
        throw new Error(`Article not found: ${articleId}`);
      }

      console.log(`📰 Makale: "${article.title}"`);

      // 2. İlgili makaleleri getir (internal linking için)
      let relatedArticles: Array<{
        id: string;
        title: string;
        slug: string;
      }> = [];

      if (options.includeRelatedArticles !== false) {
        relatedArticles = await db.article.findMany({
          where: {
            categoryId: article.categoryId,
            status: "PUBLISHED",
            id: { not: articleId },
          },
          select: {
            id: true,
            title: true,
            slug: true,
          },
          take: 5,
          orderBy: {
            publishedAt: "desc",
          },
        });

        console.log(`🔗 ${relatedArticles.length} ilgili makale bulundu`);
      }

      // 3. SEO Analyzer Agent
      console.log(`\n🔍 STEP 1: SEO Analysis`);
      const analysis = await this.analyzerAgent.analyze({
        title: article.title,
        content: article.content || "",
        metaDescription: article.metaDescription || undefined,
        slug: article.slug,
        keywords: article.keywords || undefined,
        imageUrl: article.imageUrl || undefined,
      });

      console.log(`   Mevcut Skor: ${analysis.score}/100`);
      console.log(`   Sorunlar: ${analysis.issues.length}`);
      console.log(`   Fırsatlar: ${analysis.opportunities.length}`);

      // 4. Paralel Optimization (Content + Technical)
      console.log(`\n⚡ STEP 2: Parallel Optimization`);

      const [contentChanges, technicalChanges] = await Promise.allSettled([
        // Content Optimizer Agent
        (async () => {
          if (
            !options.agents ||
            options.agents.includes("content") ||
            options.agents.includes("all")
          ) {
            console.log(`   ✍️ Content Optimizer çalışıyor...`);
            try {
              return await this.contentOptimizerAgent.optimize(
                {
                  title: article.title,
                  content: article.content || "",
                  metaDescription: article.metaDescription || undefined,
                  keywords: article.keywords || undefined,
                },
                analysis,
              );
            } catch (error) {
              console.error(`   ❌ Content Optimizer hatası:`, error);
              throw error;
            }
          }
          return null;
        })(),

        // Technical SEO Agent
        (async () => {
          if (
            !options.agents ||
            options.agents.includes("technical") ||
            options.agents.includes("all")
          ) {
            console.log(`   🔧 Technical SEO Agent çalışıyor...`);
            try {
              return await this.technicalSEOAgent.optimize(
                article,
                relatedArticles,
              );
            } catch (error) {
              console.error(`   ❌ Technical SEO Agent hatası:`, error);
              throw error;
            }
          }
          return null;
        })(),
      ]);

      // Check if both agents succeeded
      if (contentChanges.status === "rejected") {
        throw new Error(`Content Optimizer failed: ${contentChanges.reason}`);
      }
      if (technicalChanges.status === "rejected") {
        throw new Error(
          `Technical SEO Agent failed: ${technicalChanges.reason}`,
        );
      }

      const contentResult = contentChanges.value;
      const technicalResult = technicalChanges.value;

      if (!contentResult || !technicalResult) {
        throw new Error("Optimization failed: Missing changes");
      }

      console.log(
        `   ✅ Content Optimizer: Skor ${contentResult.estimatedScore}`,
      );
      console.log(
        `   ✅ Technical SEO: Skor ${technicalResult.estimatedScore}`,
      );

      // 5. Coordinator Agent
      console.log(`\n🤝 STEP 3: Coordination`);
      const finalChanges = await this.coordinatorAgent.coordinate(
        contentResult,
        technicalResult,
        {
          title: article.title,
          content: article.content || "",
          metaDescription: article.metaDescription || undefined,
          slug: article.slug,
        },
      );

      console.log(`   ✅ Final Skor: ${finalChanges.estimatedScore}/100`);
      console.log(
        `   ✅ Confidence: ${(finalChanges.confidence * 100).toFixed(0)}%`,
      );
      console.log(`   ✅ Conflicts: ${finalChanges.conflicts.length}`);

      // 6. Apply changes (if mode is "auto")
      let applied = false;

      if (options.mode === "auto") {
        console.log(`\n💾 STEP 4: Applying Changes`);
        await this.applyChanges(articleId, finalChanges);
        applied = true;
        console.log(`   ✅ Değişiklikler uygulandı`);
      } else {
        console.log(`\n👀 STEP 4: Review Mode (değişiklikler uygulanmadı)`);
      }

      // 7. Metrics
      const duration = Date.now() - startTime;
      const agentMetrics = {
        analyzer: this.analyzerAgent.getMetrics(),
        contentOptimizer: this.contentOptimizerAgent.getMetrics(),
        technicalSEO: this.technicalSEOAgent.getMetrics(),
        coordinator: this.coordinatorAgent.getMetrics(),
      };

      console.log(`\n${"=".repeat(60)}`);
      console.log(`✅ SEO OPTIMIZATION TAMAMLANDI`);
      console.log(`   Duration: ${(duration / 1000).toFixed(2)}s`);
      console.log(`   Mode: ${options.mode}`);
      console.log(`   Applied: ${applied}`);
      console.log(`   Final Score: ${finalChanges.estimatedScore}/100`);
      console.log(`${"=".repeat(60)}\n`);

      return {
        success: true,
        mode: options.mode,
        changes: finalChanges,
        applied,
        metrics: {
          duration,
          agentMetrics,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error(`\n${"=".repeat(60)}`);
      console.error(`❌ SEO OPTIMIZATION BAŞARISIZ`);
      console.error(`   Duration: ${(duration / 1000).toFixed(2)}s`);
      console.error(
        `   Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      console.error(`${"=".repeat(60)}\n`);

      return {
        success: false,
        mode: options.mode,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: {
          duration,
          agentMetrics: {},
        },
      };
    }
  }

  /**
   * Değişiklikleri database'e uygula
   */
  private async applyChanges(
    articleId: string,
    changes: FinalSEOChanges,
  ): Promise<void> {
    try {
      // Update article
      await db.article.update({
        where: { id: articleId },
        data: {
          title: changes.title,
          metaDescription: changes.metaDescription,
          content: changes.content,
          slug: changes.slug,
          keywords: changes.keywords.primary,
          // imageAltText: changes.imageAltText, // TODO: Add to schema
        },
      });

      // Recalculate SEO score
      const { calculateSEOScore } = await import("@/lib/seo-calculator");

      // Get updated article data
      const updatedArticle = await db.article.findUnique({
        where: { id: articleId },
        select: {
          title: true,
          content: true,
          excerpt: true,
          metaDescription: true,
          slug: true,
          keywords: true,
          imageUrl: true,
        },
      });

      if (!updatedArticle) {
        throw new Error("Article not found after update");
      }

      const seoResult = calculateSEOScore({
        title: updatedArticle.title,
        content: updatedArticle.content || "",
        excerpt: updatedArticle.excerpt || "",
        metaDescription: updatedArticle.metaDescription || undefined,
        slug: updatedArticle.slug,
        keywords: updatedArticle.keywords || undefined,
        imageUrl: updatedArticle.imageUrl || undefined,
      });

      // Update SEO score
      await db.article.update({
        where: { id: articleId },
        data: {
          seoScore: seoResult.score,
        },
      });

      console.log(`   📊 Yeni SEO Skoru: ${seoResult.score}/100`);

      // Mark recommendations as resolved
      await db.sEORecommendation.updateMany({
        where: {
          articleId,
          status: "PENDING",
        },
        data: {
          status: "RESOLVED",
        },
      });

      console.log(`   ✅ Öneriler resolved olarak işaretlendi`);
    } catch (error) {
      console.error(`   ❌ Apply changes hatası:`, error);
      throw error;
    }
  }

  /**
   * Batch optimization (birden fazla makale)
   */
  async optimizeBatch(
    articleIds: string[],
    options: OptimizationOptions = { mode: "review" },
  ): Promise<Map<string, OptimizationResult>> {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🎯 BATCH SEO OPTIMIZATION BAŞLADI`);
    console.log(`   Articles: ${articleIds.length}`);
    console.log(`   Mode: ${options.mode}`);
    console.log(`${"=".repeat(60)}\n`);

    const results = new Map<string, OptimizationResult>();

    // Sequential processing (rate limiting için)
    for (const articleId of articleIds) {
      try {
        const result = await this.optimizeArticle(articleId, options);
        results.set(articleId, result);

        // Rate limiting (2 saniye bekle)
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Article ${articleId} optimization failed:`, error);
        results.set(articleId, {
          success: false,
          mode: options.mode,
          error: error instanceof Error ? error.message : "Unknown error",
          metrics: {
            duration: 0,
            agentMetrics: {},
          },
        });
      }
    }

    const successCount = Array.from(results.values()).filter(
      (r) => r.success,
    ).length;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`✅ BATCH OPTIMIZATION TAMAMLANDI`);
    console.log(`   Success: ${successCount}/${articleIds.length}`);
    console.log(`${"=".repeat(60)}\n`);

    return results;
  }
}

export default SEOOrchestratorService;
