/**
 * Source Gatherer Agent
 *
 * RESPONSIBILITIES:
 * 1. Multi-source research (SearXNG + Tavily + Exa + Firecrawl)
 * 2. Gather 3-7 sources per article depending on priority
 * 3. Handle re-enrichment path (aggressive multi-service gathering)
 * 4. Emit articles with gathered sources to content-synthesis queue
 *
 * EXTRACTED FROM: content-enricher.agent.ts (source gathering methods)
 *
 * INPUT:  UniqueArticle[] (+ optional ReEnrichMetadata)
 * OUTPUT: ArticleWithSources[]
 * QUEUE:  Listens on ENRICHED_ARTICLES, emits to CONTENT_SYNTHESIS
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import { searxngSearch, type SearXNGResult } from "@/lib/searxng";
import { batchExtract, filterQualityResults } from "@/lib/tavily-extract";
import axios from "axios";
import type { UniqueArticle } from "./duplicate-detector.agent";
import { exaSearch } from "@/lib/exa";
import { firecrawlScrape, isFirecrawlAvailable } from "@/lib/firecrawl";
import type {
  ArticleSource,
  ArticleWithSources,
  ReEnrichMetadata,
} from "./pipeline-types";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const JINA_READER_URL = "https://r.jina.ai";
const JINA_TIMEOUT = 20000;
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";
const TAVILY_TIMEOUT = 20000;
const TARGET_SOURCE_COUNT = 3;

// ─────────────────────────────────────────────────────────────────────────────
// CIRCUIT BREAKER
// ─────────────────────────────────────────────────────────────────────────────

/** Circuit Breaker for API failure protection */
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private logger?: ReturnType<
    typeof import("@/lib/agent-log-stream").createModuleLogger
  >;

  async execute<T>(fn: () => Promise<T>, fallback: () => T): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailTime > 60000) {
        this.state = "HALF_OPEN";
      } else {
        return fallback();
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch {
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
      this.state = "OPEN";
      this.logger?.warn(`Circuit breaker OPEN after ${this.failures} failures`);
    }
  }

  setLogger(logger: CircuitBreaker["logger"]) {
    this.logger = logger;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT TYPE (UniqueArticle + optional re-enrich metadata)
// ─────────────────────────────────────────────────────────────────────────────

type SourceGathererInput = UniqueArticle & Partial<ReEnrichMetadata>;

// ─────────────────────────────────────────────────────────────────────────────
// AGENT
// ─────────────────────────────────────────────────────────────────────────────

export class SourceGathererAgent extends BaseAgent<
  SourceGathererInput[],
  ArticleWithSources[]
> {
  protected config = {
    name: "source-gatherer",
    queueName: QUEUE_NAMES.ENRICHED_ARTICLES,
    nextQueueName: QUEUE_NAMES.CONTENT_SYNTHESIS,
    enableMetrics: true,
  };

  private tavilyBreaker = new CircuitBreaker();
  private jinaBreaker = new CircuitBreaker();

  constructor() {
    super("source-gatherer");
    this.tavilyBreaker.setLogger(this.logger);
    this.jinaBreaker.setLogger(this.logger);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PROCESS
  // ─────────────────────────────────────────────────────────────────────────

  protected async process(
    job: Job<SourceGathererInput[]>,
  ): Promise<AgentResult<ArticleWithSources[]>> {
    const articles = job.data;
    const startTime = Date.now();
    let apiCalls = 0;

    this.logger.info(`🔍 Gathering sources for ${articles.length} articles...`);

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
      const results: ArticleWithSources[] = [];
      const CONCURRENCY = 2;

      for (let i = 0; i < articles.length; i += CONCURRENCY) {
        const batch = articles.slice(i, i + CONCURRENCY);
        this.logger.info(
          `📦 Batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(articles.length / CONCURRENCY)} (${batch.length} articles)`,
        );

        const promises = batch.map(async (article, batchIdx) => {
          const idx = i + batchIdx;
          const num = idx + 1;
          this.logger.info(
            `[${num}/${articles.length}] Sources: ${article.title.substring(0, 50)}...`,
          );

          try {
            // ── Re-enrichment flags (typed — no `as any`) ──
            const isReEnrich = article._forceReEnrich === true;
            const rejectionReason = article._rejectionReason;

            if (isReEnrich) {
              this.logger.warn(
                `🔁 DEEP RE-ENRICH [${num}/${articles.length}] "${article.title.substring(0, 50)}" (reason: ${rejectionReason ?? "unknown"})`,
              );
            }

            // Source gathering with timeout
            const sourceTimeout = isReEnrich ? 65_000 : 40_000;
            const sources: ArticleSource[] = await Promise.race([
              isReEnrich
                ? this.gatherSourcesAggressive(article, rejectionReason)
                : this.gatherSourcesWithPriority(article),
              new Promise<ArticleSource[]>((_, reject) =>
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

            // Zero-source detection
            const hadNoExternalSources = sources.length === 0;
            if (hadNoExternalSources) {
              this.logger.warn(
                `⚠️ KAYNAK YOK: [${num}/${articles.length}] "${article.title.substring(0, 60)}" için hiç dış kaynak bulunamadı`,
              );
            }

            // Ensure at least 2 sources (use original article as fallback)
            if (sources.length < 2) {
              this.logger.warn(
                `[${num}] Insufficient sources (${sources.length}), using fallback`,
              );
              sources.push({
                title: article.title,
                url: article.url,
                content: article.description || "",
                relevanceScore: 100,
              });
            }

            apiCalls += 5; // Approximate: SearXNG + content extraction

            const output: ArticleWithSources = {
              // Pass-through all UniqueArticle fields
              title: article.title,
              description: article.description,
              url: article.url,
              publishedDate: article.publishedDate,
              source: article.source,
              trendScore: article.trendScore,
              category: article.category,
              relevanceScore: article.relevanceScore,
              reasoning: article.reasoning,
              suggestedCategory: article.suggestedCategory,
              suggestedTags: article.suggestedTags,
              topic: article.topic,
              isDuplicate: article.isDuplicate,
              duplicateReason: article.duplicateReason,
              embedding: article.embedding,
              // SourceGatherer output
              sources,
              hasNoExternalSources: hadNoExternalSources,
              // Re-enrich metadata passthrough
              _forceReEnrich: article._forceReEnrich,
              _rejectionReason: article._rejectionReason,
              _retryCount: article._retryCount,
            };

            return { success: true as const, data: output };
          } catch (error) {
            this.logger.error(
              `❌ [${num}] Failed to gather sources: ${article.title.substring(0, 50)}`,
              this.serializeError(error),
            );
            return { success: false as const, error };
          }
        });

        const settled = await Promise.allSettled(promises);
        for (const r of settled) {
          if (r.status === "fulfilled" && r.value.success) {
            // P0-1: Filter out 0-source articles — don't waste LLM compute
            if (r.value.data.hasNoExternalSources) {
              this.logger.warn(
                `🚫 FILTERED: "${r.value.data.title.substring(0, 60)}" — 0 external sources, skipping synthesis`,
              );
              continue;
            }
            results.push(r.value.data);
          }
        }
      }

      this.logger.success(
        `🏁 Source gathering complete: ${results.length}/${articles.length} articles`,
      );

      return {
        success: true,
        data: results,
        nextQueue: QUEUE_NAMES.CONTENT_SYNTHESIS,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls,
          tokensUsed: 0,
          itemsProcessed: results.length,
        },
      };
    } catch (error) {
      this.logger.error("Source gathering failed:", this.serializeError(error));
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls,
          tokensUsed: 0,
          itemsProcessed: 0,
        },
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOURCE GATHERING: NORMAL (Tavily + SearXNG)
  // ─────────────────────────────────────────────────────────────────────────

  private async gatherSources(
    article: UniqueArticle,
  ): Promise<ArticleSource[]> {
    const sources: ArticleSource[] = [];
    const seenUrls = new Set<string>();
    seenUrls.add(this.normalizeUrl(article.url));

    const keywords = this.extractSearchKeywords(
      article.title,
      article.description,
    );
    this.logger.info(`🔍 Deep research: Tavily + SearXNG for "${keywords}"`);

    // STEP 1: Tavily Deep Research
    let tavilySourceCount = 0;
    try {
      const { tavilySearch } = await import("@/lib/tavily");
      this.logger.info(`🔬 Tavily deep research starting...`);

      const tavilyResults = await tavilySearch(keywords, { max_results: 8 });

      for (const result of tavilyResults) {
        const normalizedUrl = this.normalizeUrl(result.url);
        if (seenUrls.has(normalizedUrl)) continue;
        seenUrls.add(normalizedUrl);
        if (this.shouldSkipUrl(result.url)) continue;

        if (result.content && result.content.length > 100) {
          sources.push({
            title: result.title,
            url: result.url,
            content: result.content,
            relevanceScore: Math.round(result.score * 100),
          });
          tavilySourceCount++;
        }
      }
      this.logger.info(`✅ Tavily: ${tavilySourceCount} sources collected`);
    } catch {
      this.logger.warn(`⚠️ Tavily failed, falling back to SearXNG`);
    }

    // STEP 2: SearXNG (if Tavily insufficient)
    if (sources.length < TARGET_SOURCE_COUNT) {
      const searchQueries = [keywords, `${keywords} news`];
      this.logger.info(`🔍 SearXNG search: ${keywords}`);

      const candidateUrls: Array<{
        title: string;
        url: string;
        relevanceScore: number;
      }> = [];

      const searchResults = await Promise.all(
        searchQueries.map(async (query) => {
          try {
            return await searxngSearch(query, {
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

          const relevanceScore = this.calculateRelevanceScoreSearXNG(
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
        `✅ SearXNG: ${sources.length - tavilySourceCount} additional sources`,
      );
    }

    this.logger.info(`✅ Total sources: ${sources.length} (Tavily + SearXNG)`);
    sources.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return sources;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOURCE GATHERING: PRIORITY-BASED (SearXNG → Tavily extract / Jina)
  // ─────────────────────────────────────────────────────────────────────────

  private async gatherSourcesWithPriority(
    article: UniqueArticle,
  ): Promise<ArticleSource[]> {
    const sources: ArticleSource[] = [];
    const seenUrls = new Set<string>();
    seenUrls.add(this.normalizeUrl(article.url));

    const keywords = this.extractSearchKeywords(
      article.title,
      article.description,
    );
    const trendScore = article.trendScore || 0;
    const isHighPriority = trendScore > 80;

    this.logger.info(
      `🔍 Source gathering: ${isHighPriority ? "HIGH" : "LOW"} priority (score: ${trendScore})`,
    );

    // STEP 1: Find candidate URLs using SearXNG
    this.logger.info(`🔍 SearXNG search: "${keywords}"`);
    const candidateUrls: Array<{
      title: string;
      url: string;
      relevanceScore: number;
    }> = [];

    const searchQueries = [keywords, `${keywords} news`];
    const searchResults = await Promise.all(
      searchQueries.map(async (query) => {
        try {
          return await searxngSearch(query, {
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

        const relevanceScore = this.calculateRelevanceScoreSearXNG(
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

    // Fallback: if no candidates found with threshold, take top 3 from raw SearXNG scores
    if (candidateUrls.length === 0) {
      this.logger.warn(
        `⚠️ No candidates above threshold, falling back to top SearXNG results`,
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
      uniqueResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      for (const r of uniqueResults.slice(0, 3)) {
        candidateUrls.push({ title: r.title, url: r.url, relevanceScore: 10 });
      }
      this.logger.info(
        `📋 Fallback: ${candidateUrls.length} candidates from raw SearXNG scores`,
      );
    }

    candidateUrls.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topCandidates = candidateUrls.slice(0, 10);
    this.logger.info(`📋 Found ${topCandidates.length} candidate URLs`);

    // STEP 2: Extract content (Tavily for high-priority, Jina for low)
    if (isHighPriority && topCandidates.length > 0) {
      this.logger.info(
        `🔥 HIGH PRIORITY: Using Tavily extract() for ${topCandidates.length} URLs`,
      );
      try {
        const extractResults = await batchExtract(
          topCandidates.map((c) => c.url),
          { query: keywords, chunksPerSource: 3, extractDepth: "basic" },
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
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `⚠️ Tavily extract failed: ${msg}, falling back to Jina`,
        );
      }
    }

    // LOW PRIORITY or Tavily failed: Jina Reader
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

    sources.sort((a, b) => b.relevanceScore - a.relevanceScore);
    this.logger.info(`✅ Total sources: ${sources.length}`);
    return sources;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SOURCE GATHERING: AGGRESSIVE (re-enrich only)
  // 4-layer parallel: SearXNG wide-net + Exa + content extraction + Firecrawl
  // ─────────────────────────────────────────────────────────────────────────

  private async gatherSourcesAggressive(
    article: UniqueArticle,
    rejectionReason?: string,
  ): Promise<ArticleSource[]> {
    const sources: ArticleSource[] = [];
    const seenUrls = new Set<string>();
    seenUrls.add(this.normalizeUrl(article.url));

    const keywords = this.extractSearchKeywords(
      article.title,
      article.description,
    );
    this.logger.warn(
      `🔥 AGGRESSIVE source gathering — "${article.title.substring(0, 50)}" (rejection: ${rejectionReason ?? "?"})`,
    );

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

    // PARALLEL SEARCH LAYERS
    const [searxResults, exaResults] = await Promise.allSettled([
      // Layer 1: SearXNG wide-net (4 queries, month range)
      (async () => {
        const queries = [
          keywords,
          `${keywords} news`,
          `${keywords} AI`,
          `${article.title.substring(0, 80)}`,
        ].filter(Boolean);

        const results = await Promise.all(
          queries.map((q) =>
            searxngSearch(q, {
              count: 10,
              time_range: "month",
              categories: "general,news",
            }).catch(() => [] as SearXNGResult[]),
          ),
        );
        return results.flat();
      })(),

      // Layer 2: Exa neural search
      (process.env.EXA_API_KEY
        ? exaSearch(keywords, {
            num_results: 8,
            use_autoprompt: true,
            type: "neural",
          })
        : Promise.resolve([])
      ).catch(() => []),
    ]);

    // Process SearXNG
    if (searxResults.status === "fulfilled") {
      const deduped: typeof candidateUrls = [];
      const innerSeen = new Set<string>();
      for (const r of searxResults.value) {
        if (!r?.url) continue;
        const norm = this.normalizeUrl(r.url);
        if (innerSeen.has(norm)) continue;
        innerSeen.add(norm);

        const score = this.calculateRelevanceScoreSearXNG(r, article.title);
        if (score >= 10) {
          deduped.push({ title: r.title, url: r.url, relevanceScore: score });
        }
      }
      deduped.sort((a, b) => b.relevanceScore - a.relevanceScore);
      for (const c of deduped.slice(0, 10)) {
        pushCandidate(c.title, c.url, c.relevanceScore);
      }
      this.logger.info(`🔍 SearXNG wide-net: ${deduped.length} candidates`);
    }

    // Process Exa
    if (exaResults.status === "fulfilled" && Array.isArray(exaResults.value)) {
      for (const r of exaResults.value) {
        if (!r?.url) continue;
        const scoreBase = Math.round((r.score || 0.5) * 80);
        pushCandidate(r.title ?? "", r.url, scoreBase);

        if (r.text && r.text.length > 200) {
          sources.push({
            title: r.title ?? "",
            url: r.url,
            content: r.text.substring(0, 5000),
            relevanceScore: scoreBase,
          });
          seenUrls.add(this.normalizeUrl(r.url));
        }
      }
      this.logger.info(`🤖 Exa neural: ${exaResults.value.length} results`);
    } else if (exaResults.status === "rejected") {
      this.logger.warn(`⚠️ Exa search failed: ${exaResults.reason}`);
    }

    // Content extraction for remaining candidates
    const TARGET = 7;
    const remaining = candidateUrls
      .filter((c) => !sources.some((s) => s.url === c.url))
      .slice(0, TARGET - sources.length + 3);

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

    // LAST RESORT: Firecrawl
    const MIN_SOURCES_BEFORE_FIRECRAWL = 4;
    if (
      sources.length < MIN_SOURCES_BEFORE_FIRECRAWL &&
      isFirecrawlAvailable()
    ) {
      this.logger.warn(
        `🔥 Insufficient sources (${sources.length}/${MIN_SOURCES_BEFORE_FIRECRAWL}), trying Firecrawl...`,
      );
      try {
        const fcPage = await firecrawlScrape(article.url, 12_000);
        if (fcPage.content && fcPage.content.length > 200) {
          this.logger.info(
            `🔥 Firecrawl scraped original URL (${fcPage.content.length} chars)`,
          );
          sources.unshift({
            title: fcPage.title || article.title,
            url: article.url,
            content: fcPage.content.substring(0, 5000),
            relevanceScore: 100,
          });
        }
      } catch (fcErr: unknown) {
        const msg = fcErr instanceof Error ? fcErr.message : String(fcErr);
        this.logger.warn(`🔥 Firecrawl last-resort failed: ${msg}`);
      }
    }

    sources.sort((a, b) => b.relevanceScore - a.relevanceScore);
    this.logger.warn(
      `🔥 AGGRESSIVE gather complete: ${sources.length} sources (target was ${TARGET})`,
    );
    return sources;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // URL CONTENT READING (Jina → Tavily → SearXNG fallback chain)
  // ─────────────────────────────────────────────────────────────────────────

  private async readUrlContent(url: string): Promise<string> {
    // Try Jina Reader first
    try {
      const response = await axios.get(`${JINA_READER_URL}/${url}`, {
        headers: { Accept: "text/plain", "X-Return-Format": "markdown" },
        timeout: JINA_TIMEOUT,
      });
      const content = response.data;
      if (content && content.length > 100) {
        return content.substring(0, 5000);
      }
      this.logger.warn(
        `⚠️ Jina Reader returned insufficient content for ${url} (${content?.length || 0} chars)`,
      );
    } catch (jinaError: unknown) {
      const msg =
        jinaError instanceof Error ? jinaError.message : String(jinaError);
      this.logger.warn(`⚠️ Jina Reader failed for ${url}: ${msg}`);
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
      } catch (tavilyError: unknown) {
        const msg =
          tavilyError instanceof Error
            ? tavilyError.message
            : String(tavilyError);
        this.logger.warn(`⚠️ Tavily fallback failed for ${url}: ${msg}`);
      }
    }

    // Fallback 2: SearXNG (search for URL content)
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      const searchQuery = pathParts
        .join(" ")
        .replace(/[-_]/g, " ")
        .replace(/\.(html|htm|php|aspx)$/i, "")
        .substring(0, 100);

      if (searchQuery.length > 10) {
        this.logger.info(
          `🔍 SearXNG fallback: searching for "${searchQuery.substring(0, 50)}..."`,
        );
        const results = await searxngSearch(searchQuery, {
          count: 5,
          language: "en",
          categories: "general",
        });

        if (results && results.length > 0) {
          const combinedContent = results
            .slice(0, 3)
            .map((r) => `${r.title}\n${r.content}`)
            .join("\n\n");

          if (combinedContent.length > 200) {
            this.logger.info(
              `✅ SearXNG fallback succeeded for ${url} (${combinedContent.length} chars)`,
            );
            return combinedContent.substring(0, 5000);
          }
        }
        this.logger.warn(`⚠️ SearXNG returned insufficient content for ${url}`);
      }
    } catch (searxngError: unknown) {
      const msg =
        searxngError instanceof Error
          ? searxngError.message
          : String(searxngError);
      this.logger.warn(`⚠️ SearXNG fallback failed for ${url}: ${msg}`);
    }

    this.logger.error(`❌ All extraction methods failed for ${url}`);
    return "";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: Extract search keywords
  // ─────────────────────────────────────────────────────────────────────────

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
          w.length < 30 &&
          !stopWords.has(w) &&
          !ambiguousWords.has(w) &&
          !/^[0-9a-f]{8,}$/i.test(w) &&
          !/^[a-z0-9]{20,}$/i.test(w) &&
          !/^\d+$/.test(w),
      );

    const originalWords = `${title} ${description}`.split(/\s+/);
    const properNouns = new Set(
      originalWords
        .filter((w) => /^[A-Z][a-zA-Z]{2,}/.test(w) || /^[A-Z]{2,}/.test(w))
        .map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))
        .filter(
          (w) => w.length > 2 && !stopWords.has(w) && !ambiguousWords.has(w),
        ),
    );

    const sortedWords = words.sort((a, b) => {
      const aIsProper = properNouns.has(a) ? 1 : 0;
      const bIsProper = properNouns.has(b) ? 1 : 0;
      if (bIsProper !== aIsProper) return bIsProper - aIsProper;
      return b.length - a.length;
    });

    const uniqueWords = [...new Set(sortedWords)].slice(0, 8);
    this.logger.info(
      `🔑 Keywords extracted: "${uniqueWords.join(" ")}" (from: "${title.substring(0, 60)}...")`,
    );
    return uniqueWords.join(" ");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: Calculate SearXNG relevance score
  // ─────────────────────────────────────────────────────────────────────────

  private calculateRelevanceScoreSearXNG(
    result: SearXNGResult,
    originalTitle: string,
  ): number {
    let score = 0;
    const titleLower = originalTitle.toLowerCase();
    const resultTitleLower = result.title.toLowerCase();
    const resultContentLower = (result.content || "").toLowerCase();

    // Dictionary/reference instant reject
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
    const dictMatchCount = dictionarySignals.filter(
      (s) => resultTitleLower.includes(s) || resultContentLower.includes(s),
    ).length;
    if (dictMatchCount >= 2) return -100;

    // Tech context check
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

    // Title word matching
    const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);
    for (const word of titleWords) {
      if (resultTitleLower.includes(word)) score += 15;
      if (resultContentLower.includes(word)) score += 5;
    }

    // Recency bonus
    if (result.publishedDate) {
      const publishedDate = new Date(result.publishedDate);
      const hoursDiff =
        (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 24) score += 20;
      else if (hoursDiff < 168) score += 10;
    }

    // Authority domain bonus
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
    if (authorityDomains.some((d) => result.url.includes(d))) score += 15;

    // SearXNG native score
    if (result.score) score += result.score * 10;

    // Tech context bonus / penalty
    if (hasTechContext) score += 10;
    if (!hasTechContext && score < 30) score = Math.max(0, score - 15);

    return score;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER: URL utilities
  // ─────────────────────────────────────────────────────────────────────────

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
      /medium\.com\/@/i,
      /amazon\.com/i,
      /ebay\.com/i,
      /aliexpress\.com/i,
    ];
    return skipPatterns.some((pattern) => pattern.test(url));
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return `${urlObj.origin}${urlObj.pathname.replace(/\/$/, "")}`;
    } catch {
      return url;
    }
  }

  /** Validate source content quality (prevents garbage/dictionary content) */
  isSourceContentClean(content: string): boolean {
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
    if (matchCount >= 2) return false;

    const alphanumeric = (
      content.match(/[a-zA-Z0-9\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF]/g) || []
    ).length;
    const ratio = alphanumeric / content.length;
    if (ratio < 0.5 && content.length > 200) return false;

    return true;
  }
}
