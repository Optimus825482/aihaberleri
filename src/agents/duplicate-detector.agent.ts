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
   * Check if article is duplicate using SIMPLE URL-only detection
   *
   * SIMPLIFIED (2026-02-08):
   * - ONLY Layer 1: URL match (12 hours)
   * - NO semantic similarity
   * - NO title/content similarity
   * - NO entity matching
   *
   * Reason: Duplicate filtering already done in news.service.ts
   * This is just a safety check
   */
  private async checkDuplicate(
    article: ScoredArticle,
  ): Promise<{ isDuplicate: boolean; reason?: string }> {
    // Layer 1: Exact URL match (last 6 hours) - ONLY CHECK!
    const normalizedUrl = this.normalizeUrl(article.url);
    const urlTimeWindow = new Date(Date.now() - 6 * 60 * 60 * 1000); // 6 hours (changed from 12)
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
        reason: "EXACT_URL_MATCH_12H",
      };
    }

    // ✅ NO OTHER CHECKS - Keep it simple!
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
