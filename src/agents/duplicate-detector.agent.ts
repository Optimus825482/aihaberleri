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

export class DuplicateDetectorAgent extends BaseAgent<
  ScoredArticle[],
  UniqueArticle[]
> {
  protected config = {
    name: "duplicate-detector",
    queueName: QUEUE_NAMES.UNIQUE_ARTICLES,
    nextQueueName: QUEUE_NAMES.RELEVANT_ARTICLES, // 🆕 Route to RelevanceFilter FIRST (09.02.2026)
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

      // ✅ CLEAN DUPLICATE HANDLING: No forced publishing (2026-02-09)
      // If ALL articles are duplicates, return empty array and wait for next run
      if (uniqueArticles.length === 0 && articles.length > 0) {
        this.logger.warn(
          `⚠️ All ${articles.length} articles are duplicates. Waiting for new content in next run.`,
        );

        return {
          success: true,
          data: [], // Return empty array - no forced publishing
          skipNextQueue: true, // Don't send to next queue
          metrics: {
            processingTime: Date.now() - startTime,
            apiCalls: 0,
            itemsProcessed: 0,
          },
        };
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
        nextQueue: QUEUE_NAMES.RELEVANT_ARTICLES, // Route to RelevanceFilter (Duplicate → Relevance → Trend)
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
   * Check if article is duplicate using URL detection
   *
   * UPDATED (2026-02-12):
   * - Layer 1: URL match WITHOUT time window (prevents wasted pipeline runs)
   * - Layer 2: Recent URL match with time window (6h) as fallback
   *
   * Previous bug: 6-hour time window meant articles published >6h ago
   * would pass duplicate check, go through entire pipeline (enrichment,
   * visual generation, API calls), only to be rejected at database-publisher.
   * Each wasted run cost ~130s + DeepSeek + Pollinations API calls.
   */
  private async checkDuplicate(
    article: ScoredArticle,
  ): Promise<{ isDuplicate: boolean; reason?: string }> {
    const normalizedUrl = this.normalizeUrl(article.url);

    // For YouTube URLs, only match exact normalized URL (including ?v= param)
    // For other URLs, also try startsWith match (without query params)
    const isYouTubeUrl =
      article.url.includes("youtube.com/watch") ||
      article.url.includes("youtu.be/");
    const urlConditions: any[] = [{ sourceUrl: normalizedUrl }];
    if (!isYouTubeUrl) {
      urlConditions.push({
        sourceUrl: { startsWith: normalizedUrl.split("?")[0] },
      });
    }

    // Layer 1: Check if URL exists in DB at ALL (no time window)
    // This is the critical fix — prevents entire pipeline from running
    // on articles that are already published
    const existingByUrl = await db.article.findFirst({
      where: {
        OR: urlConditions,
      },
      select: { id: true, title: true },
    });

    if (existingByUrl) {
      return {
        isDuplicate: true,
        reason: "URL_EXISTS_IN_DB",
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Extract topic identifier from title
   * SIMPLIFIED: Just use first 3-4 significant words (no entity extraction)
   */
  private extractTopic(title: string): string {
    const stopWords = [
      "haber",
      "için",
      "olan",
      "bir",
      "ile",
      "yeni",
      "dedi",
      "etti",
      "oldu",
      "news",
      "this",
      "that",
      "with",
      "from",
      "will",
      "new",
      "the",
      "and",
    ];

    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.includes(w));

    // Take first 3-4 significant words as topic
    return words.slice(0, 4).join("_");
  }

  /**
   * Normalize URL for comparison
   * IMPORTANT: Preserves query params for YouTube URLs (watch?v=xxx is the unique identifier)
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // YouTube URLs: the video ID is in the query param ?v=xxx
      // Stripping query params would make ALL YouTube URLs identical!
      if (
        urlObj.hostname.includes("youtube.com") &&
        urlObj.searchParams.has("v")
      ) {
        return `${urlObj.origin}${urlObj.pathname}?v=${urlObj.searchParams.get("v")}`;
      }
      // For youtu.be short URLs, the path IS the video ID
      if (urlObj.hostname === "youtu.be") {
        return `${urlObj.origin}${urlObj.pathname.replace(/\/$/, "")}`;
      }
      return `${urlObj.origin}${urlObj.pathname.replace(/\/$/, "")}`;
    } catch {
      return url;
    }
  }
}
