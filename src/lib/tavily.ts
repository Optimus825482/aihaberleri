/**
 * Tavily Search API Integration
 * Better for trend analysis with higher rate limits
 */

import axios from "axios";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_API_URL = "https://api.tavily.com/search";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  response_time: number;
}

/**
 * Search using Tavily API
 */
export async function tavilySearch(
  query: string,
  options: {
    max_results?: number;
    include_domains?: string[];
    exclude_domains?: string[];
  } = {},
): Promise<TavilySearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured");
  }

  try {
    const response = await axios.post<TavilySearchResponse>(
      TAVILY_API_URL,
      {
        api_key: apiKey,
        query,
        max_results: options.max_results || 10,
        include_domains: options.include_domains,
        exclude_domains: options.exclude_domains,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: false,
      },
      {
        timeout: 10000,
      },
    );

    return response.data.results || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Tavily Search API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    throw error;
  }
}

/**
 * Calculate trend score using Tavily
 */
export async function calculateTrendScoreTavily(
  title: string,
  description: string,
): Promise<number> {
  try {
    const searchQuery = extractKeywords(title, description);
    const results = await tavilySearch(searchQuery, {
      max_results: 10,
    });

    let score = 0;

    // Base score from result count
    score += Math.min(results.length * 10, 100);

    // Score based on relevance scores
    for (const result of results) {
      score += result.score * 50; // Tavily provides relevance score 0-1

      // Bonus for title matches
      const titleLower = title.toLowerCase();
      const resultTitleLower = result.title.toLowerCase();
      const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);

      let matchCount = 0;
      for (const word of titleWords) {
        if (resultTitleLower.includes(word)) {
          matchCount++;
        }
      }

      const matchRatio = matchCount / titleWords.length;
      score += matchRatio * 30;

      // Bonus for recent results
      if (result.published_date) {
        const pubDate = new Date(result.published_date);
        const hoursSince = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);

        if (hoursSince < 24) {
          score += 20;
        } else if (hoursSince < 48) {
          score += 10;
        }
      }

      // --- NEW TRAFFIC MAGNET LOGIC ---

      // 1. Social Discussion Boost (Reddit, Twitter/X, HackerNews)
      // These domains indicate accurate human interest and "stickiness"
      const socialDomains = [
        "reddit.com",
        "twitter.com",
        "x.com",
        "news.ycombinator.com",
        "quora.com",
        "medium.com",
      ];
      if (socialDomains.some((d) => result.url.includes(d))) {
        score += 40; // High boost for social discussion
      }

      // 2. Video/Visual Boost (YouTube)
      // High intent for visual explanation
      if (
        result.url.includes("youtube.com") ||
        result.url.includes("vimeo.com")
      ) {
        score += 30;
      }

      // 3. Authority Boost (Tech Giants)
      const authorityDomains = [
        "techcrunch.com",
        "theverge.com",
        "wired.com",
        "bloomberg.com",
        "reuters.com",
      ];
      if (authorityDomains.some((d) => result.url.includes(d))) {
        score += 15;
      }
    }

    return score;
  } catch (error) {
    console.error("Tavily trend score error:", error);
    return 0;
  }
}

/**
 * Extract keywords from title and description
 */
function extractKeywords(title: string, description: string): string {
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
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "this",
    "that",
    "these",
    "those",
  ]);

  const words = text
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 10);

  return words.join(" ");
}

/**
 * Rank articles by trend using Tavily
 */
export async function rankArticlesByTrendTavily(
  articles: Array<{ title: string; description: string }>,
): Promise<Array<{ index: number; score: number }>> {
  console.log(`📊 Tavily ile ${articles.length} haber analiz ediliyor...`);

  const scores = await Promise.all(
    articles.map(async (article, index) => {
      const score = await calculateTrendScoreTavily(
        article.title,
        article.description,
      );
      return { index, score };
    }),
  );

  scores.sort((a, b) => b.score - a.score);

  console.log("✅ Tavily trend sıralaması tamamlandı");
  console.log(
    "Top 5:",
    scores
      .slice(0, 5)
      .map((s) => `#${s.index + 1} (skor: ${Math.round(s.score)})`)
      .join(", "),
  );

  return scores;
}

export default {
  tavilySearch,
  calculateTrendScoreTavily,
  rankArticlesByTrendTavily,
};
