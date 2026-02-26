/**
 * Trend Matcher Service
 *
 * RESPONSIBILITIES:
 * 1. Match articles to active trends using soft matching
 * 2. Calculate trend scores for articles
 * 3. Generate trending badges (TR: "Gündem", EN: "Trending")
 * 4. Extract hashtags for social media sharing
 *
 * MATCHING STRATEGY:
 * - Soft matching: keyword similarity >= 50%
 * - Uses Levenshtein distance for fuzzy matching
 * - Considers title, content, and article keywords
 */

import { db } from "@/lib/db";
import { createModuleLogger } from "@/lib/agent-log-stream";
import { getActiveTrends } from "./trend-fetcher.service";

const logger = createModuleLogger("TrendMatcher");

// ============================================================================
// CONFIGURATION
// ============================================================================

export const MATCH_CONFIG = {
  // Minimum similarity score for a match (0-1)
  minSimilarity: 0.5,

  // Minimum trend score to consider article as "trending"
  // Lowered from 50 to 38: articles typically score 44-50 and miss by a few points
  trendingThreshold: 38,

  // Maximum number of hashtags to extract
  maxHashtags: 5,

  // Weight factors for scoring
  weights: {
    titleMatch: 2.0, // Title matches are worth more
    contentMatch: 1.0, // Content matches
    keywordMatch: 1.5, // Existing keywords match
  },

  // Badge templates
  badges: {
    tr: "🔥 Gündem",
    en: "🔥 Trending",
  },
};

// ============================================================================
// TYPES
// ============================================================================

export interface ArticleForMatching {
  id: string;
  title: string;
  content: string;
  keywords: string[];
  language: string;
}

export interface TrendMatch {
  trendId: string;
  topic: string;
  hashtag: string | null;
  matchScore: number;
  matchType: "keyword" | "hashtag" | "entity";
  matchedKeywords: string[];
  trendScore: number;
  sentiment: string;
}

export interface TrendEnrichmentResult {
  trendScore: number;
  isTrending: boolean;
  matches: TrendMatch[];
}

// ============================================================================
// FUZZY MATCHING UTILITIES
// ============================================================================

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;

  // Create matrix
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  // Initialize
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between two strings (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 1.0;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;

  // Levenshtein-based similarity
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;

  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * Turkish text normalization (remove diacritics for matching)
 */
function normalizeTurkish(text: string): string {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^\w\s]/g, "");
}

/**
 * Extract words from text for matching
 */
function extractWords(text: string): string[] {
  const normalized = normalizeTurkish(text);
  return normalized
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .map((word) => word.toLowerCase());
}

// ============================================================================
// MATCHING LOGIC
// ============================================================================

/**
 * Find matching keywords between article and trend
 */
function findMatchingKeywords(
  articleWords: string[],
  trendKeywords: string[],
): { matched: string[]; score: number } {
  const matched: string[] = [];
  let totalScore = 0;

  for (const articleWord of articleWords) {
    for (const trendKeyword of trendKeywords) {
      const similarity = calculateSimilarity(articleWord, trendKeyword);

      if (similarity >= MATCH_CONFIG.minSimilarity) {
        matched.push(articleWord);
        totalScore += similarity;
        break; // Only count each article word once
      }
    }
  }

  return { matched: [...new Set(matched)], score: totalScore };
}

/**
 * Match a single article to all active trends
 */
