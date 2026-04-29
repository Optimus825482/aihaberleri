/**
 * Hybrid Search Manager
 * Google News RSS-first strategy
 */

import {
  googleNewsSearch,
  calculateTrendScoreGoogleNews,
} from "./google-news-search";

type SearchProvider = "google-news";

interface ProviderState {
  available: boolean;
  lastError: Date | null;
  errorCount: number;
  requestCount: number;
  lastRequest: Date | null;
}

const providerState: ProviderState = {
  available: true,
  lastError: null,
  errorCount: 0,
  requestCount: 0,
  lastRequest: null,
};

function markProviderFailed(): void {
  providerState.errorCount += 1;
  providerState.lastError = new Date();
  providerState.available = false;
}

function markProviderSuccess(): void {
  providerState.errorCount = 0;
  providerState.requestCount += 1;
  providerState.lastRequest = new Date();
  providerState.available = true;
}

export function getProviderStats() {
  return {
    brave: { available: false, requests: 0, errors: 0, lastError: null as Date | null },
    tavily: { available: false, requests: 0, errors: 0, lastError: null as Date | null },
    "google-news": {
      available: providerState.available,
      requests: providerState.requestCount,
      errors: providerState.errorCount,
      lastError: providerState.lastError,
    },
    googleNews: {
      available: providerState.available,
      requests: providerState.requestCount,
      errors: providerState.errorCount,
      lastError: providerState.lastError,
    },
  };
}

export interface HybridSearchResult {
  title: string;
  url: string;
  description: string;
  provider: SearchProvider;
  score?: number;
}

export async function hybridSearch(
  query: string,
  options: {
    count?: number;
    freshness?: string;
    preferredProvider?: SearchProvider;
  } = {},
): Promise<HybridSearchResult[]> {
  try {
    const results = await googleNewsSearch(query, {
      count: options.count || 10,
      time_range: options.freshness === "pw" ? "week" : undefined,
    });

    markProviderSuccess();

    return results.map((r) => ({
      title: r.title,
      url: r.url,
      description: r.content || "",
      provider: "google-news" as const,
      score: r.score,
    }));
  } catch (error) {
    markProviderFailed();
    throw error;
  }
}

export async function calculateTrendScoreHybrid(
  title: string,
  description: string,
): Promise<number> {
  try {
    const score = await calculateTrendScoreGoogleNews(title, description);
    markProviderSuccess();
    return score;
  } catch {
    markProviderFailed();
    return 0;
  }
}

export async function rankArticlesByTrendHybrid(
  articles: Array<{ title: string; description: string }>,
): Promise<Array<{ index: number; score: number }>> {
  const scores = await Promise.all(
    articles.map(async (article, index) => ({
      index,
      score: await calculateTrendScoreHybrid(article.title, article.description),
    })),
  );

  scores.sort((a, b) => b.score - a.score);
  return scores;
}

export default {
  hybridSearch,
  calculateTrendScoreHybrid,
  rankArticlesByTrendHybrid,
  getProviderStats,
};
