import {
  googleNewsSearch,
  calculateTrendScoreGoogleNews,
  getGoogleNewsStats,
  getSharedGoogleNewsStats,
  resetGoogleNewsStats,
  type GoogleNewsSearchResult,
} from "@/lib/google-news-search";

export type SearXNGResult = GoogleNewsSearchResult;

export async function searxngSearch(
  query: string,
  options: {
    count?: number;
    language?: string;
    time_range?: string;
    safesearch?: 0 | 1 | 2;
    categories?: string;
  } = {},
): Promise<SearXNGResult[]> {
  return googleNewsSearch(query, options);
}

export async function calculateTrendScoreSearXNG(
  title: string,
  description: string,
): Promise<number> {
  return calculateTrendScoreGoogleNews(title, description);
}

export function getWhoogleStats() {
  return getGoogleNewsStats();
}

export function resetWhoogleStats(): void {
  resetGoogleNewsStats();
}

export async function getSharedWhoogleStats() {
  return getSharedGoogleNewsStats();
}
