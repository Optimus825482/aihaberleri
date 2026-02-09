/**
 * Content Enricher Agent
 *
 * RESPONSIBILITIES:
 * 1. Multi-source research (SearXNG + Jina Reader) ⭐ UNLIMITED!
 * 2. Gather 8-10 sources per article
 * 3. DeepSeek content synthesis (TR + EN)
 * 4. Generate keywords and meta descriptions
 * 5. Emit enriched articles to enriched-articles queue
 *
 * EXTRACTED FROM: src/services/intelligent-news.service.ts
 * - gatherSources() function
 * - synthesizeContent() function
 *
 * UPDATED: Using SearXNG instead of Brave API (no rate limits!)
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult, retryWithBackoff } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import { searxngSearch, type SearXNGResult } from "@/lib/searxng";
import { callDeepSeek } from "@/lib/deepseek";
// callGemini REMOVED - Using DeepSeek-only (Gemini API deprecated due to 404 errors)
import {
  generateTitleVariants,
  initializeABTestData,
  TitleABTestData,
} from "@/lib/title-ab-testing";
import {
  batchExtract,
  priorityExtract,
  filterQualityResults,
} from "@/lib/tavily-extract";
import axios from "axios";
import type { UniqueArticle } from "./duplicate-detector.agent";

export interface EnrichedArticle extends UniqueArticle {
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
      score: number;
    };
    en: {
      title: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
    };
  };
  // Title A/B Testing data
  titleABTest?: TitleABTestData;
}

const JINA_READER_URL = "https://r.jina.ai";
const JINA_TIMEOUT = 15000; // FIXED: 15s (increased from 8s - heavy sites need more time)
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";
const TAVILY_TIMEOUT = 20000; // FIXED: 20s (increased from 12s for reliability)
const SEARXNG_TIMEOUT = 8000; // FIXED: 8s (increased from 5s)
const TARGET_SOURCE_COUNT = 3; // Keep at 3 for speed

// Layer timeouts for fallback strategy
const LAYER_1_TIMEOUT = 20000; // 20s for Tavily (high-priority)
const LAYER_2_TIMEOUT = 25000; // 25s for SearXNG + Jina
const LAYER_3_TIMEOUT = 30000; // 30s for LLM synthesis
const MAX_ARTICLE_TIMEOUT = 60000; // 60s HARD LIMIT per article

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
    queueName: QUEUE_NAMES.ENRICHED_ARTICLES,
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
            // Step 1: Gather sources (priority-based: Tavily for high-priority, Jina for low-priority)
            // TIMEOUT PROTECTION: Wrap in Promise.race with 40s timeout (increased from 30s)
            const sources = await Promise.race([
              this.gatherSourcesWithPriority(article),
              new Promise<any>((_, reject) =>
                setTimeout(
                  () => reject(new Error("Source gathering timeout (40s)")),
                  40000, // FIXED: Increased from 30s
                ),
              ),
            ]);

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

            // Step 2: Synthesize content (TR + EN) - DeepSeek ONLY
            // TIMEOUT PROTECTION: Wrap in Promise.race with 120s timeout for DeepSeek
            const synthesized = await Promise.race([
              this.synthesizeContent(
                article,
                sources,
                article.suggestedCategory || "teknoloji",
              ),
              new Promise<any>((_, reject) =>
                setTimeout(
                  () => reject(new Error("Content synthesis timeout (120s)")),
                  120000, // DeepSeek may take 60-90s for large content
                ),
              ),
            ]);

            // Step 3: Generate Title A/B Test Variants
            // TIMEOUT PROTECTION: Wrap in Promise.race with 10s timeout
            let titleABTest: TitleABTestData | undefined;
            try {
              const variants = await Promise.race([
                generateTitleVariants(
                  synthesized.tr.content,
                  article.suggestedCategory || "teknoloji",
                ),
                new Promise<any>((_, reject) =>
                  setTimeout(
                    () => reject(new Error("A/B test timeout (10s)")),
                    10000,
                  ),
                ),
              ]);
              titleABTest = initializeABTestData(variants);
            } catch (abTestError) {
              this.logger.warn(
                `[${articleNum}] Title A/B test failed, continuing without`,
              );
            }

            this.logger.success(
              `✅ [${articleNum}/${articles.length}] Enriched: ${synthesized.tr.title.substring(0, 50)}...`,
            );

            return {
              success: true as const,
              data: {
                ...article,
                sources,
                synthesizedContent: synthesized,
                titleABTest,
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
            apiCalls += 8; // Approximate: 5 SearXNG + 2 LLM + 1 A/B test
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
   * Gather sources using Tavily (DEEP RESEARCH) + SearXNG + Jina Reader
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

    this.logger.info(`🔍 Deep research: Tavily + SearXNG for "${keywords}"`);

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
      this.logger.warn(`⚠️ Tavily failed, falling back to SearXNG`);
    }

    // ============================================
    // STEP 2: SearXNG (if Tavily insufficient)
    // ============================================
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
    // STEP 1: Find candidate URLs using SearXNG
    // ============================================
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

  /**
   * Read URL content using Jina Reader with Tavily fallback
   * FIXED: Added detailed error logging and increased timeout
   */
  private async readUrlContent(url: string): Promise<string> {
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

    // Fallback to Tavily
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

    this.logger.error(`❌ All extraction methods failed for ${url}`);
    return "";
  }

  /**
   * Synthesize content from multiple sources (TR + EN)
   * Using DeepSeek-chat for both TR and EN content generation
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
  ): Promise<{
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

    // Using DeepSeek-chat for BOTH TR and EN content synthesis
    this.logger.info(
      `🚀 Using DeepSeek-chat for BOTH TR + EN synthesis`,
    );

    // Turkish content (DeepSeek-chat)
    const trPrompt = `Sen usta bir araştırmacı gazeteci ve baş editörsün.

Görevin: Aşağıdaki ${sources.length} FARKLI KAYNAKTAN toplanan ham verileri derinlemesine analiz ederek, SENTEZLEYEREK, KAPSAMLI ve %100 ORİJİNAL bir Türkçe haber makalesi oluşturmak.

### ORİJİNAL HABER BAŞLIĞI:
${article.title}

### TOPLANAN KAYNAKLAR:
${sourcesText}

### YAZIM KURALLARI:
1. İNSANSI VE AKICI DİL: Robotik değil, doğal Türkçe
2. DERİN ANALİZ: "Ne oldu" + "Neden oldu" + "Ne anlama geliyor"
3. OBJEKTİF AMA ÇARPICI: Tarafsız kal ama sıkıcı olma
4. KAYNAK KULLANIMI: "Reuters'a göre...", "TechCrunch'ın raporuna göre..."
5. Benzersiz Anlatım: Her cümlen özgün olsun

### YAPI:
- Başlık: 50-70 karakter, tıklamaya teşvik eden
- Özet: 2-3 cümlelik giriş
- İçerik: En az 600 kelime, HTML formatlı (<p>, <h2>, <ul>/<ol>)
- SEO: 150-160 karakterlik meta açıklama ve 6-10 anahtar kelime

JSON formatında yanıt ver:
{
  "title": "Çarpıcı ve SEO Uyumlu Başlık",
  "excerpt": "Okuyucuyu yakalayan özet",
  "content": "HTML formatlı, derin analiz içeren tam makale",
  "keywords": ["anahtar1", "anahtar2"],
  "metaDescription": "SEO meta açıklama",
  "score": 950
}`;

    let trContent: any;
    try {
      const trResponse = await callDeepSeek(
        [{ role: "user", content: trPrompt }],
        {
          model: "deepseek-chat",
          maxTokens: 6000,
          temperature: 0.7,
        }
      );

      const trJsonMatch = trResponse.match(/\{[\s\S]*\}/);
      if (!trJsonMatch) {
        throw new Error("Failed to parse Turkish content from DeepSeek");
      }
      trContent = JSON.parse(trJsonMatch[0]);
      this.logger.success(`✅ DeepSeek TR content generated successfully`);
    } catch (deepseekTrError: any) {
      this.logger.error(
        `❌ DeepSeek TR failed: ${deepseekTrError.message}, using emergency template`,
      );
      // Emergency template fallback
      return this.generateEmergencyTemplate(article, sources);
    }

    // English content (DeepSeek-chat)
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
4. Structure: Title (50-70 chars), Excerpt (2-3 sentences), Content (HTML, min 500 words)
5. SEO: Meta description (150-160 chars), 5-8 keywords

Respond in JSON:
{
  "title": "SEO-Optimized English Title",
  "excerpt": "2-3 sentence summary",
  "content": "Full HTML article",
  "keywords": ["keyword1", "keyword2"],
  "metaDescription": "SEO meta description"
}`;

    let enContent: any;
    try {
      const enResponse = await callDeepSeek(
        [{ role: "user", content: enPrompt }],
        {
          model: "deepseek-chat",
          maxTokens: 6000,
          temperature: 0.7,
        }
      );

      const enJsonMatch = enResponse.match(/\{[\s\S]*\}/);
      if (!enJsonMatch) {
        throw new Error("Failed to parse English content from DeepSeek");
      }
      enContent = JSON.parse(enJsonMatch[0]);
      this.logger.success(`✅ DeepSeek EN content generated successfully`);
    } catch (deepseekEnError: any) {
      this.logger.error(
        `❌ DeepSeek EN failed: ${deepseekEnError.message}, using emergency template`,
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

    const words = text
      .replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
      .slice(0, 8);

    return words.join(" ");
  }

  /**
   * Calculate relevance score for SearXNG results
   */
  private calculateRelevanceScoreSearXNG(
    result: SearXNGResult,
    originalTitle: string,
  ): number {
    let score = 0;

    const titleLower = originalTitle.toLowerCase();
    const resultTitleLower = result.title.toLowerCase();
    const resultContentLower = (result.content || "").toLowerCase();

    const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);
    for (const word of titleWords) {
      if (resultTitleLower.includes(word)) score += 15;
      if (resultContentLower.includes(word)) score += 5;
    }

    // SearXNG provides publishedDate
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

    // SearXNG score (if available)
    if (result.score) {
      score += result.score * 10; // Normalize SearXNG score
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
    const category = article.suggestedCategory || "teknoloji";
    const sourceContent =
      sources[0]?.content || article.description || article.title;

    // Turkish content (template-based)
    const trTitle = article.title;
    const trExcerpt = sourceContent.substring(0, 200) + "...";
    const trContent = `
<p>${sourceContent}</p>

<h2>Detaylar</h2>
<p>Bu haber ${category} kategorisinde yayınlanmıştır.</p>

<p><strong>Kaynak:</strong> <a href="${article.url}" target="_blank" rel="noopener nofollow">${new URL(article.url).hostname}</a></p>

<div class="ai-disclosure" style="margin-top: 2.5rem; padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(147,51,234,0.08) 100%); border-radius: 12px; border: 1px solid rgba(59,130,246,0.15);">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;"><path d="M12 8V4H8"/><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8a4 4 0 0 1 0 8"/><path d="M12 8a4 4 0 0 0 0 8"/></svg>
    <span style="font-size: 0.75rem; font-weight: 600; color: #3b82f6;">Yapay Zeka Destekli İçerik</span>
  </div>
  <div style="font-size: 0.65rem; color: #94a3b8;">
    <strong style="color: #64748b;">Kaynak:</strong> <a href="${article.url}" target="_blank" rel="noopener nofollow" style="color: #60a5fa; text-decoration: none;">${new URL(article.url).hostname}</a>
  </div>
</div>`;

    // English content (template-based)
    const enTitle = article.title;
    const enExcerpt = sourceContent.substring(0, 200) + "...";
    const enContent = `
<p>${sourceContent}</p>

<h2>Details</h2>
<p>This news was published in the ${category} category.</p>

<p><strong>Source:</strong> <a href="${article.url}" target="_blank" rel="noopener nofollow">${new URL(article.url).hostname}</a></p>

<div class="ai-disclosure" style="margin-top: 2.5rem; padding: 1rem 1.25rem; background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(147,51,234,0.08) 100%); border-radius: 12px; border: 1px solid rgba(59,130,246,0.15);">
  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: #3b82f6;"><path d="M12 8V4H8"/><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 8a4 4 0 0 1 0 8"/><path d="M12 8a4 4 0 0 0 0 8"/></svg>
    <span style="font-size: 0.75rem; font-weight: 600; color: #3b82f6;">AI-Powered Content</span>
  </div>
  <div style="font-size: 0.65rem; color: #94a3b8;">
    <strong style="color: #64748b;">Source:</strong> <a href="${article.url}" target="_blank" rel="noopener nofollow" style="color: #60a5fa; text-decoration: none;">${new URL(article.url).hostname}</a>
  </div>
</div>`;

    // Extract keywords from title
    const keywords = article.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .slice(0, 6);

    return {
      tr: {
        title: trTitle,
        excerpt: trExcerpt,
        content: trContent,
        keywords,
        metaDescription: trExcerpt.substring(0, 160),
        score: 50, // Emergency template = low score
      },
      en: {
        title: enTitle,
        excerpt: enExcerpt,
        content: enContent,
        keywords,
        metaDescription: enExcerpt.substring(0, 160),
      },
    };
  }
}
