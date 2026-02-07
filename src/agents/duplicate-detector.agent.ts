/**
 * Duplicate Detector Agent
 *
 * 🆕 YENİ YAKLAŞIM: Content Variation - Duplicate'leri engelleme, çeşitlendir!
 *
 * ESKİ SİSTEM: Duplicate'leri tamamen engelle → %100 duplicate oranı
 * YENİ SİSTEM:
 * 1. Sadece URL duplicate'lerini engelle (aynı kaynaktan tekrar yazma)
 * 2. Benzer konular için VARIATION bayrağı ekle
 * 3. İçerik oluşturma aşamasında farklı açılardan içerik üret
 *
 * RESPONSIBILITIES:
 * 1. Check for URL duplicates (PostgreSQL)
 * 2. Store topic in Article.topic field for future checks
 * 3. Mark similar topics for variation processing
 * 4. Emit articles to next queue with variation flags
 *

import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import { db } from "@/lib/db";
import { isDuplicateNews } from "@/services/news.service";
import {
  checkSemanticDuplicate,
  generateEmbedding,
  EMBEDDING_DIMENSIONS,
} from "@/lib/embeddings";
import type { ScoredArticle } from "./relevance-filter.agent";

export interface UniqueArticle extends ScoredArticle {
  topic?: string; // Short topic identifier for duplicate detection
  isDuplicate: boolean;
  duplicateReason?: string;
  embedding?: number[]; // Pre-generated embedding for storage
}

export class DuplicateDetectorAgent extends BaseAgent<
  ScoredArticle[],
  UniqueArticle[]
> {
  protected config = {
    name: "duplicate-detector",
    queueName: QUEUE_NAMES.UNIQUE_ARTICLES,
    nextQueueName: QUEUE_NAMES.TREND_ENRICHMENT, // Route to TrendEnricher before ContentEnricher
    enableMetrics: true,
  };

  constructor() {
    super("duplicate-detector");
  }

  protected async process(
    job: Job<ScoredArticle[]>,
  ): Promise<AgentResult<UniqueArticle[]>> {
    const articles = job.data;
    const startTime = Date.now();

    this.logger.info(`🎯 Processing ${articles.length} articles (Variation Mode activated)...`);

    if (articles.length === 0) {
      return {
        success: true,
        data: [],
        skipNextQueue: true,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls: 0,
          itemsProcessed: 0,
        },
      };
    }

    try {
      const uniqueArticles: UniqueArticle[] = [];
      let duplicateCount = 0;
      let variationCount = 0;

      for (const article of articles) {
        // Extract topic for future duplicate checks
        const topic = this.extractTopic(article.title);

        // Check for duplicates using NEW relaxed detection
        const duplicateCheck = await this.checkDuplicate(article);

        if (duplicateCheck.isDuplicate) {
          duplicateCount++;
          this.logger.info(
            `❌ URL Duplicate: ${article.title.substring(0, 50)}... (${duplicateCheck.reason})`,
          );
        } else {
          // 🆕 Check if variation is needed
          const needsVariation = duplicateCheck.needsVariation || false;
          const similarArticles = duplicateCheck.similarArticles || [];

          if (needsVariation) {
            variationCount++;
            this.logger.info(
              `🎯 Needs Variation: ${article.title.substring(0, 50)}...`,
            );
          }

          // Pre-generate embedding for unique articles (to be stored later)
          let embedding: number[] | undefined;
          try {
            const combinedText =
              `${article.title}. ${article.description || ""}`.trim();
            embedding = await generateEmbedding(combinedText);
          } catch (embeddingError) {
            this.logger.warn(
              `Failed to generate embedding for: ${article.title.substring(0, 30)}...`,
            );
          }

          uniqueArticles.push({
            ...article,
            topic,
            isDuplicate: false,
            embedding,
            // 🆕 Add variation flags
            _needsVariation: needsVariation,
            _similarArticles: similarArticles,
          } as any);
        }
      }

      // ═══════════════════════════════════════════════════════════════════
      // 🆕 VARIATION MODE: Minimum 1 article guarantee
      // ═══════════════════════════════════════════════════════════════════
      if (uniqueArticles.length === 0 && articles.length > 0) {
        this.logger.warn(
          `⚠️ RECOVERY MODE: All ${articles.length} articles were duplicates. Attempting relaxed selection...`,
        );

        // Sort by relevance score and try each article with URL-only check
        const sortedByScore = [...articles].sort(
          (a, b) => b.relevanceScore - a.relevanceScore,
        );

        for (const article of sortedByScore) {
          // Only check URL duplicate (most strict, fastest)
          const normalizedUrl = this.normalizeUrl(article.url);
          const existingByUrl = await db.article.findFirst({
            where: {
              OR: [
                { sourceUrl: normalizedUrl },
                { sourceUrl: { startsWith: normalizedUrl.split("?")[0] } },
              ],
            },
            select: { id: true },
          });

          if (!existingByUrl) {
            // Found one that's not a URL duplicate - use it!
            const topic = this.extractTopic(article.title);
            let embedding: number[] | undefined;
            try {
              const combinedText =
                `${article.title}. ${article.description || ""}`.trim();
              embedding = await generateEmbedding(combinedText);
            } catch {
              // Ignore embedding errors
            }

            uniqueArticles.push({
              ...article,
              topic,
              isDuplicate: false,
              duplicateReason: "RECOVERY_MODE_URL_ONLY",
              embedding,
              _needsVariation: true, // Recovery mode = force variation
              _similarArticles: [],
            } as any);

            this.logger.success(
              `🔄 RECOVERY: Selected "${article.title.substring(0, 50)}..." (score: ${article.relevanceScore})`,
            );
            break;
          }
        }

        if (uniqueArticles.length === 0) {
          this.logger.error(
            `❌ RECOVERY FAILED: All articles have URL duplicates in database`,
          );
        }
      }

      const duplicateRate = ((duplicateCount / articles.length) * 100).toFixed(
        1,
      );
      const variationRate = ((variationCount / uniqueArticles.length) * 100).toFixed(
        1,
      );

      this.logger.success(
        `🎯 Result: ${uniqueArticles.length}/${articles.length} unique (${duplicateRate}% URL duplicates, ${variationRate}% need variation)`,
      );

      return {
        success: true,
        data: uniqueArticles,
        nextQueue: QUEUE_NAMES.TREND_ENRICHMENT, // Route to TrendEnricher
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls: 0,
          itemsProcessed: uniqueArticles.length,
        },
      };
    } catch (error) {
      this.logger.error(
        "Duplicate detection failed:",
        this.serializeError(error),
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls: 0,
          itemsProcessed: 0,
        },
      };
    }
  }

  /**
   * 🆕 YENİ: Check if article is duplicate
   *
   * Sadece URL duplicate'lerini engelle.
   * Benzer konular VARIATION ile işlenecek.
   */
  private async checkDuplicate(
    article: ScoredArticle,
  ): Promise<{ isDuplicate: boolean; reason?: string; needsVariation?: boolean; similarArticles?: any[] }> {
    // ═══════════════════════════════════════════════════════════════════
    // KATMAN 1: Sadece URL duplicate kontrolü (strict)
    // Aynı kaynaktan tekrar yazmayı engelle
    // ═══════════════════════════════════════════════════════════════════
    const normalizedUrl = this.normalizeUrl(article.url);
    const existingByUrl = await db.article.findFirst({
      where: {
        OR: [
          { sourceUrl: normalizedUrl },
          { sourceUrl: { startsWith: normalizedUrl.split("?")[0] } },
        ],
      },
      select: { id: true, title: true, topic: true, publishedAt: true },
    });

    if (existingByUrl) {
      return {
        isDuplicate: true,
        reason: "EXACT_URL_MATCH",
      };
    }

    // ═══════════════════════════════════════════════════════════════════
    // 🆕 KATMAN 2: Benzer konuları bul (variation için)
    // Bu konuları ENGELLE, variation bayrağı ile işaretle
    // ═══════════════════════════════════════════════════════════════════
    const entities = this.extractEntities(article.title.toLowerCase());

    if (entities.length >= 1) {
      // Son 24 saatteki benzer makaleleri bul
      const recentArticles = await db.article.findMany({
        where: {
          publishedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 saat
          },
          status: "PUBLISHED",
        },
        select: {
          id: true,
          title: true,
          topic: true,
          publishedAt: true,
        },
        take: 50,
      });

      const similarArticles: any[] = [];

      for (const existing of recentArticles) {
        const existingEntities = this.extractEntities(existing.title.toLowerCase());
        const commonEntities = entities.filter((e) => existingEntities.includes(e));

        // 1+ ortak entity varsa benzer kabul et
        if (commonEntities.length >= 1) {
          similarArticles.push({
            ...existing,
            commonEntities,
          });
        }
      }

      // Benzer makaleler varsa, variation bayrağını set et
      if (similarArticles.length > 0) {
        this.logger.info(
          `🎯 Similar topics found: ${similarArticles.length} - "${article.title.substring(0, 40)}..."`,
        );
        similarArticles.forEach((s, i) => {
          this.logger.info(
            `   ${i + 1}. [${s.commonEntities.join(", ")}] "${s.title.substring(0, 40)}..."`,
          );
        });

        return {
          isDuplicate: false,
          reason: "NEEDS_VARIATION",
          needsVariation: true,
          similarArticles,
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Entity-based duplicate detection (Layer 3)
   */
  private async checkEntityBasedDuplicate(
    title: string,
  ): Promise<{ isDuplicate: boolean; reason?: string }> {
    const lowerTitle = title.toLowerCase();
    const entities = this.extractEntities(lowerTitle);

    if (entities.length < 2) {
      return { isDuplicate: false };
    }

    // Check recent articles (last 48 hours)
    const recentArticles = await db.article.findMany({
      where: {
        publishedAt: {
          gte: new Date(Date.now() - 48 * 60 * 60 * 1000),
        },
        status: "PUBLISHED",
      },
      select: {
        id: true,
        title: true,
      },
    });

    for (const article of recentArticles) {
      const existingEntities = this.extractEntities(
        article.title.toLowerCase(),
      );
      const commonEntities = entities.filter((e) =>
        existingEntities.includes(e),
      );

      // DISABLED: Entity matching is too aggressive
      // Smart filtering already does topic-based duplicate detection
      // Only log for debugging, don't reject
      if (commonEntities.length >= 2) {
        this.logger.warn(
          `⚠️ Entity overlap (not rejecting): ${commonEntities.join("+")} - "${title.substring(0, 50)}..."`,
        );
        // Previously: return { isDuplicate: true, reason: `ENTITY_MATCH_${commonEntities.join("+")}` };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Extract entities from title
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];

    const companyPatterns = [
      { pattern: /openai|gpt|chatgpt|sam altman/i, entity: "openai" },
      { pattern: /google|gemini|bard|deepmind/i, entity: "google" },
      { pattern: /microsoft|copilot|azure ai/i, entity: "microsoft" },
      { pattern: /meta|llama|zuckerberg/i, entity: "meta" },
      { pattern: /nvidia|jensen huang|cuda|gpu/i, entity: "nvidia" },
      { pattern: /apple|siri|apple intelligence/i, entity: "apple" },
      { pattern: /tesla|autopilot|elon musk|optimus/i, entity: "tesla" },
      { pattern: /anthropic|claude/i, entity: "anthropic" },
      { pattern: /amazon|alexa|aws ai/i, entity: "amazon" },
      { pattern: /deepseek/i, entity: "deepseek" },
      { pattern: /mistral/i, entity: "mistral" },
      { pattern: /xai|grok/i, entity: "xai" },
      // NEW: Additional AI companies (2026 update)
      { pattern: /cohere/i, entity: "cohere" },
      { pattern: /stability|stable diffusion/i, entity: "stability" },
      { pattern: /midjourney/i, entity: "midjourney" },
      { pattern: /perplexity/i, entity: "perplexity" },
      { pattern: /runway/i, entity: "runway" },
      { pattern: /hugging\s*face/i, entity: "huggingface" },
      { pattern: /alibaba|qwen/i, entity: "alibaba" },
      { pattern: /baidu|ernie/i, entity: "baidu" },
      { pattern: /samsung/i, entity: "samsung" },
      { pattern: /intel/i, entity: "intel" },
      { pattern: /amd/i, entity: "amd" },
      { pattern: /qualcomm/i, entity: "qualcomm" },
      // Turkish tech companies
      { pattern: /turkcell/i, entity: "turkcell" },
      { pattern: /türk telekom/i, entity: "turktelekom" },
      { pattern: /getir/i, entity: "getir" },
      { pattern: /trendyol/i, entity: "trendyol" },
    ];

    const actionPatterns = [
      { pattern: /ban|yasak|yasakla/i, entity: "ban" },
      { pattern: /launch|release|tanıt|duyur/i, entity: "launch" },
      { pattern: /acquisition|satın al|merge|birleş/i, entity: "acquisition" },
      { pattern: /investment|yatırım|fund|fon/i, entity: "investment" },
      {
        pattern: /partnership|ortaklık|collab|işbirliği/i,
        entity: "partnership",
      },
      // NEW: Additional action patterns
      { pattern: /düzenleme|regülasyon|regulation/i, entity: "regulation" },
      { pattern: /ipo|halka arz/i, entity: "ipo" },
      { pattern: /lawsuit|dava|sue/i, entity: "legal" },
      { pattern: /hack|sızıntı|breach|ihlal/i, entity: "security" },
      { pattern: /record|rekor/i, entity: "record" },
      { pattern: /layoff|işten çıkar|downsiz/i, entity: "layoff" },
    ];

    const countryPatterns = [
      { pattern: /indonesia|endonezya/i, entity: "indonesia" },
      { pattern: /china|çin/i, entity: "china" },
      { pattern: /eu|avrupa birliği|european union/i, entity: "eu" },
      { pattern: /usa|amerika|united states/i, entity: "usa" },
      // NEW: Additional countries
      { pattern: /türkiye|turkey/i, entity: "turkey" },
      { pattern: /japan|japonya/i, entity: "japan" },
      { pattern: /korea|güney kore/i, entity: "korea" },
      { pattern: /india|hindistan/i, entity: "india" },
      { pattern: /uk|ingiltere|britain/i, entity: "uk" },
      { pattern: /germany|almanya/i, entity: "germany" },
      { pattern: /france|fransa/i, entity: "france" },
    ];

    // NEW: Technology/product patterns
    const techPatterns = [
      { pattern: /robot|robotik/i, entity: "robotics" },
      { pattern: /autonomous|otonom/i, entity: "autonomous" },
      { pattern: /quantum|kuantum/i, entity: "quantum" },
      { pattern: /semiconductor|yarı iletken|chip/i, entity: "semiconductor" },
      { pattern: /5g|6g/i, entity: "mobile_network" },
      { pattern: /blockchain|kripto|crypto/i, entity: "blockchain" },
      { pattern: /ar|vr|metaverse|sanal gerçeklik/i, entity: "xr" },
    ];

    const allPatterns = [
      ...companyPatterns,
      ...actionPatterns,
      ...countryPatterns,
      ...techPatterns,
    ];

    for (const { pattern, entity } of allPatterns) {
      if (pattern.test(text)) {
        entities.push(entity);
      }
    }

    return [...new Set(entities)];
  }

  /**
   * Extract topic identifier from title
   */
  private extractTopic(title: string): string {
    const entities = this.extractEntities(title.toLowerCase());

    if (entities.length === 0) {
      // Fallback: use first 3 words
      return title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .split(/\s+/)
        .slice(0, 3)
        .join("_");
    }

    // Use entities as topic
    return entities.slice(0, 3).join("_");
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.origin}${urlObj.pathname.replace(/\/$/, "")}`;
    } catch {
      return url;
    }
  }
}
