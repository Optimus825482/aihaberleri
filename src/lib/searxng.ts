/**
 * SearXNG Search Client
 * Self-hosted metasearch engine (unlimited, free)
 * https://docs.searxng.org/dev/search_api.html
 */

import axios from "axios";

const SEARXNG_BASE_URL =
  process.env.SEARXNG_BASE_URL ||
  "http://searxng-pwcsc8ow08oks0ggokwoo8ww.77.42.68.4.sslip.io";

export interface SearXNGResult {
  title: string;
  url: string;
  content: string;
  engine: string;
  parsed_url: string[];
  template: string;
  engines: string[];
  positions: number[];
  score: number;
  category: string;
}

export interface SearXNGResponse {
  query: string;
  number_of_results: number;
  results: SearXNGResult[];
  answers: string[];
  corrections: string[];
  infoboxes: any[];
  suggestions: string[];
  unresponsive_engines: string[];
}

/**
 * Search using SearXNG
 */
export async function searxngSearch(
  query: string,
  options: {
    count?: number;
    language?: string;
    time_range?: string; // day, week, month, year
    safesearch?: 0 | 1 | 2; // 0=off, 1=moderate, 2=strict
    categories?: string; // general, images, videos, news, etc.
  } = {},
): Promise<SearXNGResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      language: options.language || "en",
      safesearch: String(options.safesearch ?? 1),
    });

    if (options.time_range) {
      params.append("time_range", options.time_range);
    }

    if (options.categories) {
      params.append("categories", options.categories);
    }

    const response = await axios.get<SearXNGResponse>(
      `${SEARXNG_BASE_URL}/search`,
      {
        params,
        timeout: 10000,
        headers: {
          "User-Agent": "AIHaberleri-NewsBot/1.0",
        },
      },
    );

    const results = response.data.results || [];

    // Limit results
    const limitedResults = results.slice(0, options.count || 10);

    console.log(
      `✅ SearXNG: ${limitedResults.length} sonuç bulundu (toplam: ${results.length})`,
    );

    return limitedResults;
  } catch (error: any) {
    console.error("❌ SearXNG search error:", error.message);
    throw error;
  }
}

/**
 * Calculate trend score using SearXNG
 * Uses result count and position as indicators
 */
export async function calculateTrendScoreSearXNG(
  title: string,
  description: string,
): Promise<number> {
  try {
    // Search for exact title
    const titleResults = await searxngSearch(`"${title}"`, {
      count: 5,
      time_range: "week",
    });

    // Search for keywords
    const keywords = title
      .split(" ")
      .filter((w) => w.length > 4)
      .slice(0, 3)
      .join(" ");
    const keywordResults = await searxngSearch(keywords, {
      count: 10,
      time_range: "week",
    });

    // Calculate score based on:
    // 1. Number of exact matches (high weight)
    // 2. Number of keyword matches (medium weight)
    // 3. Average position (lower is better)

    const exactMatchScore = titleResults.length * 20;
    const keywordMatchScore = keywordResults.length * 5;

    // Average position score (inverse - lower position = higher score)
    const avgPosition =
      keywordResults.length > 0
        ? keywordResults.reduce((sum, r) => sum + (r.positions[0] || 10), 0) /
          keywordResults.length
        : 10;
    const positionScore = Math.max(0, 100 - avgPosition * 5);

    const totalScore = exactMatchScore + keywordMatchScore + positionScore;

    console.log(
      `📊 SearXNG trend score: ${Math.round(totalScore)} (exact: ${titleResults.length}, keyword: ${keywordResults.length}, pos: ${avgPosition.toFixed(1)})`,
    );

    return totalScore;
  } catch (error: any) {
    console.error("❌ SearXNG trend score error:", error.message);
    return 0;
  }
}

export default {
  searxngSearch,
  calculateTrendScoreSearXNG,
};
