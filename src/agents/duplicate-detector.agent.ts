/**
 * Duplicate Detector Agent
 *
 * RESPONSIBILITIES:
 * 1. Check for duplicate articles using 3-layer detection
 * 2. Layer 1: Exact URL match (PostgreSQL)
 * 3. Layer 2: Qdrant vector similarity (title + excerpt embeddings)
 * 4. Layer 3: Entity-based matching (company + action + timeframe)
 * 5. Store topic in Article.topic field for future checks
 * 6. Emit unique articles to unique-articles queue
 *
 * EXTRACTED FROM: src/services/intelligent-news.service.ts - isArticleDuplicate()
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import { db } from "@/lib/db";
import { isDuplicateNews } from "@/services/news.service";
import type { ScoredArticle } from "./relevance-filter.agent";

export interface UniqueArticle extends ScoredArticle {
  topic?: string; // Short topic identifier for duplicate detection
  isDuplicate: boolean;
  duplicateReason?: string;
}

export class DuplicateDetectorAgent extends BaseAgent<
  ScoredArticle[],
  UniqueArticle[]
> {
  protected config = {
    name: "duplicate-detector",
    queueName: QUEUE_NAMES.UNIQUE_ARTICLES,
    nextQueueName: QUEUE_NAMES.ENRICHED_ARTICLES,
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
          uniqueArticles.push({
            ...article,
            topic,
            isDuplicate: false,
          });
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
        nextQueue: QUEUE_NAMES.ENRICHED_ARTICLES,
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
    // Layer 1: Exact URL match
    const normalizedUrl = this.normalizeUrl(article.url);
    const existingByUrl = await db.article.findFirst({
      where: {
        OR: [
          { sourceUrl: normalizedUrl },
          { sourceUrl: { startsWith: normalizedUrl.split("?")[0] } },
        ],
      },
      select: { id: true, title: true },
    });

    if (existingByUrl) {
      return {
        isDuplicate: true,
        reason: "EXACT_URL_MATCH",
      };
    }

    // Layer 2: Entity-based semantic matching
    const entityMatch = await this.checkEntityBasedDuplicate(article.title);
    if (entityMatch.isDuplicate) {
      return entityMatch;
    }

    // Layer 3: Advanced title/content similarity (using existing service)
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
   * Entity-based duplicate detection
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

      // 2+ common entities = likely same story
      if (commonEntities.length >= 2) {
        return {
          isDuplicate: true,
          reason: `ENTITY_MATCH_${commonEntities.join("+")}`,
        };
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
    ];

    const actionPatterns = [
      { pattern: /ban|yasak|yasakla/i, entity: "ban" },
      { pattern: /launch|release|tanıt|duyur/i, entity: "launch" },
      { pattern: /acquisition|satın al|merge|birleş/i, entity: "acquisition" },
      { pattern: /investment|yatırım|fund/i, entity: "investment" },
      { pattern: /partnership|ortaklık|collab/i, entity: "partnership" },
    ];

    const countryPatterns = [
      { pattern: /indonesia|endonezya/i, entity: "indonesia" },
      { pattern: /china|çin/i, entity: "china" },
      { pattern: /eu|avrupa birliği|european union/i, entity: "eu" },
      { pattern: /usa|amerika|united states/i, entity: "usa" },
    ];

    const allPatterns = [
      ...companyPatterns,
      ...actionPatterns,
      ...countryPatterns,
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
