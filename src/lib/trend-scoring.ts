/**
 * Multi-Signal Trend Scoring System v2.0
 *
 * SearXNG'ye bağımlılığı kaldırıp çoklu sinyal tabanlı puanlama yapar.
 * Harici API çağrısı gerektirmez — hızlı ve güvenilir.
 *
 * SIGNALS:
 * 1. AI Relevance (0-30)  — AI keyword density & specificity
 * 2. Freshness (0-25)     — Publication recency
 * 3. Source Authority (0-20) — Source tier ranking
 * 4. Title Quality (0-15) — Specificity, action verbs, entities
 * 5. External Verification (0-10) — Optional SearXNG/web bonus
 *
 * TOTAL: 0-100
 */

import { createModuleLogger } from "@/lib/agent-log-stream";

const logger = createModuleLogger("trend");

// ============================================================================
// AI KEYWORD DICTIONARIES
// ============================================================================

/** Tier 1: Major AI companies & products — highest relevance */
const AI_ENTITIES_TIER1 = new Set([
  "openai",
  "chatgpt",
  "gpt-4",
  "gpt-5",
  "gpt-4o",
  "gpt-4.5",
  "anthropic",
  "claude",
  "claude 3",
  "claude 4",
  "google",
  "gemini",
  "deepmind",
  "bard",
  "meta",
  "llama",
  "llama 3",
  "microsoft",
  "copilot",
  "bing ai",
  "nvidia",
  "cuda",
  "tensorrt",
  "mistral",
  "mixtral",
  "xai",
  "grok",
  "cohere",
  "command r",
  "stability ai",
  "stable diffusion",
  "midjourney",
  "dall-e",
  "sora",
  "perplexity",
  "hugging face",
  "sam altman",
  "dario amodei",
  "demis hassabis",
  "yann lecun",
  "jensen huang",
  "satya nadella",
  "sundar pichai",
  "mark zuckerberg",
]);

/** Tier 2: AI technical terms — medium relevance */
const AI_TERMS_TIER2 = new Set([
  "artificial intelligence",
  "machine learning",
  "deep learning",
  "large language model",
  "llm",
  "transformer",
  "neural network",
  "generative ai",
  "gen ai",
  "foundation model",
  "natural language processing",
  "nlp",
  "computer vision",
  "reinforcement learning",
  "rlhf",
  "fine-tuning",
  "fine tuning",
  "multimodal",
  "multi-modal",
  "reasoning",
  "chain of thought",
  "agentic",
  "ai agent",
  "ai agents",
  "autonomous agent",
  "rag",
  "retrieval augmented",
  "vector database",
  "embedding",
  "diffusion model",
  "text-to-image",
  "text-to-video",
  "speech recognition",
  "text-to-speech",
  "voice ai",
  "robotics",
  "self-driving",
  "autonomous vehicle",
  "ai safety",
  "alignment",
  "ai regulation",
  "ai governance",
  "ai chip",
  "ai hardware",
  "tpu",
  "gpu cluster",
  "inference",
  "training",
  "pre-training",
  "post-training",
  "benchmark",
  "leaderboard",
  "evaluation",
  "open source ai",
  "open-source ai",
  "ai model",
  "prompt engineering",
  "prompt",
  "context window",
  "ai startup",
  "ai funding",
  "ai investment",
]);

/** Tier 3: Generic AI-adjacent terms — low relevance */
const AI_TERMS_TIER3 = new Set([
  "automation",
  "chatbot",
  "virtual assistant",
  "smart",
  "algorithm",
  "data science",
  "analytics",
  "prediction",
  "cloud computing",
  "api",
  "saas",
  "platform",
  "tech",
  "technology",
  "digital",
  "innovation",
  "startup",
  "funding",
  "venture capital",
]);

/** Action verbs that indicate newsworthy events */
const ACTION_VERBS = new Set([
  "launches",
  "launch",
  "launched",
  "releasing",
  "releases",
  "released",
  "announces",
  "announced",
  "unveils",
  "unveiled",
  "introduces",
  "introduced",
  "acquires",
  "acquired",
  "raises",
  "raised",
  "secures",
  "secured",
  "partners",
  "partnered",
  "expands",
  "expanded",
  "bans",
  "banned",
  "sues",
  "sued",
  "fines",
  "fined",
  "surpasses",
  "surpassed",
  "beats",
  "outperforms",
  "open-sources",
  "open sources",
  "opensources",
  "duyurdu",
  "açıkladı",
  "tanıttı",
  "yayınladı",
  "geliştirdi",
  "satın aldı",
  "yatırım aldı",
  "ortaklık kurdu",
]);

