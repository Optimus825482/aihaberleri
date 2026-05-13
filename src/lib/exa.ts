/**
 * Exa Search API Integration
 * AI-powered search for better content discovery
 */

import axios from "axios";
import {
  googleNewsSearch,
  type GoogleNewsSearchResult,
} from "@/lib/google-news-search";

const EXA_API_URL = "https://api.exa.ai/search";

export interface ExaSearchResult {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score: number;
  text?: string;
}

export interface ExaSearchResponse {
  results: ExaSearchResult[];
  autopromptString?: string;
}

function mapGoogleNewsResult(result: GoogleNewsSearchResult): ExaSearchResult {
  return {
    title: result.title,
    url: result.url,
    publishedDate: result.publishedDate,
    score: result.score,
    text: result.content,
  };
}

async function googleNewsFallbackSearch(
  query: string,
  options: { num_results?: number } = {},
): Promise<ExaSearchResult[]> {
  try {
    const results = await googleNewsSearch(query, {
      count: options.num_results || 10,
      time_range: "week",
      categories: "general,news",
    });

    return results.map(mapGoogleNewsResult);
  } catch (error) {
    console.warn("⚠️ Google News RSS fallback failed", error);
    return [];
  }
}

/**
 * Search using Exa API
 */
export async function exaSearch(
  query: string,
  options: {
    num_results?: number;
    use_autoprompt?: boolean;
    type?: "neural" | "keyword";
  } = {},
): Promise<ExaSearchResult[]> {
  if (!process.env.EXA_API_KEY) {
    console.warn("⚠️ EXA_API_KEY missing, falling back to Google News RSS");
    return googleNewsFallbackSearch(query, options);
  }

  try {
    const response = await axios.post<ExaSearchResponse>(
      EXA_API_URL,
      {
        query,
        numResults: options.num_results || 10,
        useAutoprompt: options.use_autoprompt !== false,
        type: options.type || "neural",
        contents: {
          text: true,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.EXA_API_KEY,
        },
        timeout: 10000,
      },
    );

    const results = response.data.results || [];
    if (results.length === 0) {
      console.warn("⚠️ Exa returned no results, falling back to Google News RSS");
      return googleNewsFallbackSearch(query, options);
    }

    return results;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Exa Search API Error:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    console.warn("⚠️ Exa failed, falling back to Google News RSS");
    return googleNewsFallbackSearch(query, options);
  }
}

/**
 * Calculate trend score using Exa
 */
export async function calculateTrendScoreExa(
  title: string,
  description: string,
): Promise<number> {
  try {
    const searchQuery = `${title} ${description}`;
    const results = await exaSearch(searchQuery, {
      num_results: 10,
      type: "neural",
    });

    let score = 0;

    // Base score from result count
    score += Math.min(results.length * 10, 100);

    // Score based on Exa's relevance scores
    for (const result of results) {
      score += result.score * 100; // Exa provides relevance score

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
      if (result.publishedDate) {
        const pubDate = new Date(result.publishedDate);
        const hoursSince = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);

        if (hoursSince < 24) {
          score += 20;
        } else if (hoursSince < 48) {
          score += 10;
        }
      }
    }

    return score;
  } catch (error) {
    console.error("Exa trend score error:", error);
    return 0;
  }
}

/**
 * Rank articles by trend using Exa
 */
export async function rankArticlesByTrendExa(
  articles: Array<{ title: string; description: string }>,
): Promise<Array<{ index: number; score: number }>> {
  console.log(`📊 Exa ile ${articles.length} haber analiz ediliyor...`);

  const scores = await Promise.all(
    articles.map(async (article, index) => {
      const score = await calculateTrendScoreExa(
        article.title,
        article.description,
      );
      return { index, score };
    }),
  );

  scores.sort((a, b) => b.score - a.score);

  console.log("✅ Exa trend sıralaması tamamlandı");
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
  exaSearch,
  calculateTrendScoreExa,
  rankArticlesByTrendExa,
};
