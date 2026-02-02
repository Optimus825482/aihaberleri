/**
 * Content Enricher Agent
 *
 * RESPONSIBILITIES:
 * 1. Multi-source research (Brave API + Jina Reader)
 * 2. Gather 8-10 sources per article
 * 3. DeepSeek content synthesis (TR + EN)
 * 4. Generate keywords and meta descriptions
 * 5. Emit enriched articles to enriched-articles queue
 *
 * EXTRACTED FROM: src/services/intelligent-news.service.ts
 * - gatherSources() function
 * - synthesizeContent() function
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult, retryWithBackoff } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import { braveSearch, type BraveSearchResult } from "@/lib/brave";
import { callDeepSeek } from "@/lib/deepseek";
import { callGemini } from "@/lib/gemini"; // HYBRID: Using Gemini for EN translation
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
}

const JINA_READER_URL = "https://r.jina.ai";
const JINA_TIMEOUT = 10000;
const TAVILY_EXTRACT_URL = "https://api.tavily.com/extract";
const TAVILY_TIMEOUT = 12000;
const TARGET_SOURCE_COUNT = 8;

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
      const enrichedArticles: EnrichedArticle[] = [];

      for (const article of articles) {
        this.logger.info(`Enriching: ${article.title.substring(0, 50)}...`);

        try {
          // Step 1: Gather sources
          const sources = await this.gatherSources(article);
          apiCalls += 5; // Brave API calls

          if (sources.length < 2) {
            this.logger.warn(
              `Insufficient sources (${sources.length}), using fallback`,
            );
            sources.push({
              title: article.title,
              url: article.url,
              content: article.description || "",
              relevanceScore: 100,
            });
          }

          // Step 2: Synthesize content (TR + EN)
          const synthesized = await this.synthesizeContent(
            article,
            sources,
            article.suggestedCategory || "teknoloji",
          );
          apiCalls += 2; // DeepSeek calls (TR + EN)
          tokensUsed += 12000; // Estimate

          enrichedArticles.push({
            ...article,
            sources,
            synthesizedContent: synthesized,
          });

          this.logger.success(
            `Enriched: ${synthesized.tr.title.substring(0, 50)}...`,
          );

          // Rate limiting between articles
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } catch (error) {
          this.logger.error(
            `Failed to enrich article: ${article.title.substring(0, 50)}...`,
            this.serializeError(error),
          );
          // Skip this article, continue with next
        }
      }

      this.logger.success(
        `Enrichment complete: ${enrichedArticles.length}/${articles.length} articles`,
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
   * Gather sources using Brave Search + Jina Reader
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

    // Generate diverse search queries
    const searchQueries = [
      keywords,
      `${keywords} latest news`,
      `${keywords} analysis`,
      `${keywords} details facts`,
    ];

    // Search with each query
    for (const query of searchQueries) {
      if (sources.length >= TARGET_SOURCE_COUNT) break;

      try {
        const results = await braveSearch(query, {
          count: 10,
          freshness: "pw", // Past week
        });

        for (const result of results) {
          if (sources.length >= TARGET_SOURCE_COUNT) break;

          const normalizedUrl = this.normalizeUrl(result.url);
          if (seenUrls.has(normalizedUrl)) continue;
          seenUrls.add(normalizedUrl);

          if (this.shouldSkipUrl(result.url)) continue;

          const relevanceScore = this.calculateRelevanceScore(
            result,
            article.title,
          );

          if (relevanceScore >= 30) {
            const content = await this.readUrlContent(result.url);

            if (content && content.length > 100) {
              sources.push({
                title: result.title,
                url: result.url,
                content,
                relevanceScore,
              });
            }
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        this.logger.warn(
          `Search failed for query: ${query}`,
          this.serializeError(error),
        );
      }
    }

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
   * Calculate relevance score
   */
  private calculateRelevanceScore(
    result: BraveSearchResult,
    originalTitle: string,
  ): number {
    let score = 0;

    const titleLower = originalTitle.toLowerCase();
    const resultTitleLower = result.title.toLowerCase();
    const resultDescLower = (result.description || "").toLowerCase();

    const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);
    for (const word of titleWords) {
      if (resultTitleLower.includes(word)) score += 15;
      if (resultDescLower.includes(word)) score += 5;
    }

    if (result.age) {
      if (result.age.includes("hour")) score += 20;
      else if (result.age.includes("day")) score += 10;
    }

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