// ============================================================================
// SOURCE AUTHORITY TIERS
// ============================================================================

/** Tier 1: Premium tech/AI news sources */
const SOURCE_TIER1 = new Set([
  "techcrunch",
  "theverge",
  "arstechnica",
  "wired",
  "thenextweb",
  "venturebeat",
  "mit technology review",
  "reuters",
  "bloomberg",
  "nytimes",
  "washingtonpost",
  "bbc",
  "theguardian",
  "cnbc",
  "wsj",
  "nature",
  "science",
  "arxiv",
]);

/** Tier 2: Good tech/AI sources */
const SOURCE_TIER2 = new Set([
  "engadget",
  "zdnet",
  "cnet",
  "tomshardware",
  "9to5google",
  "9to5mac",
  "macrumors",
  "siliconangle",
  "infoworld",
  "computerworld",
  "analyticsinsight",
  "unite.ai",
  "aimagazine",
  "huggingface",
  "towardsdatascience",
  "hackernews",
  "ycombinator",
]);

/** Tier 3: Community/blog sources */
const SOURCE_TIER3 = new Set([
  "reddit",
  "medium",
  "substack",
  "dev.to",
  "twitter",
  "x.com",
  "youtube",
  "github",
  "producthunt",
]);

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

export interface TrendScoreBreakdown {
  aiRelevance: number;
  freshness: number;
  sourceAuthority: number;
  titleQuality: number;
  externalVerification: number;
  total: number;
}

/**
 * Signal 1: AI Relevance Score (0-30)
 * Measures how relevant the article is to AI/ML topics
 */
function calculateAIRelevance(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;

  // Tier 1 entity matches (highest value)
  let tier1Matches = 0;
  for (const entity of AI_ENTITIES_TIER1) {
    if (text.includes(entity)) {
      tier1Matches++;
    }
  }
  score += Math.min(15, tier1Matches * 5); // Max 15 from tier 1

  // Tier 2 technical term matches
  let tier2Matches = 0;
  for (const term of AI_TERMS_TIER2) {
    if (text.includes(term)) {
      tier2Matches++;
    }
  }
  score += Math.min(10, tier2Matches * 3); // Max 10 from tier 2

  // Tier 3 generic term matches (small bonus)
  let tier3Matches = 0;
  for (const term of AI_TERMS_TIER3) {
    if (text.includes(term)) {
      tier3Matches++;
    }
  }
  score += Math.min(5, tier3Matches * 1); // Max 5 from tier 3

  return Math.min(30, score);
}

/**
 * Signal 2: Freshness Score (0-25)
 * More recent articles get higher scores
 */
function calculateFreshness(publishedAt?: Date | string | null): number {
  if (!publishedAt) return 10; // Default for unknown dates

  const pubDate =
    typeof publishedAt === "string" ? new Date(publishedAt) : publishedAt;
  const ageMs = Date.now() - pubDate.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);

  if (ageHours < 1) return 25; // < 1 hour
  if (ageHours < 3) return 22; // 1-3 hours
  if (ageHours < 6) return 20; // 3-6 hours
  if (ageHours < 12) return 17; // 6-12 hours
  if (ageHours < 24) return 14; // 12-24 hours
  if (ageHours < 48) return 10; // 24-48 hours
  if (ageHours < 72) return 7; // 48-72 hours
  return 3; // > 72 hours
}

/**
 * Signal 3: Source Authority Score (0-20)
 * Higher-tier sources get higher scores
 */
function calculateSourceAuthority(source?: string, url?: string): number {
  if (!source && !url) return 8; // Default for unknown sources

  const sourceText = (source || "").toLowerCase();
  const urlText = (url || "").toLowerCase();
  const combined = `${sourceText} ${urlText}`;

  // Extract domain from URL
  let domain = "";
  try {
    if (url) {
      domain = new URL(url).hostname
        .replace("www.", "")
        .replace(".com", "")
        .replace(".org", "")
        .replace(".net", "");
    }
  } catch {
    /* ignore */
  }

  // Check tiers
  for (const t1 of SOURCE_TIER1) {
    if (combined.includes(t1) || domain.includes(t1)) return 20;
  }
  for (const t2 of SOURCE_TIER2) {
    if (combined.includes(t2) || domain.includes(t2)) return 15;
  }
  for (const t3 of SOURCE_TIER3) {
    if (combined.includes(t3) || domain.includes(t3)) return 10;
  }

  return 8; // Unknown but valid source
}

