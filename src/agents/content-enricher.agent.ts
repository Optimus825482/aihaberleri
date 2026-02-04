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
import { callGemini } from "@/lib/gemini"; // HYBRID: Using Gemini for EN translation
import {
  generateTitleVariants,
  initializeABTestData,
  TitleABTestData,
} from "@/lib/title-ab-testing";
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
const JINA_TIMEOUT = 5000; // Reduced from 10s to 5s for faster processing
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";
const TAVILY_TIMEOUT = 8000; // Reduced from 12s to 8s
const TARGET_SOURCE_COUNT = 5; // Reduced from 8 to 5 for faster processing

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

  constructor() {
    super("content-enricher");
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
      // 🚀 PARALLEL PROCESSING: Process all articles concurrently for 5x speed boost
      this.logger.info(
        `🚀 Starting PARALLEL enrichment for ${articles.length} articles...`,
      );

      const enrichmentPromises = articles.map(async (article, index) => {
        const articleNum = index + 1;
        this.logger.info(
          `[${articleNum}/${articles.length}] Enriching: ${article.title.substring(0, 50)}...`,
        );

        try {
          // Step 1: Gather sources (parallel SearXNG + Jina)
          const sources = await this.gatherSources(article);

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

          // Step 2: Synthesize content (TR + EN) - these run in parallel across articles
          const synthesized = await this.synthesizeContent(
            article,
            sources,
            article.suggestedCategory || "teknoloji",
          );

          // Step 3: Generate Title A/B Test Variants
          let titleABTest: TitleABTestData | undefined;
          try {
            const variants = await generateTitleVariants(
              synthesized.tr.content,
              article.suggestedCategory || "teknoloji",
            );
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
          return { success: false as const, error };
        }
      });

      // Wait for all articles to complete in parallel
      const results = await Promise.allSettled(enrichmentPromises);

      const enrichedArticles: EnrichedArticle[] = [];
      let successCount = 0;
      let failCount = 0;

      for (const result of results) {
        if (result.status === "fulfilled" && result.value.success) {
          enrichedArticles.push(result.value.data);
          successCount++;
          apiCalls += 8; // Approximate: 5 SearXNG + 2 LLM + 1 A/B test
          tokensUsed += 12500;
        } else {
          failCount++;
        }
      }

      this.logger.success(
        `🏁 PARALLEL enrichment complete: ${successCount}/${articles.length} articles (${failCount} failed)`,
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
   * Gather sources using SearXNG + Jina Reader (UNLIMITED!)
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

    // Generate diverse search queries - use only 2 queries for speed
    const searchQueries = [keywords, `${keywords} news`];

    this.logger.info(`🔍 Fast SearXNG search: ${keywords}`);

    // Collect all candidate URLs first (fast)
    const candidateUrls: Array<{
      title: string;
      url: string;
      relevanceScore: number;
    }> = [];

    // Search with all queries in parallel
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

    // Flatten and dedupe results
    for (const results of searchResults) {
      for (const result of results) {
        if (candidateUrls.length >= TARGET_SOURCE_COUNT * 2) break; // Get 2x candidates

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

    // Sort by relevance and take top candidates
    candidateUrls.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topCandidates = candidateUrls.slice(0, TARGET_SOURCE_COUNT);

    // 🚀 PARALLEL: Read all URLs in parallel (major speed boost!)
    this.logger.info(`📖 Reading ${topCandidates.length} URLs in parallel...`);

    const contentResults = await Promise.allSettled(
      topCandidates.map(async (candidate) => {
        const content = await this.readUrlContent(candidate.url);
        return { ...candidate, content };
      }),
    );

    // Collect successful results
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

    this.logger.info(`✅ Got ${sources.length} sources from parallel fetch`);

    // Sort by relevance
    sources.sort((a, b) => b.relevanceScore - a.relevanceScore);

    return sources;
  }

  /**
   * Read URL content using Jina Reader with Tavily fallback
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
    } catch {
      // Silent fail, try Tavily
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
          return results[0].raw_content.substring(0, 5000);
        }
      } catch {
        // Silent fail
      }
    }

    return "";
  }

  /**
   * Synthesize content from multiple sources (TR + EN)
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
    const sourcesText = sources
      .slice(0, 6)
      .map(
        (s, i) => `
--- SOURCE ${i + 1}: ${new URL(s.url).hostname} ---
Title: ${s.title}
URL: ${s.url}
Content:
${s.content.substring(0, 2000)}
`,
      )
      .join("\n");

    // Turkish content (HYBRID: Using DeepSeek-Chat for complex synthesis - proven quality)
    this.logger.info(
      `🤖 HYBRID: Using DeepSeek-Chat for TR content synthesis (proven quality)`,
    );
    const trPrompt = `Sen dünya çapında ödüllü bir investigative journalist ve haber editörüsün.

Görevin: Aşağıdaki ${sources.length} FARKLI KAYNAKTAN toplanan bilgileri SENTEZLEYEREK, KAPSAMLI ve ORİJİNAL bir Türkçe haber makalesi oluştur.

### ORİJİNAL HABER:
Başlık: ${article.title}
Açıklama: ${article.description}
Kaynak URL: ${article.url}

### TOPLANAN KAYNAKLAR:
${sourcesText}

### SENTEZ KURALLARI:
1. ORİJİNAL İÇERİK OLUŞTUR (kopyalama, sentezle)
2. Kaynak atıf yap: "Reuters'a göre...", "TechCrunch'ın haberine göre..."
3. Profesyonel üslup: Objektif, mesafeli, 3. tekil şahıs
4. Yapı: Başlık (50-70 karakter), Özet (2-3 cümle), İçerik (HTML, min 500 kelime)
5. SEO: Meta açıklama (150-160 karakter), 5-8 anahtar kelime

JSON formatında yanıt ver:
{
  "title": "SEO Uyumlu Türkçe Başlık",
  "excerpt": "2-3 cümlelik özet",
  "content": "HTML formatlı tam makale",
  "keywords": ["anahtar1", "anahtar2"],
  "metaDescription": "SEO meta açıklama",
  "score": 850
}`;

    const trResponse = await callDeepSeek(
      [
        {
          role: "system",
          content:
            "Sen dünyanın en iyi Türkçe haber editörüsün. Sadece geçerli JSON yanıtı ver.",
        },
        { role: "user", content: trPrompt },
      ],
      {
        model: "deepseek-chat",
        maxTokens: 6000,
        temperature: 0.9,
      },
    );

    const trJsonMatch = trResponse.match(/\{[\s\S]*\}/);
    if (!trJsonMatch) {
      throw new Error("Failed to parse Turkish content");
    }
    const trContent = JSON.parse(trJsonMatch[0]);

    // English content (HYBRID: Using Gemini 2.5 Flash Lite for translation - 47% cheaper)
    this.logger.info(
      `🤖 HYBRID: Using Gemini 2.5 Flash Lite for EN content synthesis (47% cheaper)`,
    );
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

    const enResponse = await callGemini(enPrompt, {
      model: "gemini-2.5-flash-lite",
      maxTokens: 6000,
      temperature: 0.9,
    });

    const enJsonMatch = enResponse.match(/\{[\s\S]*\}/);
    if (!enJsonMatch) {
      throw new Error("Failed to parse English content");
    }
    const enContent = JSON.parse(enJsonMatch[0]);

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
}
