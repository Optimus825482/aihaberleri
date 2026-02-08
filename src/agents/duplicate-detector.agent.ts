/**
 * Duplicate Detector Agent
 *
 * RESPONSIBILITIES:
 * 1. Check for URL duplicates (PostgreSQL)
 * 2. Store topic in Article.topic field for future checks
 * 3. Emit articles to next queue
 */

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

// 🚨 GUARANTEED MINIMUM PUBLISH CONFIG
const FORCE_PUBLISH_CONFIG = {
  // Minimum number of articles to publish per run (GUARANTEED)
  MINIMUM_ARTICLES: 1,
  // Allow more articles in force mode if available (up to this limit)
  FORCE_MAX_ARTICLES: 3,
  // Log level for force publish operations
  VERBOSE_LOGGING: true,
};

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

    this.logger.info(`Checking ${articles.length} articles for duplicates...`);

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

      for (const article of articles) {
        // Extract topic for future duplicate checks
        const topic = this.extractTopic(article.title);

        // Check for duplicates using multi-layer detection
        const duplicateCheck = await this.checkDuplicate(article);

        if (duplicateCheck.isDuplicate) {
          duplicateCount++;
          this.logger.info(
            `Duplicate: ${article.title.substring(0, 50)}... (${duplicateCheck.reason})`,
          );
        } else {
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
          });
        }
      }

      // 🔧 RECOVERY MECHANISM: Minimum 1 article guarantee (06.02.2026)
      // If ALL articles were rejected as duplicates, pick the highest scored one with ONLY URL check
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
            });

            this.logger.success(
              `🔄 RECOVERY: Selected "${article.title.substring(0, 50)}..." (score: ${article.relevanceScore})`,
            );
            break;
          }
        }

        // 🚨 FORCE PUBLISH MECHANISM: Guaranteed minimum articles (2026-02-09)
        // If recovery also failed, FORCE publish the highest scored articles
        // This ensures at least MINIMUM_ARTICLES is always published per run
        if (uniqueArticles.length === 0) {
          this.logger.warn(
            `⚠️ RECOVERY FAILED: All articles URL duplicates. Activating FORCE PUBLISH...`,
          );

          // Get the top scored articles - will publish regardless of duplicate status
          const articlesToForce = sortedByScore.slice(
            0,
            FORCE_PUBLISH_CONFIG.FORCE_MAX_ARTICLES,
          );

          for (const article of articlesToForce) {
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
              isDuplicate: false, // Force as non-duplicate
              duplicateReason: "FORCE_PUBLISH_GUARANTEED",
              embedding,
            });

            if (FORCE_PUBLISH_CONFIG.VERBOSE_LOGGING) {
              this.logger.success(
                `🚀 FORCE PUBLISH [${uniqueArticles.length}/${FORCE_PUBLISH_CONFIG.FORCE_MAX_ARTICLES}]: "${article.title.substring(0, 50)}..." (score: ${article.relevanceScore})`,
              );
            }

            // Stop if we have enough for guaranteed minimum
            if (
              uniqueArticles.length >= FORCE_PUBLISH_CONFIG.MINIMUM_ARTICLES
            ) {
              break;
            }
          }

          this.logger.success(
            `✅ FORCE PUBLISH COMPLETE: ${uniqueArticles.length} articles will be published (duplicate override active)`,
          );
        }
      }

      // 🔒 FINAL GUARANTEE: Ensure at least 1 article even if something went wrong
      if (uniqueArticles.length === 0 && articles.length > 0) {
        this.logger.warn(
          `🔒 FINAL FALLBACK: All mechanisms failed. Force-selecting top article...`,
        );
        const sortedByScore = [...articles].sort(
          (a, b) => b.relevanceScore - a.relevanceScore,
        );
        const bestArticle = sortedByScore[0];
        if (bestArticle) {
          const topic = this.extractTopic(bestArticle.title);
          uniqueArticles.push({
            ...bestArticle,
            topic,
            isDuplicate: false,
            duplicateReason: "FINAL_FALLBACK_GUARANTEE",
            embedding: undefined,
          });
          this.logger.success(
            `🔒 FINAL FALLBACK SUCCESS: "${bestArticle.title.substring(0, 50)}..." selected`,
          );
        }
      }

      const duplicateRate = ((duplicateCount / articles.length) * 100).toFixed(
        1,
      );

      this.logger.success(
        `Duplicate check: ${uniqueArticles.length}/${articles.length} unique (${duplicateRate}% duplicates)`,
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
   * Check if article is duplicate using multi-layer detection
   */
  private async checkDuplicate(
    article: ScoredArticle,
  ): Promise<{ isDuplicate: boolean; reason?: string }> {
    // Layer 0: DISABLED - Topic matching was too aggressive
    // Problem: Generic patterns like "yatırım" matched too many unrelated articles
    // extractTopic() would return "investment" for many different news stories
    // causing 100% rejection rate. URL + Semantic matching is sufficient.
    //
    // Original code (disabled 2026-02-08):
    // const topic = this.extractTopic(article.title);
    // const existingRecentTopic = await db.article.findFirst({...});
    // if (existingRecentTopic) return { isDuplicate: true, reason: `TOPIC_MATCH_12H...` };
    //
    // TODO: Re-enable with smarter topic extraction (company+action required)

    // Layer 1: Exact URL match (last 7 days - increased from 1 day on 08.02.2026)
    // NOTE: Early filtering uses 24h, but we use 7 days here for safety margin
    // This prevents blocking legitimately NEW articles that have old historical coverage
    const normalizedUrl = this.normalizeUrl(article.url);
    const urlTimeWindow = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days
    const existingByUrl = await db.article.findFirst({
      where: {
        AND: [
          {
            OR: [
              { sourceUrl: normalizedUrl },
              { sourceUrl: { startsWith: normalizedUrl.split("?")[0] } },
            ],
          },
          { publishedAt: { gte: urlTimeWindow } },
        ],
      },
      select: { id: true, title: true },
    });

    if (existingByUrl) {
      return {
        isDuplicate: true,
        reason: "EXACT_URL_MATCH_7D",
      };
    }

    // Layer 2: Vector similarity using pgvector (semantic duplicates)
    try {
      const semanticCheck = await checkSemanticDuplicate(
        article.title,
        article.description,
        0.78, // Lowered from 0.9 - more sensitive duplicate detection (08.02.2026)
        48, // 48-hour window (covers 12h requirement too)
      );

      if (semanticCheck.isDuplicate) {
        return {
          isDuplicate: true,
          reason: `SEMANTIC_MATCH_${Math.round((semanticCheck.similarity || 0) * 100)}%`,
        };
      }
    } catch (error) {
      // Log but don't block on embedding errors
      this.logger.warn(
        `Semantic duplicate check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }

    // Layer 3: Entity-based semantic matching
    const entityMatch = await this.checkEntityBasedDuplicate(article.title);
    if (entityMatch.isDuplicate) {
      return entityMatch;
    }

    // Layer 4: Advanced title/content similarity (using existing service)
    const duplicateCheck = await isDuplicateNews(
      article.title,
      article.description,
      72, // 72-hour window
    );

    if (duplicateCheck.isDuplicate) {
      return {
        isDuplicate: true,
        reason: duplicateCheck.reason,
      };
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

    // Check recent articles (last 12 hours)
    const recentArticles = await db.article.findMany({
      where: {
        publishedAt: {
          gte: new Date(Date.now() - 12 * 60 * 60 * 1000),
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

      // Smart entity matching: Same company + same action within 24h = duplicate (08.02.2026)
      if (commonEntities.length >= 2) {
        const companies = [
          "openai",
          "google",
          "microsoft",
          "meta",
          "nvidia",
          "apple",
          "amazon",
          "tesla",
          "anthropic",
          "deepseek",
        ];
        const actions = [
          "launch",
          "ban",
          "acquisition",
          "investment",
          "partnership",
          "regulation",
          "ipo",
          "legal",
        ];

        const hasCompany = commonEntities.some((e) => companies.includes(e));
        const hasAction = commonEntities.some((e) => actions.includes(e));

        // Calculate time difference
        const existingArticle = recentArticles.find((a) => a.id === article.id);
        const hoursDiff = existingArticle
          ? (Date.now() -
              new Date(existingArticle.publishedAt || Date.now()).getTime()) /
            (60 * 60 * 1000)
          : 0;

        if (hasCompany && hasAction && hoursDiff < 24) {
          this.logger.warn(
            `🚫 Entity match (company+action): ${commonEntities.join("+")} - "${title.substring(0, 50)}..."`,
          );
          return {
            isDuplicate: true,
            reason: `ENTITY_MATCH_${commonEntities.join("+")}`,
          };
        }

        // Log but don't reject if only entity overlap without company+action
        this.logger.warn(
          `⚠️ Entity overlap (not rejecting): ${commonEntities.join("+")} - "${title.substring(0, 50)}..."`,
        );
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
