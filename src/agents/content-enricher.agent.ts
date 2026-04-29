/**
 * Content Enricher Agent
 *
 * @deprecated Orchestrator artık SourceGatherer + ContentSynthesizer kullanıyor.
 * Bu agent ENRICHED_ARTICLES_LEGACY kuyruğunu dinler; ENRICHED_ARTICLES ile çakışmaz.
 * Yeni pipeline: TrendEnricher → ENRICHED_ARTICLES → SourceGatherer → CONTENT_SYNTHESIS → …
 *
 * RESPONSIBILITIES:
 * 1. Multi-source research (Google News + Jina Reader)
 * 2. Gather sources, LLM synthesis (TR + EN), emit to articles-with-visuals
 *
 * EXTRACTED FROM: src/services/intelligent-news.service.ts
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult, retryWithBackoff } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import { googleNewsSearch, type GoogleNewsSearchResult as GoogleNewsResult } from "@/lib/google-news-search";
import { callDeepSeek } from "@/lib/deepseek";
// callGemini REMOVED - Using DeepSeek-only (Gemini API deprecated due to 404 errors)

import {
  batchExtract,
  priorityExtract,
  filterQualityResults,
} from "@/lib/tavily-extract";
import axios from "axios";
import type { UniqueArticle } from "./duplicate-detector.agent";
// Re-enrichment path — extra services for rejected articles
import { exaSearch } from "@/lib/exa";
import { firecrawlScrape, isFirecrawlAvailable } from "@/lib/firecrawl";

export interface EnrichedArticle extends UniqueArticle {
  hasNoExternalSources?: boolean; // true when Google News+Jina+Tavily returned 0 results — hallucination risk flag
  sources: Array<{
    title: string;
    url: string;
    content: string;
    relevanceScore: number;
  }>;
  synthesizedContent: {
    tr: {
      title: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
      metaTitle?: string;
      score: number;
    };
    en: {
      title: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
      metaTitle?: string;
    };
  };
}

const JINA_READER_URL = "https://r.jina.ai";
const JINA_TIMEOUT = 20000; // FIX: 20s (was 15s — heavy sites cause timeouts)
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";
const TAVILY_TIMEOUT = 20000;
const SEARXNG_TIMEOUT = 10000; // FIX: 10s (was 8s)
const TARGET_SOURCE_COUNT = 3; // Keep at 3 for speed

// Layer timeouts for fallback strategy
const LAYER_1_TIMEOUT = 20000; // 20s for Tavily (high-priority)
const LAYER_2_TIMEOUT = 25000; // 25s for Google News + Jina
const LAYER_3_TIMEOUT = 30000; // 30s for LLM synthesis
const MAX_ARTICLE_TIMEOUT = 90000; // FIX: 90s HARD LIMIT per article (was 60s — too tight for heavy enrichment)

/**
 * Circuit Breaker for API failure protection
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";

  async execute<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    // If circuit is OPEN, use fallback immediately
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailTime > 60000) {
        this.state = "HALF_OPEN"; // Try again after 1 minute
      } else {
        return fallback();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      return fallback();
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  private onFailure() {
    this.failures++;
    this.lastFailTime = Date.now();

    if (this.failures >= 3) {
      this.state = "OPEN"; // Stop trying after 3 failures
      this.logger?.warn(`Circuit breaker OPEN after ${this.failures} failures`);
    }
  }

  private logger?: any;
  setLogger(logger: any) {
    this.logger = logger;
  }
}

export class ContentEnricherAgent extends BaseAgent<
  UniqueArticle[],
  EnrichedArticle[]
> {
  protected config = {
    name: "content-enricher",
    queueName: QUEUE_NAMES.ENRICHED_ARTICLES_LEGACY, // DEPRECATED: SourceGatherer uses ENRICHED_ARTICLES
    nextQueueName: QUEUE_NAMES.ARTICLES_WITH_VISUALS,
    enableMetrics: true,
  };

  // Circuit breakers for API protection
  private tavilyBreaker = new CircuitBreaker();
  private jinaBreaker = new CircuitBreaker();
  private llmBreaker = new CircuitBreaker();

  constructor() {
    super("content-enricher");
    this.tavilyBreaker.setLogger(this.logger);
    this.jinaBreaker.setLogger(this.logger);
    this.llmBreaker.setLogger(this.logger);
  }

  protected async process(
    job: Job<UniqueArticle[]>,
  ): Promise<AgentResult<EnrichedArticle[]>> {
    const articles = job.data;
    const startTime = Date.now();
    let apiCalls = 0;
    let tokensUsed = 0;

    this.logger.info(`Enriching ${articles.length} articles...`);

    if (articles.length === 0) {
      return {
        success: true,
        data: [],
        skipNextQueue: true,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls: 0,
          tokensUsed: 0,
          itemsProcessed: 0,
        },
      };
    }

    try {
      // 🚀 CONTROLLED CONCURRENCY: Process 2 articles at a time to avoid API overload
      this.logger.info(
        `🚀 Starting CONTROLLED enrichment for ${articles.length} articles (concurrency: 2)...`,
      );

      const enrichedArticles: EnrichedArticle[] = [];
      const CONCURRENCY = 2;

      for (let i = 0; i < articles.length; i += CONCURRENCY) {
        const batch = articles.slice(i, i + CONCURRENCY);
        this.logger.info(
          `📦 Processing batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(articles.length / CONCURRENCY)} (${batch.length} articles)`,
        );

        const enrichmentPromises = batch.map(async (article, batchIndex) => {
          const index = i + batchIndex;
          const articleNum = index + 1;
          this.logger.info(
            `[${articleNum}/${articles.length}] Enriching: ${article.title.substring(0, 50)}...`,
          );

          try {
            // ─── RE-ENRICHMENT FLAGS ────────────────────────────────────────
            // Set by database-publisher when an article failed a quality gate.
            // Forces a deeper, multi-service source-gathering pass.
            const isReEnrich = (article as any)._forceReEnrich === true;
            const rejectionReason = (article as any)._rejectionReason as
              | string
              | undefined;

            if (isReEnrich) {
              this.logger.warn(
                `🔁 DEEP RE-ENRICH mode: [${articleNum}/${articles.length}] "${article.title.substring(0, 50)}" (reason: ${rejectionReason ?? "unknown"})`,
              );
            }

            // Step 1: Gather sources
            // • Normal path  (40s)  — Google News + Tavily/Jina
            // • Re-enrich path (65s) — Exa + Google News wide-net + Firecrawl fallback
            const sourceTimeout = isReEnrich ? 65_000 : 40_000;
            const sources = await Promise.race([
              isReEnrich
                ? this.gatherSourcesAggressive(article, rejectionReason)
                : this.gatherSourcesWithPriority(article),
              new Promise<any>((_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        `Source gathering timeout (${sourceTimeout / 1000}s)`,
                      ),
                    ),
                  sourceTimeout,
                ),
              ),
            ]);

            // 🛡️ ZERO-SOURCE DETECTION: mark articles with no external grounding
            const hadNoExternalSources = sources.length === 0;
            if (hadNoExternalSources) {
              this.logger.warn(
                `⚠️  KAYNAK YOK: [${articleNum}/${articles.length}] "${article.title.substring(0, 60)}" için hiç dış kaynak bulunamadı — makale %100 LLM üretimidir, yayın engeli aktif`,
              );
            }

            if (sources.length < 2) {
              this.logger.warn(
                `[${articleNum}] Insufficient sources (${sources.length}), using fallback`,
              );
              sources.push({
                title: article.title,
                url: article.url,
                content: article.description || "",
                relevanceScore: 100,
              });
            }

            // Step 2: Synthesize content (TR + EN)
            // TIMEOUT PROTECTION: 180s timeout — NVIDIA/Qwen can take 90-150s for large content
            const synthesized = await Promise.race([
              this.synthesizeContent(
                article,
                sources,
                article.suggestedCategory || "yapay-zeka",
                // Pre-prime the retry loop with the known rejection reason so
                // the LLM starts with corrective instructions from attempt 0.
                isReEnrich ? rejectionReason : undefined,
              ),
              new Promise<any>((_, reject) =>
                setTimeout(
                  () => reject(new Error("Content synthesis timeout (180s)")),
                  180000, // NVIDIA/Qwen may take 90-150s, DeepSeek fallback 60-90s
                ),
              ),
            ]);

            this.logger.success(
              `✅ [${articleNum}/${articles.length}] Enriched: ${synthesized.tr.title.substring(0, 50)}...`,
            );

            return {
              success: true as const,
              data: {
                ...article,
                sources,
                synthesizedContent: synthesized,
                hasNoExternalSources: hadNoExternalSources,
              },
            };
          } catch (error) {
            this.logger.error(
              `❌ [${articleNum}] Failed to enrich: ${article.title.substring(0, 50)}...`,
              this.serializeError(error),
            );

            // FIXED: Log detailed error information
            if (error instanceof Error) {
              this.logger.error(
                `❌ [${articleNum}] Error details: ${error.message}`,
              );
              if (error.stack) {
                this.logger.error(
                  `❌ [${articleNum}] Stack trace: ${error.stack.substring(0, 500)}`,
                );
              }
            }

            return { success: false as const, error };
          }
        });

        // Wait for batch to complete
        const results = await Promise.allSettled(enrichmentPromises);

        for (const result of results) {
          if (result.status === "fulfilled" && result.value.success) {
            enrichedArticles.push(result.value.data);
            apiCalls += 8; // Approximate: 5 Google News + 2 LLM + 1 A/B test
            tokensUsed += 12500;
          }
        }
      }

      const successCount = enrichedArticles.length;
      const failCount = articles.length - successCount;

      this.logger.success(
        `🏁 CONTROLLED enrichment complete: ${successCount}/${articles.length} articles (${failCount} failed)`,
      );

      return {
        success: true,
        data: enrichedArticles,
        nextQueue: QUEUE_NAMES.ARTICLES_WITH_VISUALS,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls,
          tokensUsed,
          itemsProcessed: enrichedArticles.length,
        },
      };
    } catch (error) {
      this.logger.error(
        "Content enrichment failed:",
        this.serializeError(error),
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls,
          tokensUsed,
          itemsProcessed: 0,
        },
      };
    }
  }

  /**
   * Gather sources using Tavily (DEEP RESEARCH) + Google News + Jina Reader
   * UPDATED: 2026-02-08 - Added Tavily deep research for richer content
   */
  private async gatherSources(article: UniqueArticle): Promise<
    Array<{
      title: string;
      url: string;
      content: string;
      relevanceScore: number;
    }>
  > {
    const sources: Array<{
      title: string;
      url: string;
      content: string;
      relevanceScore: number;
    }> = [];
    const seenUrls = new Set<string>();

    seenUrls.add(this.normalizeUrl(article.url));

    // Extract keywords for search
    const keywords = this.extractSearchKeywords(
      article.title,
      article.description,
    );

    this.logger.info(`🔍 Deep research: Tavily + Google News for "${keywords}"`);

    // ============================================
    // STEP 1: Tavily Deep Research (5-8 sources)
    // ============================================
    let tavilySourceCount = 0;
    try {
      const { tavilySearch } = await import("@/lib/tavily");

      this.logger.info(`🔬 Tavily deep research starting...`);

      const tavilyResults = await tavilySearch(keywords, {
        max_results: 8,
      });

      for (const result of tavilyResults) {
        const normalizedUrl = this.normalizeUrl(result.url);
        if (seenUrls.has(normalizedUrl)) continue;
        seenUrls.add(normalizedUrl);

        if (this.shouldSkipUrl(result.url)) continue;

        // Tavily provides content directly
        if (result.content && result.content.length > 100) {
          sources.push({
            title: result.title,
            url: result.url,
            content: result.content,
            relevanceScore: Math.round(result.score * 100), // Tavily score 0-1
          });
          tavilySourceCount++;
        }
      }

      this.logger.info(`✅ Tavily: ${tavilySourceCount} sources collected`);
    } catch (tavilyError) {
      this.logger.warn(`⚠️ Tavily failed, falling back to Google News`);
    }

    // ============================================
    // STEP 2: Google News (if Tavily insufficient)
    // ============================================
    if (sources.length < TARGET_SOURCE_COUNT) {
      const searchQueries = [keywords, `${keywords} news`];

      this.logger.info(`🔍 Google News search: ${keywords}`);

      const candidateUrls: Array<{
        title: string;
        url: string;
        relevanceScore: number;
      }> = [];

      const searchResults = await Promise.all(
        searchQueries.map(async (query) => {
          try {
            return await googleNewsSearch(query, {
              count: 8,
              time_range: "week",
              categories: "general,news",
            });
          } catch {
            return [];
          }
        }),
      );

      for (const results of searchResults) {
        for (const result of results) {
          if (candidateUrls.length >= TARGET_SOURCE_COUNT * 2) break;

          const normalizedUrl = this.normalizeUrl(result.url);
          if (seenUrls.has(normalizedUrl)) continue;
          seenUrls.add(normalizedUrl);

          if (this.shouldSkipUrl(result.url)) continue;

          const relevanceScore = this.calculateRelevanceScoreGoogleNews(
            result,
            article.title,
          );

          if (relevanceScore >= 30) {
            candidateUrls.push({
              title: result.title,
              url: result.url,
              relevanceScore,
            });
          }
        }
      }

      candidateUrls.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const topCandidates = candidateUrls.slice(0, TARGET_SOURCE_COUNT);

      this.logger.info(
        `📖 Reading ${topCandidates.length} URLs in parallel...`,
      );

      const contentResults = await Promise.allSettled(
        topCandidates.map(async (candidate) => {
          const content = await this.readUrlContent(candidate.url);
          return { ...candidate, content };
        }),
      );

      for (const result of contentResults) {
        if (
          result.status === "fulfilled" &&
          result.value.content &&
          result.value.content.length > 100
        ) {
          sources.push({
            title: result.value.title,
            url: result.value.url,
            content: result.value.content,
            relevanceScore: result.value.relevanceScore,
          });
        }
      }

      this.logger.info(
        `✅ Google News: ${sources.length - tavilySourceCount} additional sources`,
      );
    }

    this.logger.info(`✅ Total sources: ${sources.length} (Tavily + Google News)`);

    // Sort by relevance
    sources.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return sources;
  }

  /**
   * Gather sources with priority-based routing (Tavily extract for high-priority)
   * NEW: Uses Tavily extract() API for high-priority articles (trendScore > 80)
   */
  private async gatherSourcesWithPriority(article: UniqueArticle): Promise<
    Array<{
      title: string;
      url: string;
      content: string;
      relevanceScore: number;
    }>
  > {
    const sources: Array<{
      title: string;
      url: string;
      content: string;
      relevanceScore: number;
    }> = [];
    const seenUrls = new Set<string>();

    seenUrls.add(this.normalizeUrl(article.url));

    // Extract keywords for search
    const keywords = this.extractSearchKeywords(
      article.title,
      article.description,
    );

    const trendScore = article.trendScore || 0;
    const isHighPriority = trendScore > 80;

    this.logger.info(
      `🔍 Source gathering: ${isHighPriority ? "HIGH" : "LOW"} priority (score: ${trendScore})`,
    );

    // ============================================
    // STEP 1: Find candidate URLs using Google News
    // ============================================
    this.logger.info(`🔍 Google News search: "${keywords}"`);

    const candidateUrls: Array<{
      title: string;
      url: string;
      relevanceScore: number;
    }> = [];

    const searchQueries = [keywords, `${keywords} news`];
    const searchResults = await Promise.all(
      searchQueries.map(async (query) => {
        try {
          return await googleNewsSearch(query, {
            count: 10,
            time_range: "week",
            categories: "general,news",
          });
        } catch {
          return [];
        }
      }),
    );

    for (const results of searchResults) {
      for (const result of results) {
        if (candidateUrls.length >= 15) break;

        const normalizedUrl = this.normalizeUrl(result.url);
        if (seenUrls.has(normalizedUrl)) continue;
        seenUrls.add(normalizedUrl);

        if (this.shouldSkipUrl(result.url)) continue;

        const relevanceScore = this.calculateRelevanceScoreGoogleNews(
          result,
          article.title,
        );

        if (relevanceScore >= 20) {
          candidateUrls.push({
            title: result.title,
            url: result.url,
            relevanceScore,
          });
        }
      }
    }

    // Fallback: if no candidates found with threshold, take top 3 from all results by raw Google News score
    if (candidateUrls.length === 0) {
      this.logger.warn(
        `⚠️ No candidates above threshold, falling back to top Google News results`,
      );
      const allResults = searchResults.flat();
      const uniqueResults: typeof allResults = [];
      const fallbackSeen = new Set<string>();
      for (const r of allResults) {
        const norm = this.normalizeUrl(r.url);
        if (
          !fallbackSeen.has(norm) &&
          !seenUrls.has(norm) &&
          !this.shouldSkipUrl(r.url)
        ) {
          fallbackSeen.add(norm);
          uniqueResults.push(r);
        }
      }
      // Sort by Google News native score (descending), take top 3
      uniqueResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      for (const r of uniqueResults.slice(0, 3)) {
        candidateUrls.push({
          title: r.title,
          url: r.url,
          relevanceScore: 10, // Low but non-zero
        });
      }
      this.logger.info(
        `📋 Fallback: ${candidateUrls.length} candidates from raw Google News scores`,
      );
    }

    candidateUrls.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topCandidates = candidateUrls.slice(0, 10);

    this.logger.info(`📋 Found ${topCandidates.length} candidate URLs`);

    // ============================================
    // STEP 2: Extract content (Tavily or Jina)
    // ============================================
    if (isHighPriority && topCandidates.length > 0) {
      // HIGH PRIORITY: Use Tavily extract() API
      this.logger.info(
        `🔥 HIGH PRIORITY: Using Tavily extract() for ${topCandidates.length} URLs`,
      );

      try {
        const extractResults = await batchExtract(
          topCandidates.map((c) => c.url),
          {
            query: keywords,
            chunksPerSource: 3,
            extractDepth: "basic",
          },
        );

        const qualityResults = filterQualityResults(extractResults, 100);

        for (const result of qualityResults) {
          const candidate = topCandidates.find((c) => c.url === result.url);
          if (candidate) {
            sources.push({
              title: candidate.title,
              url: result.url,
              content: result.content.substring(0, 5000),
              relevanceScore: candidate.relevanceScore,
            });
          }
        }

        this.logger.info(
          `✅ Tavily extract: ${sources.length} sources collected`,
        );
      } catch (error: any) {
        this.logger.warn(
          `⚠️ Tavily extract failed: ${error.message}, falling back to Jina`,
        );
      }
    }

    // LOW PRIORITY or Tavily failed: Use Jina Reader (free)
    if (sources.length < TARGET_SOURCE_COUNT) {
      this.logger.info(
        `📖 ${isHighPriority ? "Tavily failed, using" : "Using"} Jina Reader for remaining URLs`,
      );

      const remainingCandidates = topCandidates.slice(0, TARGET_SOURCE_COUNT);

      const contentResults = await Promise.allSettled(
        remainingCandidates.map(async (candidate) => {
          const content = await this.readUrlContent(candidate.url);
          return { ...candidate, content };
        }),
      );

      for (const result of contentResults) {
        if (
          result.status === "fulfilled" &&
          result.value.content &&
          result.value.content.length > 100
        ) {
          // Skip if already added by Tavily
          if (sources.some((s) => s.url === result.value.url)) continue;

          sources.push({
            title: result.value.title,
            url: result.value.url,
            content: result.value.content,
            relevanceScore: result.value.relevanceScore,
          });
        }
      }

      this.logger.info(`✅ Jina Reader: ${sources.length} total sources`);
    }

    // Sort by relevance
    sources.sort((a, b) => b.relevanceScore - a.relevanceScore);

    this.logger.info(`✅ Total sources: ${sources.length}`);

    return sources;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AGGRESSIVE SOURCE GATHERING — used only for _forceReEnrich articles
  // Triggered when DatabasePublisher rejected the article due to low quality,
  // English title, missing content, or emergency template.
  //
  // Strategy (parallel 4-layer):
  //   Layer 1 — Google News wide-net  (4 queries, relaxed threshold, 1-month range)
  //   Layer 2 — Exa neural search (semantic/AI understanding)
  //   Layer 3 — Brave Search      (independent web index)
  //   Layer 4 — Firecrawl scrape  (clean extraction of the original article URL)
  //
  // Minimum target: 5 quality sources (vs 3 on normal path)
  // ─────────────────────────────────────────────────────────────────────────
  private async gatherSourcesAggressive(
    article: UniqueArticle,
    rejectionReason?: string,
  ): Promise<
    Array<{
      title: string;
      url: string;
      content: string;
      relevanceScore: number;
    }>
  > {
    const sources: Array<{
      title: string;
      url: string;
      content: string;
      relevanceScore: number;
    }> = [];
    const seenUrls = new Set<string>();
    seenUrls.add(this.normalizeUrl(article.url));

    const keywords = this.extractSearchKeywords(
      article.title,
      article.description,
    );

    this.logger.warn(
      `🔥 AGGRESSIVE source gathering — "${article.title.substring(0, 50)}" (rejection: ${rejectionReason ?? "?"})`,
    );

    // ── Helper: push deduped candidate ────────────────────────────────────
    const candidateUrls: Array<{
      title: string;
      url: string;
      relevanceScore: number;
    }> = [];

    const pushCandidate = (
      title: string,
      url: string,
      relevanceScore: number,
    ) => {
      if (!url) return;
      const norm = this.normalizeUrl(url);
      if (seenUrls.has(norm) || this.shouldSkipUrl(url)) return;
      seenUrls.add(norm);
      candidateUrls.push({ title, url, relevanceScore });
    };

    // ─────────────────────────────────────────────────────────────────────
    // PARALLEL SEARCH LAYERS (run simultaneously to fit 65s budget)
    // ─────────────────────────────────────────────────────────────────────
    const [searxResults, exaResults] = await Promise.allSettled([
      // ── Layer 1: Google News wide-net (4 queries, month range) ────────────
      (async () => {
        const queries = [
          keywords,
          `${keywords} news`,
          `${keywords} AI`,
          `${article.title.substring(0, 80)}`,
        ].filter(Boolean);

        const results = await Promise.all(
          queries.map((q) =>
            googleNewsSearch(q, {
              count: 10,
              time_range: "month", // wider than normal "week"
              categories: "general,news",
            }).catch(() => [] as any[]),
          ),
        );
        return results.flat();
      })(),

      // ── Layer 2: Exa neural (semantic AI search) ─────────────────────
      (process.env.EXA_API_KEY
        ? exaSearch(keywords, {
            num_results: 8,
            use_autoprompt: true,
            type: "neural",
          })
        : Promise.resolve([])
      ).catch(() => []),
    ]);

    // ── Process Google News ──────────────────────────────────────────────────
    if (searxResults.status === "fulfilled") {
      const deduped: typeof candidateUrls = [];
      const innerSeen = new Set<string>();
      for (const r of searxResults.value) {
        if (!r?.url) continue;
        const norm = this.normalizeUrl(r.url);
        if (innerSeen.has(norm)) continue;
        innerSeen.add(norm);

        const score = this.calculateRelevanceScoreGoogleNews(r, article.title);
        if (score >= 10) {
          // Relaxed threshold (normal: 20)
          deduped.push({ title: r.title, url: r.url, relevanceScore: score });
        }
      }
      // Sort by score, take top 10
      deduped.sort((a, b) => b.relevanceScore - a.relevanceScore);
      for (const c of deduped.slice(0, 10)) {
        pushCandidate(c.title, c.url, c.relevanceScore);
      }
      this.logger.info(
        `🔍 Google News wide-net: ${deduped.length} candidates (took ${deduped.slice(0, 10).length})`,
      );
    }

    // ── Process Exa ──────────────────────────────────────────────────────
    if (exaResults.status === "fulfilled" && Array.isArray(exaResults.value)) {
      for (const r of exaResults.value) {
        if (!r?.url) continue;
        const scoreBase = Math.round((r.score || 0.5) * 80);
        pushCandidate(r.title ?? "", r.url, scoreBase);

        // Exa often returns text inline — use it directly if available
        if (r.text && r.text.length > 200) {
          const norm = this.normalizeUrl(r.url);
          // Mark as already extracted (will skip Jina for this URL)
          sources.push({
            title: r.title ?? "",
            url: r.url,
            content: r.text.substring(0, 5000),
            relevanceScore: scoreBase,
          });
          seenUrls.add(norm); // prevent double-extract
        }
      }
      this.logger.info(`🤖 Exa neural: ${exaResults.value.length} results`);
    } else if (exaResults.status === "rejected") {
      this.logger.warn(`⚠️ Exa search failed: ${exaResults.reason}`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // CONTENT EXTRACTION for candidates not yet in sources
    // ─────────────────────────────────────────────────────────────────────
    const TARGET = 7; // Aggressive target (normal: 5)
    const remaining = candidateUrls
      .filter((c) => !sources.some((s) => s.url === c.url))
      .slice(0, TARGET - sources.length + 3); // Extra buffer

    if (remaining.length > 0) {
      this.logger.info(
        `📖 Extracting content for ${remaining.length} candidates (target: ${TARGET})`,
      );

      const extractResults = await Promise.allSettled(
        remaining.map(async (candidate) => {
          const content = await this.readUrlContent(candidate.url);
          return { ...candidate, content };
        }),
      );

      for (const r of extractResults) {
        if (
          r.status === "fulfilled" &&
          r.value.content &&
          r.value.content.length > 100
        ) {
          sources.push({
            title: r.value.title,
            url: r.value.url,
            content: r.value.content,
            relevanceScore: r.value.relevanceScore,
          });
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // LAST RESORT: Firecrawl (credit-guarded, 500 max)
    // Only activated when free layers returned insufficient sources.
    // Scrapes the original article URL — highest-relevance, JS-rendered.
    // ─────────────────────────────────────────────────────────────────────
    const MIN_SOURCES_BEFORE_FIRECRAWL = 4;
    if (
      sources.length < MIN_SOURCES_BEFORE_FIRECRAWL &&
      isFirecrawlAvailable()
    ) {
      this.logger.warn(
        `🔥 Insufficient sources (${sources.length}/${MIN_SOURCES_BEFORE_FIRECRAWL}), trying Firecrawl as LAST RESORT for original URL...`,
      );
      try {
        const fcPage = await firecrawlScrape(article.url, 12_000);
        if (fcPage.content && fcPage.content.length > 200) {
          this.logger.info(
            `🔥 Firecrawl scraped original URL (${fcPage.content.length} chars) — credit consumed`,
          );
          // Insert at position 0 — original article has maximum relevance
          sources.unshift({
            title: fcPage.title || article.title,
            url: article.url,
            content: fcPage.content.substring(0, 5000),
            relevanceScore: 100,
          });
        } else {
          this.logger.warn(
            `🔥 Firecrawl returned no usable content for ${article.url}`,
          );
        }
      } catch (fcErr: any) {
        this.logger.warn(`🔥 Firecrawl last-resort failed: ${fcErr?.message}`);
      }
    }

    // Sort by relevance score (Firecrawl original stays at top due to unshift)
    sources.sort((a, b) => b.relevanceScore - a.relevanceScore);

    this.logger.warn(
      `🔥 AGGRESSIVE gather complete: ${sources.length} sources (target was ${TARGET})`,
    );

    return sources;
  }

  /**
   * Read URL content using Jina Reader with Tavily and Google News fallbacks
   * FIXED: Added detailed error logging and increased timeout
   * UPDATED: Added Google News as third fallback option
   */
  private async readUrlContent(url: string): Promise<string> {
    if (/^https?:\/\/news\.google\.com\/rss\/articles\//i.test(url)) {
      this.logger.warn(`Skipping unresolved Google News RSS article URL: ${url}`);
      return "";
    }

    // Try Jina Reader first
    try {
      const response = await axios.get(`${JINA_READER_URL}/${url}`, {
        headers: {
          Accept: "text/plain",
          "X-Return-Format": "markdown",
        },
        timeout: JINA_TIMEOUT,
      });

      const content = response.data;
      if (content && content.length > 100) {
        return content.substring(0, 5000);
      }

      this.logger.warn(
        `⚠️ Jina Reader returned insufficient content for ${url} (${content?.length || 0} chars)`,
      );
    } catch (jinaError: any) {
      this.logger.warn(
        `⚠️ Jina Reader failed for ${url}: ${jinaError.message}`,
      );
    }

    // Fallback 1: Tavily
    const apiKey = process.env.TAVILY_API_KEY;
    if (apiKey) {
      try {
        const response = await axios.post(
          TAVILY_EXTRACT_URL,
          { urls: [url] },
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: TAVILY_TIMEOUT,
          },
        );

        const results = response.data?.results;
        if (results && results.length > 0 && results[0].raw_content) {
          this.logger.info(`✅ Tavily fallback succeeded for ${url}`);
          return results[0].raw_content.substring(0, 5000);
        }

        this.logger.warn(`⚠️ Tavily returned no content for ${url}`);
      } catch (tavilyError: any) {
        this.logger.warn(
          `⚠️ Tavily fallback failed for ${url}: ${tavilyError.message}`,
        );
      }
    }

    // Fallback 2: Google News (search for URL content)
    try {
      // Extract meaningful search query from URL
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      const searchQuery = pathParts
        .join(" ")
        .replace(/[-_]/g, " ")
        .replace(/\.(html|htm|php|aspx)$/i, "")
        .substring(0, 100);

      if (searchQuery.length > 10) {
        this.logger.info(
          `🔍 Google News fallback: searching for "${searchQuery.substring(0, 50)}..."`,
        );

        const results = await googleNewsSearch(searchQuery, {
          count: 5,
          language: "en",
          categories: "general",
        });

        if (results && results.length > 0) {
          // Combine content from top results
          const combinedContent = results
            .slice(0, 3)
            .map((r) => `${r.title}\n${r.content}`)
            .join("\n\n");

          if (combinedContent.length > 200) {
            this.logger.info(
              `✅ Google News fallback succeeded for ${url} (${combinedContent.length} chars)`,
            );
            return combinedContent.substring(0, 5000);
          }
        }

        this.logger.warn(`⚠️ Google News returned insufficient content for ${url}`);
      }
    } catch (googleNewsError: any) {
      this.logger.warn(
        `⚠️ Google News fallback failed for ${url}: ${googleNewsError.message}`,
      );
    }

    this.logger.error(`❌ All extraction methods failed for ${url}`);
    return "";
  }

  /**
   * Synthesize content from multiple sources (TR + EN)
   * Using LLM (NVIDIA Qwen3 primary) for both TR and EN content generation
   *
   * @param initialRejectionHint  When set (re-enrichment path), the retry loop
   *   starts with this known failure reason so corrective prompts are applied
   *   from attempt 0 instead of waiting for a second rejection.
   */
  private async synthesizeContent(
    article: UniqueArticle,
    sources: Array<{
      title: string;
      url: string;
      content: string;
      relevanceScore: number;
    }>,
    category: string,
    initialRejectionHint?: string,
  ): Promise<{
    tr: {
      title: string;
      metaTitle?: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
      score: number;
    };
    en: {
      title: string;
      metaTitle?: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
    };
  }> {
    // Sanitize text to prevent JSON parsing errors in API calls
    const sanitizeForPrompt = (text: string): string => {
      return text
        .replace(/\\/g, "/") // Replace backslashes
        .replace(/[\r\n]+/g, " ") // Replace newlines with spaces
        .replace(/[\x00-\x1f]/g, "") // Remove control characters
        .replace(/[\u2028\u2029]/g, " ") // Remove line/paragraph separators
        .trim();
    };

    const sourcesText = sources
      .slice(0, 6)
      .map(
        (s, i) => `
--- SOURCE ${i + 1}: ${new URL(s.url).hostname} ---
Title: ${sanitizeForPrompt(s.title)}
URL: ${s.url}
Content:
${sanitizeForPrompt(s.content.substring(0, 1500))}
`,
      )
      .join("\n");

    // Using LLM for BOTH TR and EN content synthesis (NVIDIA Qwen3 primary, DeepSeek fallback)
    this.logger.info(`🚀 Using LLM for BOTH TR + EN synthesis`);

    // 🔄 RETRY LOOP: TR content synthesis with escalating prompts on failure
    // Instead of rejecting on first failure, retry up to 2 more times with adjusted prompts
    const MAX_TR_RETRIES = 2;
    let trContent: any = null;
    let trSynthesisSuccess = false;
    // Pre-prime with known rejection reason from DB-publisher (re-enrichment path).
    // This means corrective prompt instructions are active from attempt 0.
    let lastRejectionReason = initialRejectionHint ?? "";
    let activeSources = [...sources]; // May be filtered on dictionary retry

    for (let trAttempt = 0; trAttempt <= MAX_TR_RETRIES; trAttempt++) {
      try {
        // Build retry-aware prompt enhancements
        let retryInstructions = "";
        if (trAttempt > 0) {
          this.logger.warn(
            `🔄 TR synthesis RETRY ${trAttempt}/${MAX_TR_RETRIES}: reason="${lastRejectionReason}"`,
          );

          if (lastRejectionReason === "english_title") {
            retryInstructions = `

⚠️ KRİTİK UYARI: Önceki denemende İNGİLİZCE başlık ürettin! Bu KABUL EDİLEMEZ.
BAŞLIK %100 TÜRKÇE OLMALI. İngilizce kelime ASLA kullanma. Türkçe karakter (ç, ğ, ı, ö, ş, ü) MUTLAKA içermeli.
Örnek doğru başlık: "Google'ın Yeni Yapay Zekâ Modeli Rakiplerini Geride Bıraktı"`;
          } else if (lastRejectionReason === "dictionary_content") {
            retryInstructions = `

⚠️ KRİTİK UYARI: Önceki denemende sözlük tanımları içeren içerik ürettin!
ASLA sözlük tanımı, kelime anlamı, pronunciation, synonym, etymology KULLANMA.
Sadece HABER içeriği yaz — ne oldu, neden önemli, sektöre etkisi ne.`;
            // Filter out suspicious sources on dictionary retry
            activeSources = activeSources.filter((s) =>
              this.isSourceContentClean(s.content),
            );
            if (activeSources.length === 0) {
              this.logger.error(
                `🚫 All sources filtered as dictionary content — cannot retry`,
              );
              break;
            }
          } else if (lastRejectionReason === "parse_error") {
            retryInstructions = `

⚠️ ÖNEMLİ: Yanıtını MUTLAKA geçerli JSON formatında ver. Ekstra metin ekleme, sadece JSON objesi döndür.`;
          } else if (lastRejectionReason === "non_latin_title") {
            retryInstructions = `

⚠️ KRİTİK UYARI: Önceki denemende Çince/Japonca/Korece karakterler içeren başlık ürettin!
Başlıkta SADECE Türkçe ve Latin harfler kullan. Çince (の, 石, 智 vb.), Japonca, Korece karakter ASLA kullanma.
Kaynak haberdeki yabancı isimler varsa Türkçe'ye çevir veya Latin harflerle yaz.`;
          }
        }

        // Rebuild sources text with potentially filtered sources
        const retrySourcesText = activeSources
          .slice(0, 6)
          .map(
            (s, i) => `
--- SOURCE ${i + 1}: ${new URL(s.url).hostname} ---
Title: ${sanitizeForPrompt(s.title)}
URL: ${s.url}
Content:
${sanitizeForPrompt(s.content.substring(0, 1500))}
`,
          )
          .join("\n");

        const currentTrPrompt = `Sen usta bir araştırmacı gazeteci ve baş editörsün.

Görevin: Aşağıdaki ${activeSources.length} FARKLI KAYNAKTAN toplanan ham verileri derinlemesine analiz ederek, SENTEZLEYEREK, KAPSAMLI ve %100 ORİJİNAL bir Türkçe haber makalesi oluşturmak.

### ORİJİNAL HABER BAŞLIĞI:
${article.title}

### TOPLANAN KAYNAKLAR:
${retrySourcesText}

### YAZIM KURALLARI:
1. İNSANSI VE AKICI DİL: Robotik değil, doğal Türkçe
2. DERİN ANALİZ: "Ne oldu" + "Neden oldu" + "Ne anlama geliyor"
3. OBJEKTİF AMA ÇARPICI: Tarafsız kal ama sıkıcı olma
4. KAYNAK KULLANIMI: "Reuters'a göre...", "TechCrunch'ın raporuna göre..."
5. Benzersiz Anlatım: Her cümlen özgün olsun

### YAPI VE SEO KURALLARI (KRİTİK — HEPSİNE UY):
- **Başlık (title):** 50-70 karakter. Ana anahtar kelime İLK 5 kelimede olmalı. Başlığa yıl (2025, 2026 vb.) EKLEME — sadece haberin konusu doğrudan bir yıla atıfta bulunuyorsa kullan. Başlıkta Çince, Japonca, Korece veya Latin dışı karakterler ASLA kullanma.
- **Meta Başlık (metaTitle):** 50-60 karakter. Google SERP için optimize. Ana anahtar kelimeyi başa koy. Başlıktan farklı olabilir, daha kısa ve öz.
- **Özet (excerpt):** 2-3 cümlelik giriş, ana anahtar kelimeyi içermeli.
- **Meta Açıklama (metaDescription):** 120-155 karakter. CTA fiili ekle ("Keşfet", "Öğren", "İncele"). Ana anahtar kelimeyi doğal şekilde entegre et.
- **İçerik (content):** En az 600 kelime, HTML formatlı (<p>, <h2>, <ul>/<ol>).
  - Minimum 2 adet <h2> başlık kullan, H2'lerde anahtar kelime geçmeli.
  - Paragraflar kısa: max 3-4 cümle.
  - İlk paragrafta ana anahtar kelime GEÇMELİ.
  - Son paragrafta ana anahtar kelime GEÇMELİ.
- **Anahtar Kelimeler:** 6-10 adet. İçerikte yoğunluk %1-2.
${retryInstructions}
JSON formatında yanıt ver:
{
  "title": "Çarpıcı ve SEO Uyumlu Başlık (50-70 kar)",
  "metaTitle": "Google SERP İçin Kısa Başlık (50-60 kar)",
  "excerpt": "Okuyucuyu yakalayan özet",
  "content": "HTML formatlı, derin analiz içeren tam makale",
  "keywords": ["anahtar1", "anahtar2"],
  "metaDescription": "CTA içeren SEO meta açıklama (120-155 kar)",
  "score": 950
}`;

        const trResponse = await callDeepSeek(
          [{ role: "user", content: currentTrPrompt }],
          {
            model: "deepseek-v4-flash",
            maxTokens: 6000,
            temperature: trAttempt === 0 ? 0.7 : 0.5, // Lower temperature on retry for more predictable output
          },
        );

        const trJsonMatch = trResponse.match(/\{[\s\S]*\}/);
        if (!trJsonMatch) {
          lastRejectionReason = "parse_error";
          continue; // Retry
        }
        trContent = JSON.parse(trJsonMatch[0]);

        // 🛡️ POST-SYNTHESIS VALIDATION: Verify TR content is actually Turkish
        if (trContent.title) {
          const isEnglishTitle = /^[a-zA-Z0-9\s\-:,.'""!?&@#$%()—–]+$/.test(
            trContent.title.trim(),
          );
          const hasTurkishChars = /[çğıöşüÇĞİÖŞÜ]/.test(trContent.title);

          if (isEnglishTitle && !hasTurkishChars) {
            this.logger.warn(
              `🔄 LLM returned English title (attempt ${trAttempt + 1}): "${trContent.title.substring(0, 60)}"`,
            );
            lastRejectionReason = "english_title";
            trContent = null;
            continue; // Retry with stronger Turkish prompt
          }

          // 🛡️ Check for non-Latin characters (Chinese, Japanese, Korean)
          if (
            /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(
              trContent.title,
            )
          ) {
            this.logger.warn(
              `🔄 LLM returned title with non-Latin chars (attempt ${trAttempt + 1}): "${trContent.title.substring(0, 60)}"`,
            );
            lastRejectionReason = "non_latin_title";
            trContent = null;
            continue;
          }
        }

        // 🛡️ Check for dictionary/garbage content
        const contentLower = (trContent.content || "").toLowerCase();
        const dictionaryRedFlags = [
          "pronunciation",
          "synonyms",
          "antonyms",
          "etymology",
          "definition of",
          "merriam-webster",
          "dictionary.com",
          "see the full definition",
          "word of the day",
        ];
        const dictMatchCount = dictionaryRedFlags.filter((p) =>
          contentLower.includes(p),
        ).length;
        if (dictMatchCount >= 2) {
          this.logger.warn(
            `🔄 LLM generated dictionary content (attempt ${trAttempt + 1}): ${dictMatchCount} flags`,
          );
          lastRejectionReason = "dictionary_content";
          trContent = null;
          continue; // Retry with filtered sources
        }

        // ✅ Passed all validation
        trSynthesisSuccess = true;
        this.logger.success(
          `✅ LLM TR content generated successfully${trAttempt > 0 ? ` (retry ${trAttempt})` : ""}`,
        );
        break;
      } catch (deepseekTrError: any) {
        this.logger.error(
          `❌ LLM TR attempt ${trAttempt + 1} failed: ${deepseekTrError.message}`,
        );
        lastRejectionReason = "api_error";
        // Wait before retry (exponential backoff)
        if (trAttempt < MAX_TR_RETRIES) {
          const waitMs = 2000 * (trAttempt + 1);
          this.logger.info(`⏳ Waiting ${waitMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }
    }

    // If all retries failed, return emergency template (empty content — won't be published)
    if (!trSynthesisSuccess || !trContent) {
      this.logger.error(
        `🚫 All ${MAX_TR_RETRIES + 1} TR synthesis attempts failed (reason: ${lastRejectionReason}) — article will NOT be published`,
      );
      return this.generateEmergencyTemplate(article, sources);
    }

    // English content (LLM via callDeepSeek wrapper)
    const enPrompt = `You are a world-renowned investigative journalist.

Task: Create a comprehensive, original English news article by synthesizing ${sources.length} sources.

### ORIGINAL NEWS:
Title: ${article.title}
Description: ${article.description}

### SOURCES:
${sourcesText}

### RULES:
1. CREATE ORIGINAL CONTENT (synthesize, don't copy)
2. Cite sources: "According to Reuters...", "TechCrunch reports..."
3. Professional tone: Objective, neutral, third-person

### STRUCTURE & SEO RULES (CRITICAL — FOLLOW ALL):
- **Title (title):** 50-70 chars. Primary keyword in FIRST 5 words. Do NOT add year numbers (2025, 2026 etc.) unless the news specifically references that year. NEVER use Chinese, Japanese, Korean or non-Latin characters in titles.
- **Meta Title (metaTitle):** 50-60 chars. Optimized for Google SERP. Put primary keyword first. Can differ from title, shorter and more concise.
- **Excerpt:** 2-3 sentences, must include primary keyword.
- **Meta Description (metaDescription):** 120-155 chars. Add CTA verb ("Discover", "Learn", "Explore"). Naturally integrate primary keyword.
- **Content:** HTML formatted, min 500 words.
  - Minimum 2 <h2> headings, H2s MUST contain keywords.
  - Short paragraphs: max 3-4 sentences each.
  - Primary keyword MUST appear in FIRST paragraph.
  - Primary keyword MUST appear in LAST paragraph.
- **Keywords:** 5-8 keywords. Content density 1-2%.

Respond in JSON:
{
  "title": "SEO-Optimized English Title (50-70 chars)",
  "metaTitle": "Short SERP Title (50-60 chars)",
  "excerpt": "2-3 sentence summary",
  "content": "Full HTML article",
  "keywords": ["keyword1", "keyword2"],
  "metaDescription": "CTA-driven SEO meta description (120-155 chars)"
}`;

    let enContent: any;
    try {
      const enResponse = await callDeepSeek(
        [{ role: "user", content: enPrompt }],
        {
          model: "deepseek-v4-flash",
          maxTokens: 6000,
          temperature: 0.7,
        },
      );

      const enJsonMatch = enResponse.match(/\{[\s\S]*\}/);
      if (!enJsonMatch) {
        throw new Error("Failed to parse English content from LLM");
      }
      enContent = JSON.parse(enJsonMatch[0]);
      this.logger.success(`✅ LLM EN content generated successfully`);
    } catch (deepseekEnError: any) {
      this.logger.error(
        `❌ LLM EN failed: ${deepseekEnError.message}, using emergency template`,
      );
      // Emergency template fallback
      return this.generateEmergencyTemplate(article, sources);
    }

    // Add AI disclaimer and sources footer to both TR and EN content
    const sourcesHtmlTr = sources
      .slice(0, 5)
      .map(
        (s) =>
          `<a href="${s.url}" target="_blank" rel="noopener nofollow" style="color: #60a5fa; text-decoration: none;">${new URL(s.url).hostname}</a>`,
      )
      .join(" • ");

    const sourcesHtmlEn = sources
      .slice(0, 5)
      .map(
        (s) =>
          `<a href="${s.url}" target="_blank" rel="noopener nofollow" style="color: #60a5fa; text-decoration: none;">${new URL(s.url).hostname}</a>`,
      )
      .join(" • ");

    const aiDisclaimerTr = `
<div class="ai-disclosure" style="margin-top: 2.5rem; padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(147,51,234,0.08) 100%); border-radius: 12px; border: 1px solid rgba(59,130,246,0.15);">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;"><path d="M12 8V4H8"/><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8a4 4 0 0 1 0 8"/><path d="M12 8a4 4 0 0 0 0 8"/></svg>
    <span style="font-size: 0.75rem; font-weight: 600; color: #3b82f6;">Yapay Zeka Destekli İçerik</span>
  </div>
  <div style="font-size: 0.65rem; color: #94a3b8;">
    <strong style="color: #64748b;">Kaynaklar:</strong> ${sourcesHtmlTr}
  </div>
</div>`;

    const aiDisclaimerEn = `
<div class="ai-disclosure" style="margin-top: 2.5rem; padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(147,51,234,0.08) 100%); border-radius: 12px; border: 1px solid rgba(59,130,246,0.15);">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;"><path d="M12 8V4H8"/><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8a4 4 0 0 1 0 8"/><path d="M12 8a4 4 0 0 0 0 8"/></svg>
    <span style="font-size: 0.75rem; font-weight: 600; color: #3b82f6;">AI-Powered Content</span>
  </div>
  <div style="font-size: 0.65rem; color: #94a3b8;">
    <strong style="color: #64748b;">Sources:</strong> ${sourcesHtmlEn}
  </div>
</div>`;

    // Append disclaimers to content
    trContent.content = (trContent.content || "") + aiDisclaimerTr;
    enContent.content = (enContent.content || "") + aiDisclaimerEn;

    return {
      tr: trContent,
      en: enContent,
    };
  }

  /**
   * Extract search keywords
   */
  private extractSearchKeywords(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();
    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
      "from",
      "as",
      "is",
      "was",
      "are",
      "were",
      "been",
      "be",
      "have",
      "has",
      "had",
      "bir",
      "ve",
      "veya",
      "ama",
      "için",
      "ile",
      "olan",
      "bu",
      "şu",
      "o",
      "de",
      "da",
    ]);

    // 🛡️ Ambiguous English words that cause dictionary/irrelevant results when searched alone
    // These are common English words with multiple meanings that pollute search results
    const ambiguousWords = new Set([
      "sick",
      "hot",
      "cool",
      "fire",
      "dead",
      "wild",
      "mad",
      "bad",
      "lit",
      "cold",
      "fresh",
      "raw",
      "live",
      "sharp",
      "flat",
      "deep",
      "fast",
      "slow",
      "hard",
      "soft",
      "big",
      "small",
      "large",
      "long",
      "short",
      "high",
      "low",
      "open",
      "close",
      "right",
      "wrong",
      "free",
      "lost",
      "still",
      "just",
      "even",
      "well",
      "good",
      "best",
      "better",
      "much",
      "more",
      "most",
      "very",
      "only",
      "also",
      "now",
      "new",
      "old",
      "first",
      "last",
      "next",
      "yet",
      "way",
      "out",
      "off",
      "put",
      "get",
      "got",
      "set",
      "run",
      "let",
      "say",
      "make",
      "take",
      "come",
      "see",
      "look",
      "find",
      "give",
      "tell",
      "may",
      "will",
      "can",
      "could",
      "would",
      "should",
      "might",
      "must",
      "need",
      "want",
      "like",
      "use",
      "try",
      "ask",
      "work",
      "call",
      "keep",
      "help",
      "start",
      "show",
      "turn",
      "play",
      "move",
      "end",
      "stop",
      "these",
      "those",
      "some",
      "any",
      "each",
      "every",
      "all",
      "both",
      "few",
      "many",
      "such",
      "than",
      "does",
      "did",
      "its",
      "not",
      "top",
      "why",
      "how",
      "what",
      "when",
      "where",
      "who",
      "which",
      "that",
      "this",
      "here",
      "there",
      "then",
      "back",
      "down",
      "over",
      "after",
      "before",
      "between",
      "under",
      "into",
      "through",
      "about",
      "against",
      "during",
      "without",
    ]);

    const words = text
      .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s]/g, " ")
      .split(/\s+/)
      .filter(
        (w) =>
          w.length > 2 &&
          w.length < 30 && // Filter out hash-like long strings
          !stopWords.has(w) &&
          !ambiguousWords.has(w) &&
          !/^[0-9a-f]{8,}$/i.test(w) && // Filter hex hashes (e.g. commit SHAs)
          !/^[a-z0-9]{20,}$/i.test(w) && // Filter long random alphanumeric tokens
          !/^\d+$/.test(w), // Filter pure numbers
      );

    // 🎯 Prioritize: proper nouns/tech terms (3+ chars with capitals in original),
    // then longer words (more specific), then shorter
    const originalWords = `${title} ${description}`.split(/\s+/);
    const properNouns = new Set(
      originalWords
        .filter((w) => /^[A-Z][a-zA-Z]{2,}/.test(w) || /^[A-Z]{2,}/.test(w))
        .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
        .filter(
          (w) => w.length > 2 && !stopWords.has(w) && !ambiguousWords.has(w),
        ),
    );

    // Sort: proper nouns first, then by word length (longer = more specific)
    const sortedWords = words.sort((a, b) => {
      const aIsProper = properNouns.has(a) ? 1 : 0;
      const bIsProper = properNouns.has(b) ? 1 : 0;
      if (bIsProper !== aIsProper) return bIsProper - aIsProper;
      return b.length - a.length; // Longer words first
    });

    // Remove duplicates preserving order
    const uniqueWords = [...new Set(sortedWords)].slice(0, 8);

    this.logger.info(
      `🔑 Keywords extracted: "${uniqueWords.join(" ")}" (from: "${title.substring(0, 60)}...")`,
    );

    return uniqueWords.join(" ");
  }

  /**
   * Calculate relevance score for Google News results
   * 🛡️ UPDATED: Penalize dictionary/reference results and check for news relevance
   */
  private calculateRelevanceScoreGoogleNews(
    result: GoogleNewsResult,
    originalTitle: string,
  ): number {
    let score = 0;

    const titleLower = originalTitle.toLowerCase();
    const resultTitleLower = result.title.toLowerCase();
    const resultContentLower = (result.content || "").toLowerCase();

    // 🛡️ EARLY REJECT: Penalize dictionary/reference results heavily
    const dictionarySignals = [
      "definition",
      "meaning",
      "synonym",
      "antonym",
      "pronunciation",
      "dictionary",
      "thesaurus",
      "etymology",
      "word origin",
      "noun ",
      "verb ",
      "adjective ",
      "adverb ",
      "plural ",
      "past tense",
      "define ",
      "what does",
      "what is the meaning",
    ];
    const dictionaryMatchCount = dictionarySignals.filter(
      (s) => resultTitleLower.includes(s) || resultContentLower.includes(s),
    ).length;
    if (dictionaryMatchCount >= 2) {
      return -100; // Instant reject — this is a dictionary result
    }

    // 🛡️ CHECK: Result must be about tech/AI/news, not a random word definition
    const techSignals = [
      "ai",
      "artificial intelligence",
      "technology",
      "tech",
      "google",
      "apple",
      "microsoft",
      "openai",
      "startup",
      "software",
      "hardware",
      "robot",
      "machine learning",
      "data",
      "cloud",
      "cyber",
      "digital",
      "innovation",
      "launch",
      "release",
      "update",
      "announce",
      "report",
    ];
    const hasTechContext = techSignals.some(
      (s) => resultTitleLower.includes(s) || resultContentLower.includes(s),
    );

    const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);
    for (const word of titleWords) {
      if (resultTitleLower.includes(word)) score += 15;
      if (resultContentLower.includes(word)) score += 5;
    }

    // Google News provides publishedDate
    if (result.publishedDate) {
      const publishedDate = new Date(result.publishedDate);
      const now = new Date();
      const hoursDiff =
        (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < 24)
        score += 20; // Last 24 hours
      else if (hoursDiff < 168) score += 10; // Last week
    }

    // Authority domains
    const authorityDomains = [
      "techcrunch.com",
      "theverge.com",
      "wired.com",
      "arstechnica.com",
      "reuters.com",
      "bloomberg.com",
      "bbc.com",
      "cnn.com",
      "engadget.com",
      "zdnet.com",
      "venturebeat.com",
    ];
    if (authorityDomains.some((d) => result.url.includes(d))) {
      score += 15;
    }

    // Google News score (if available)
    if (result.score) {
      score += result.score * 10; // Normalize Google News score
    }

    // 🛡️ BONUS: Results with tech/news context are more likely relevant
    if (hasTechContext) {
      score += 10;
    }

    // 🛡️ PENALTY: If score is low and no tech context, likely irrelevant
    if (!hasTechContext && score < 30) {
      score = Math.max(0, score - 15);
    }

    return score;
  }

  /**
   * Check if URL should be skipped
   */
  private shouldSkipUrl(url: string): boolean {
    const skipPatterns = [
      /youtube\.com/i,
      /twitter\.com|x\.com/i,
      /facebook\.com/i,
      /instagram\.com/i,
      /reddit\.com/i,
      /linkedin\.com/i,
      /tiktok\.com/i,
      /pinterest\.com/i,
      /\.pdf$/i,
      /\.zip$/i,
      /\.mp4$/i,
      // 🛡️ Dictionary, reference, and non-news sites that pollute search results
      /merriam-webster\.com/i,
      /dictionary\.com/i,
      /wordreference\.com/i,
      /thefreedictionary\.com/i,
      /cambridge\.org\/dictionary/i,
      /oxfordlearnersdictionaries\.com/i,
      /collinsdictionary\.com/i,
      /urbandictionary\.com/i,
      /wiktionary\.org/i,
      /thesaurus\.com/i,
      /vocabulary\.com/i,
      /definitions\.net/i,
      /yourdictionary\.com/i,
      /wikipedia\.org/i,
      /wikihow\.com/i,
      /quora\.com/i,
      /stackexchange\.com/i,
      /stackoverflow\.com/i,
      /medium\.com\/@/i, // Medium user pages (not publications)
      /amazon\.com/i,
      /ebay\.com/i,
      /aliexpress\.com/i,
      /news\.google\.com\/rss\/articles\//i,
    ];

    return skipPatterns.some((pattern) => pattern.test(url));
  }

  /**
   * Normalize URL
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.origin}${urlObj.pathname.replace(/\/$/, "")}`;
    } catch {
      return url;
    }
  }

  /**
   * Generate emergency template content (Layer 4 fallback)
   * Used when all other methods fail - GUARANTEED to succeed
   */
  /**
   * Validate source content quality before using in emergency template
   * Prevents garbage HTML/JS/metadata from being published
   */
  private isSourceContentClean(content: string): boolean {
    if (!content || content.length < 50) return false;

    const lowerContent = content.toLowerCase();
    const garbagePatterns = [
      "shadow dom",
      "published time:",
      "warning:",
      "this page contains",
      "<script",
      "javascript:",
      "window.__",
      "document.get",
      "classname=",
      "onclick=",
      "adsbygoogle",
      "googletag",
      "cookie policy",
      "accept cookies",
      "privacy policy",
      "subscribe to newsletter",
      "sign up for",
      "enable javascript",
      "captcha",
      "403 forbidden",
      "access denied",
      "robot verification",
      "cloudflare",
      "just a moment",
      "checking your browser",
      // 🛡️ Dictionary/reference patterns — these indicate scraped dictionary content, not news
      "pronunciation",
      "synonyms",
      "antonyms",
      "word origin",
      "etymology",
      "thesaurus",
      "definition of",
      "definitions of",
      "noun.",
      "verb.",
      "adjective.",
      "adverb.",
      "plural of",
      "past tense",
      "present tense",
      "merriam-webster",
      "dictionary.com",
      "see the full definition",
      "word of the day",
      "browse the dictionary",
      "example sentences",
      "first known use",
    ];

    const matchCount = garbagePatterns.filter((p) =>
      lowerContent.includes(p),
    ).length;
    if (matchCount >= 2) return false; // Multiple garbage signals = bad content

    // Check alphanumeric ratio (garbage HTML has lots of special chars)
    const alphanumeric = (
      content.match(/[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF]/g) || []
    ).length;
    const ratio = alphanumeric / content.length;
    if (ratio < 0.5 && content.length > 200) return false;

    return true;
  }

  private generateEmergencyTemplate(
    article: UniqueArticle,
    sources: Array<{ title: string; url: string; content: string }>,
  ): {
    tr: {
      title: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
      score: number;
    };
    en: {
      title: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
    };
  } {
    // 🚫 REJECT ENTIRELY: Emergency template should NOT be published
    // If DeepSeek synthesis failed, the content quality is unpredictable.
    // Return empty content so DatabasePublisher rejects it.
    this.logger.error(
      `🚫 Emergency template REJECTED: DeepSeek synthesis failed for "${article.title.substring(0, 60)}" — article will NOT be published`,
    );

    return {
      tr: {
        title: "",
        excerpt: "",
        content: "",
        keywords: [],
        metaDescription: "",
        score: 0,
      },
      en: {
        title: "",
        excerpt: "",
        content: "",
        keywords: [],
        metaDescription: "",
      },
    };
  }
}