/**
 * Signal 4: Title Quality Score (0-15)
 * Measures how newsworthy and specific the title is
 */
function calculateTitleQuality(title: string): number {
  const titleLower = title.toLowerCase();
  let score = 0;

  // Contains specific numbers/stats (+4)
  if (
    /\d+[\.\,]?\d*\s*(%|billion|million|thousand|milyar|milyon|bin)/i.test(
      title,
    )
  ) {
    score += 4;
  } else if (/\$\d|€\d|\d+x|\d+%/i.test(title)) {
    score += 3;
  }

  // Contains action verbs (+4)
  const words = titleLower.split(/\s+/);
  const hasActionVerb = words.some((w) => ACTION_VERBS.has(w));
  if (hasActionVerb) score += 4;

  // Contains named entities (company/product names) (+4)
  const hasEntity = Array.from(AI_ENTITIES_TIER1).some((e) =>
    titleLower.includes(e),
  );
  if (hasEntity) score += 4;

  // Title length quality (+3)
  // Good titles are 6-15 words
  const wordCount = words.length;
  if (wordCount >= 6 && wordCount <= 15) {
    score += 3;
  } else if (wordCount >= 4 && wordCount <= 20) {
    score += 1;
  }

  // Penalize clickbait patterns (-3)
  const clickbaitPatterns = [
    /you won't believe/i,
    /shocking/i,
    /mind-blowing/i,
    /this is why/i,
    /here's why/i,
    /the truth about/i,
    /\?\?\?/,
    /!!!/,
    /🔥🔥🔥/,
  ];
  if (clickbaitPatterns.some((p) => p.test(title))) {
    score = Math.max(0, score - 3);
  }

  // Penalize non-Latin titles (Korean, Chinese, etc.) — harder to verify
  if (/[\u3000-\u9FFF\uAC00-\uD7AF]/.test(title)) {
    // Still valid but slightly lower quality for our Turkish audience
    score = Math.max(0, score - 2);
  }

  return Math.min(15, score);
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Calculate multi-signal trend score for an article
 * Returns 0-100 score with breakdown
 *
 * NO external API calls — fast and reliable
 */
export function calculateTrendScore(article: {
  title: string;
  description?: string;
  publishedAt?: Date | string | null;
  source?: string;
  url?: string;
}): TrendScoreBreakdown {
  const aiRelevance = calculateAIRelevance(
    article.title,
    article.description || "",
  );
  const freshness = calculateFreshness(article.publishedAt);
  const sourceAuthority = calculateSourceAuthority(article.source, article.url);
  const titleQuality = calculateTitleQuality(article.title);

  const total = aiRelevance + freshness + sourceAuthority + titleQuality;

  return {
    aiRelevance,
    freshness,
    sourceAuthority,
    titleQuality,
    externalVerification: 0, // Will be added by optional SearXNG check
    total: Math.min(100, total),
  };
}

/**
 * Batch score articles and return sorted rankings
 * Replaces rankArticlesByTrendHybrid — no external API calls needed
 */
export function rankArticlesByTrendScore(
  articles: Array<{
    title: string;
    description: string;
    publishedAt?: Date | string | null;
    source?: string;
    url?: string;
  }>,
): Array<{ index: number; score: number; breakdown: TrendScoreBreakdown }> {
  const startTime = Date.now();

  const rankings = articles.map((article, index) => {
    const breakdown = calculateTrendScore(article);
    return { index, score: breakdown.total, breakdown };
  });

  // Sort by score descending
  rankings.sort((a, b) => b.score - a.score);

  const duration = Date.now() - startTime;

  logger.info(
    `Trend scoring: ${articles.length} articles scored in ${duration}ms`,
  );

  // Log top 5
  const top5 = rankings.slice(0, 5);
  for (const r of top5) {
    const art = articles[r.index];
    logger.debug(
      `  #${r.index + 1} [${r.score}] AI:${r.breakdown.aiRelevance} F:${r.breakdown.freshness} S:${r.breakdown.sourceAuthority} T:${r.breakdown.titleQuality} — ${art.title.substring(0, 60)}`,
    );
  }

  return rankings;
}

// ============================================================================
// OPTIONAL: SearXNG Verification Bonus
// ============================================================================

/**
 * Optional SearXNG verification — adds 0-10 bonus points
 * Only called for top N articles to save API calls
 * Uses improved query construction
 */
export async function addSearXNGVerificationBonus(
  articles: Array<{ title: string; description: string }>,
  rankings: Array<{
    index: number;
    score: number;
    breakdown: TrendScoreBreakdown;
  }>,
  topN: number = 10,
): Promise<
  Array<{ index: number; score: number; breakdown: TrendScoreBreakdown }>
> {
  // Only verify top N articles
  const topRankings = rankings.slice(0, topN);
  const restRankings = rankings.slice(topN);

  try {
    const { searxngSearch } = await import("@/lib/searxng");

    const verifiedRankings = await Promise.all(
      topRankings.map(async (ranking) => {
        const article = articles[ranking.index];

        try {
          // Build a better search query
          const query = buildSmartQuery(article.title);
          if (!query) return ranking; // Skip if no good query

          const results = await searxngSearch(query, {
            count: 5,
            time_range: "week", // Week instead of day — much better coverage
            categories: "general", // General instead of news — more results
          });

          // Calculate verification bonus (0-10)
          let bonus = 0;
          if (results.length >= 5) bonus = 10;
          else if (results.length >= 3) bonus = 7;
          else if (results.length >= 1) bonus = 4;

          return {
            ...ranking,
            score: Math.min(100, ranking.score + bonus),
            breakdown: {
              ...ranking.breakdown,
              externalVerification: bonus,
              total: Math.min(100, ranking.breakdown.total + bonus),
            },
          };
        } catch {
          // SearXNG failed — no penalty, just skip bonus
          return ranking;
        }
      }),
    );

    // Re-sort after adding bonuses
    const allRankings = [...verifiedRankings, ...restRankings];
    allRankings.sort((a, b) => b.score - a.score);

    return allRankings;
  } catch {
    // SearXNG module not available — return original rankings
    logger.warn("SearXNG verification skipped (module unavailable)");
    return rankings;
  }
}

/**
 * Build a smart search query from article title
 * Fixes the broken query construction that caused 0 results
 */
function buildSmartQuery(title: string): string | null {
  // Remove non-Latin characters (Korean, Chinese, Arabic, etc.)
  const latinOnly = title.replace(/[^\x00-\x7F]/g, " ").trim();
  if (latinOnly.length < 10) return null; // Too short after cleanup

  // Remove special characters but keep hyphens
  const cleaned = latinOnly
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Extract meaningful words (>3 chars, not stopwords)
  const stopwords = new Set([
    "the",
    "and",
    "for",
    "are",
    "but",
    "not",
    "you",
    "all",
    "can",
    "had",
    "her",
    "was",
    "one",
    "our",
    "out",
    "has",
    "his",
    "how",
    "its",
    "may",
    "new",
    "now",
    "old",
    "see",
    "way",
    "who",
    "did",
    "get",
    "let",
    "say",
    "she",
    "too",
    "use",
    "with",
    "from",
    "have",
    "will",
    "been",
    "more",
    "their",
    "than",
    "when",
    "what",
    "which",
    "about",
    "into",
    "some",
    "could",
    "them",
    "other",
    "only",
    "also",
    "just",
    "over",
    "such",
    "very",
    "even",
    "most",
    "says",
    "said",
    "that",
    "this",
    "these",
    "those",
    "here",
    "there",
    "where",
  ]);

  const words = cleaned
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopwords.has(w.toLowerCase()));

  if (words.length === 0) return null;

  // Take top 3-4 most meaningful words
  // Prioritize: AI entities > capitalized words > long words
  const prioritized = words.sort((a, b) => {
    const aIsEntity = AI_ENTITIES_TIER1.has(a.toLowerCase()) ? 1 : 0;
    const bIsEntity = AI_ENTITIES_TIER1.has(b.toLowerCase()) ? 1 : 0;
    if (aIsEntity !== bIsEntity) return bIsEntity - aIsEntity;

    const aIsCap = a[0] === a[0].toUpperCase() ? 1 : 0;
    const bIsCap = b[0] === b[0].toUpperCase() ? 1 : 0;
    if (aIsCap !== bIsCap) return bIsCap - aIsCap;

    return b.length - a.length;
  });

  return prioritized.slice(0, 4).join(" ");
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  calculateTrendScore,
  rankArticlesByTrendScore,
  addSearXNGVerificationBonus,
};
