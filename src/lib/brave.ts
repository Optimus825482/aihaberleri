/**
 * Brave Search API Integration
 * Used for trend analysis and popularity scoring
 */

import axios from "axios";

const BRAVE_API_KEY = process.env.BRAVE_API_KEY;
const BRAVE_API_URL = "https://api.search.brave.com/res/v1/web/search";

if (!BRAVE_API_KEY) {
  console.warn("⚠️  BRAVE_API_KEY is not set");
}

export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
  page_age?: string;
  language?: string;
}

export interface BraveSearchResponse {
  query: {
    original: string;
  };
  web?: {
    results: BraveSearchResult[];
  };
}

/**
 * Search using Brave Search API
 */
export async function braveSearch(
  query: string,
  options: {
    count?: number;
    freshness?: string;
    country?: string;
  } = {},
): Promise<BraveSearchResult[]> {
  if (!BRAVE_API_KEY) {
    throw new Error("BRAVE_API_KEY is not configured");
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: (options.count || 10).toString(),
      search_lang: "en",
      country: options.country || "US",
      safesearch: "moderate",
      text_decorations: "false",
      spellcheck: "true",
    });

    if (options.freshness) {
      params.append("freshness", options.freshness);
    }

    const response = await axios.get<BraveSearchResponse>(
      `${BRAVE_API_URL}?${params.toString()}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": BRAVE_API_KEY,
        },
        timeout: 10000,
      },
    );

    return response.data.web?.results || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Brave Search API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    throw error;
  }
}

/**
 * Calculate trend score for an article
 * Higher score = more trending
 */
export async function calculateTrendScore(
  title: string,
  description: string,
): Promise<number> {
  try {
    console.log(`📊 Trend skoru hesaplanıyor: ${title.substring(0, 50)}...`);

    // Search for the article topic
    const searchQuery = extractKeywords(title, description);
    const results = await braveSearch(searchQuery, {
      count: 20,
      freshness: "pd", // Past day
    });

    // Calculate score based on:
    // 1. Number of search results (popularity)
    // 2. Recency of results
    // 3. Title similarity

    let score = 0;

    // Base score from result count
    score += Math.min(results.length * 5, 100);

    // Bonus for title matches
    const titleLower = title.toLowerCase();
    const titleWords = titleLower.split(/\s+/).filter((w) => w.length > 3);

    for (const result of results) {
      const resultTitleLower = result.title.toLowerCase();

      // Check word overlap
      let matchCount = 0;
      for (const word of titleWords) {
        if (resultTitleLower.includes(word)) {
          matchCount++;
        }
      }

      const matchRatio = matchCount / titleWords.length;
      score += matchRatio * 20;

      // Bonus for recent results
      if (result.age && result.age.includes("hour")) {
        score += 10;
      } else if (result.age && result.age.includes("day")) {
        score += 5;
      }
    }

    console.log(`✅ Trend skoru: ${Math.round(score)}`);
    return score;
  } catch (error) {
    console.error("Trend skoru hesaplama hatası:", error);
    return 0; // Return 0 if trend analysis fails
  }
}

/**
 * Extract keywords from title and description
 */
function extractKeywords(title: string, description: string): string {
  // Combine title and description
  const text = `${title} ${description}`.toLowerCase();

  // Remove common words
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

  // Extract words
  const words = text
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 10); // Take first 10 keywords

  return words.join(" ");
}

/**
 * Analyze and rank articles by trend score
 */
export async function rankArticlesByTrend(
  articles: Array<{ title: string; description: string }>,
): Promise<Array<{ index: number; score: number }>> {
  console.log(`📊 ${articles.length} haber trend analizi yapılıyor...`);

  const scores = await Promise.all(
    articles.map(async (article, index) => {
      const score = await calculateTrendScore(
        article.title,
        article.description,
      );
      return { index, score };
    }),
  );

  // Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score);

  console.log("✅ Trend sıralaması tamamlandı");
  console.log(
    "Top 5:",
    scores
      .slice(0, 5)
      .map((s) => `#${s.index + 1} (skor: ${Math.round(s.score)})`)
      .join(", "),
  );

  return scores;
}

/**
 * Get trending AI news topics
 */
export async function getTrendingAITopics(): Promise<string[]> {
  try {
    console.log("🔥 Trend AI konuları araştırılıyor...");

    const trendingQueries = [
      "artificial intelligence news today",
      "AI breakthrough",
      "machine learning latest",
      "OpenAI news",
      "Google AI",
    ];

    const allTopics = new Set<string>();

    for (const query of trendingQueries) {
      const results = await braveSearch(query, {
        count: 5,
        freshness: "pd",
      });

      for (const result of results) {
        // Extract main topic from title
        const topic = result.title.split(/[-:|]/)[0].trim();
        if (topic.length > 10) {
          allTopics.add(topic);
        }
      }
    }

    const topics = Array.from(allTopics).slice(0, 10);
    console.log(`✅ ${topics.length} trend konu bulundu`);

    return topics;
  } catch (error) {
    console.error("Trend konular hatası:", error);
    return [];
  }
}

export default {
  braveSearch,
  calculateTrendScore,
  rankArticlesByTrend,
  getTrendingAITopics,
};