export async function matchArticleToTrends(
  article: ArticleForMatching,
): Promise<TrendMatch[]> {
  const activeTrends = await getActiveTrends({
    language: article.language,
    limit: 100,
  });

  if (activeTrends.length === 0) {
    return [];
  }

  const matches: TrendMatch[] = [];

  // Extract words from article
  const titleWords = extractWords(article.title);
  const contentWords = extractWords(article.content).slice(0, 200); // Limit content words
  const keywordWords = article.keywords.map((k) => k.toLowerCase());

  for (const trend of activeTrends) {
    const trendKeywords = trend.keywords.map((k) => k.toLowerCase());
    const trendTopic = normalizeTurkish(trend.topic);

    // Check title matches (highest weight)
    const titleMatch = findMatchingKeywords(titleWords, trendKeywords);

    // Check content matches
    const contentMatch = findMatchingKeywords(contentWords, trendKeywords);

    // Check keyword matches
    const keywordMatch = findMatchingKeywords(keywordWords, trendKeywords);

    // Check if trend topic appears in title
    const topicInTitle = titleWords.some(
      (word) =>
        calculateSimilarity(word, trendTopic) >= MATCH_CONFIG.minSimilarity,
    );

    // Calculate weighted score
    const weightedScore =
      titleMatch.score * MATCH_CONFIG.weights.titleMatch +
      contentMatch.score * MATCH_CONFIG.weights.contentMatch +
      keywordMatch.score * MATCH_CONFIG.weights.keywordMatch +
      (topicInTitle ? 2.0 : 0);

    // Normalize to 0-1 range
    const normalizedScore = Math.min(1, weightedScore / 10);

    // Only include if score is above threshold
    if (normalizedScore >= MATCH_CONFIG.minSimilarity) {
      const allMatched = [
        ...titleMatch.matched,
        ...contentMatch.matched,
        ...keywordMatch.matched,
      ];

      matches.push({
        trendId: trend.id,
        topic: trend.topic,
        hashtag: trend.hashtag,
        matchScore: normalizedScore,
        matchType: topicInTitle
          ? "entity"
          : titleMatch.matched.length > 0
            ? "keyword"
            : "keyword",
        matchedKeywords: [...new Set(allMatched)],
        trendScore: trend.score,
        sentiment: trend.sentiment,
      });
    }
  }

  // Sort by match score descending
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

// ============================================================================
// TREND ENRICHMENT
// ============================================================================

/**
 * Calculate final trend score for an article
 */
function calculateTrendScore(matches: TrendMatch[]): number {
  if (matches.length === 0) return 0;

  // Weighted average of match scores * trend scores
  let totalWeight = 0;
  let weightedSum = 0;

  for (const match of matches.slice(0, 5)) {
    // Consider top 5 matches
    const weight = match.matchScore;
    weightedSum += match.trendScore * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  return Math.round(weightedSum / totalWeight);
}

/**
 * Generate hashtags from trend matches
 */
function generateHashtags(matches: TrendMatch[]): string[] {
  const hashtags: string[] = [];

  for (const match of matches) {
    if (match.hashtag && !hashtags.includes(match.hashtag)) {
      hashtags.push(match.hashtag);
    }

    // Also create hashtag from topic if no hashtag exists
    if (!match.hashtag) {
      const topicHashtag =
        "#" +
        match.topic
          .replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/gi, "")
          .replace(/\s+/g, "")
          .substring(0, 20);

      if (!hashtags.includes(topicHashtag)) {
        hashtags.push(topicHashtag);
      }
    }

    if (hashtags.length >= MATCH_CONFIG.maxHashtags) break;
  }

  return hashtags;
}

/**
 * Enrich an article with trend data
 */
export async function enrichArticleWithTrends(
  article: ArticleForMatching,
): Promise<TrendEnrichmentResult> {
  const matches = await matchArticleToTrends(article);

  if (matches.length === 0) {
    return {
      trendScore: 0,
      isTrending: false,
      matches: [],
    };
  }

  const trendScore = calculateTrendScore(matches);
  const isTrending = trendScore >= MATCH_CONFIG.trendingThreshold;

  return {
    trendScore,
    isTrending,
    matches,
  };
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

/**
 * Save trend matches to database
 */
export async function saveTrendMatches(
  articleId: string,
  matches: TrendMatch[],
): Promise<number> {
  if (matches.length === 0) return 0;

  const BATCH_SIZE = 25;
  let savedCount = 0;

  for (let i = 0; i < matches.length; i += BATCH_SIZE) {
    const batch = matches.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((match) =>
        db.trendArticleMatch.upsert({
          where: {
            articleId_trendId: {
              articleId,
              trendId: match.trendId,
            },
          },
          create: {
            articleId,
            trendId: match.trendId,
            matchScore: match.matchScore,
            matchType: match.matchType,
            matchedKeywords: match.matchedKeywords,
          },
          update: {
            matchScore: match.matchScore,
            matchType: match.matchType,
            matchedKeywords: match.matchedKeywords,
          },
        }),
      ),
    );

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        savedCount++;
      } else {
        const match = batch[index];
        logger.error(
          `Failed to save trend match: ${articleId} -> ${match.trendId}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`,
        );
      }
    }
  }

  return savedCount;
}

/**
 * Update article with trend data
 */
export async function updateArticleTrendData(
  articleId: string,
  enrichment: TrendEnrichmentResult,
): Promise<void> {
  await db.article.update({
    where: { id: articleId },
    data: {
      trendScore: enrichment.trendScore,
      isTrending: enrichment.isTrending,
    },
  });

  // Save matches to separate table
  if (enrichment.matches.length > 0) {
    await saveTrendMatches(articleId, enrichment.matches);
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Process multiple articles for trend enrichment
 */
export async function enrichArticlesBatch(
  articles: ArticleForMatching[],
): Promise<Map<string, TrendEnrichmentResult>> {
  const results = new Map<string, TrendEnrichmentResult>();

  for (const article of articles) {
    try {
      const enrichment = await enrichArticleWithTrends(article);
      results.set(article.id, enrichment);
    } catch (error) {
      logger.error(
        `Failed to enrich article: ${article.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      results.set(article.id, {
        trendScore: 0,
        isTrending: false,
        matches: [],
      });
    }
  }

  return results;
}

export default {
  matchArticleToTrends,
  enrichArticleWithTrends,
  updateArticleTrendData,
  enrichArticlesBatch,
  saveTrendMatches,
};
