/**
 * Multi-Signal Trend Scoring System v3.0
 *
 * 7 bağımsız sinyal ile trend puanlama — harici API bağımlılığı YOK.
 * SearXNG kaldırıldı (v2'de %85+ sorgu 0 sonuç dönüyordu).
 *
 * SIGNALS:
 * 1. AI Relevance (0-25)       — AI keyword density & specificity
 * 2. Freshness (0-20)          — Publication recency (smooth curve)
 * 3. Source Authority (0-15)   — Source tier + YouTube bonus
 * 4. Title Quality (0-15)      — Specificity, action verbs, entities
 * 5. Content Depth (0-10)      — Description quality & detail
 * 6. Topic Novelty (0-10)      — Breaking news, exclusivity, unique angle
 * 7. Engagement Potential (0-5) — Numbers, impact, controversy
 *
 * TOTAL: 0-100 (all local, zero external API calls)
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
  "deepseek",
  "qwen",
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
  "yapay zeka",
  "makine öğrenmesi",
  "derin öğrenme",
  "büyük dil modeli",
  "doğal dil işleme",
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

/** Breaking news / novelty indicators */
const NOVELTY_INDICATORS = new Set([
  "breaking",
  "exclusive",
  "first",
  "just in",
  "just announced",
  "world first",
  "first ever",
  "never before",
  "unprecedented",
  "leaked",
  "rumor",
  "confirmed",
  "official",
  "son dakika",
  "ilk kez",
  "dünyada ilk",
  "resmi",
  "sızdırıldı",
  "doğrulandı",
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
  contentDepth: number;
  topicNovelty: number;
  engagementPotential: number;
  total: number;
}

/**
 * Signal 1: AI Relevance Score (0-25)
 * Measures how relevant the article is to AI/ML topics
 */
function calculateAIRelevance(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;

  // Tier 1 entity matches (highest value)
  let tier1Matches = 0;
  for (const entity of AI_ENTITIES_TIER1) {
    if (text.includes(entity)) tier1Matches++;
  }
  score += Math.min(12, tier1Matches * 4); // Max 12 from tier 1

  // Tier 2 technical term matches
  let tier2Matches = 0;
  for (const term of AI_TERMS_TIER2) {
    if (text.includes(term)) tier2Matches++;
  }
  score += Math.min(9, tier2Matches * 3); // Max 9 from tier 2

  // Tier 3 generic term matches (small bonus)
  let tier3Matches = 0;
  for (const term of AI_TERMS_TIER3) {
    if (text.includes(term)) tier3Matches++;
  }
  score += Math.min(4, tier3Matches * 1); // Max 4 from tier 3

  return Math.min(25, score);
}

/**
 * Signal 2: Freshness Score (0-20)
 * Smooth exponential decay — more recent = higher score
 */
function calculateFreshness(publishedAt?: Date | string | null): number {
  if (!publishedAt) return 8; // Default for unknown dates

  const pubDate =
    typeof publishedAt === "string" ? new Date(publishedAt) : publishedAt;
  if (isNaN(pubDate.getTime())) return 8;

  const ageHours = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60);

  // Smooth exponential decay: score = 20 * e^(-ageHours/24)
  // < 1h: ~20, 6h: ~15, 12h: ~12, 24h: ~7, 48h: ~3, 72h: ~1
  const score = 20 * Math.exp(-ageHours / 24);
  return Math.round(Math.max(1, Math.min(20, score)));
}

/**
 * Signal 3: Source Authority Score (0-15)
 * Higher-tier sources get higher scores + YouTube bonus
 */
function calculateSourceAuthority(source?: string, url?: string): number {
  if (!source && !url) return 6; // Default for unknown sources

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

  // YouTube bonus — primary source for this platform
  if (combined.includes("youtube") || domain.includes("youtube")) {
    return 13; // High score — YouTube is our primary source
  }

  // Check tiers
  for (const t1 of SOURCE_TIER1) {
    if (combined.includes(t1) || domain.includes(t1)) return 15;
  }
  for (const t2 of SOURCE_TIER2) {
    if (combined.includes(t2) || domain.includes(t2)) return 11;
  }
  for (const t3 of SOURCE_TIER3) {
    if (combined.includes(t3) || domain.includes(t3)) return 8;
  }

  return 6; // Unknown but valid source
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

  // Penalize non-Latin titles (Korean, Chinese, etc.)
  if (/[\u3000-\u9FFF\uAC00-\uD7AF]/.test(title)) {
    score = Math.max(0, score - 2);
  }

  return Math.min(15, score);
}

/**
 * Signal 5: Content Depth Score (0-10)
 * Rewards articles with detailed, substantive descriptions
 */
function calculateContentDepth(description: string): number {
  if (!description) return 0;

  const text = description.trim();
  const wordCount = text.split(/\s+/).length;
  let score = 0;

  // Description length scoring
  if (wordCount >= 80)
    score += 4; // Very detailed
  else if (wordCount >= 40)
    score += 3; // Good detail
  else if (wordCount >= 20)
    score += 2; // Moderate
  else if (wordCount >= 10) score += 1; // Brief

  // Contains specific details (numbers, quotes, technical terms)
  if (/\d+/.test(text)) score += 1; // Has numbers
  if (/[""].*[""]/.test(text)) score += 1; // Has quotes
  if (/according to|said|announced|reported/i.test(text)) score += 1; // Attribution
  if (AI_TERMS_TIER2.size > 0) {
    let techTermCount = 0;
    const lower = text.toLowerCase();
    for (const term of AI_TERMS_TIER2) {
      if (lower.includes(term)) techTermCount++;
    }
    if (techTermCount >= 3)
      score += 2; // Rich in technical terms
    else if (techTermCount >= 1) score += 1; // Some technical terms
  }

  return Math.min(10, score);
}

/**
 * Signal 6: Topic Novelty Score (0-10)
 * Detects breaking news, exclusives, and unique angles
 */
function calculateTopicNovelty(title: string, description: string): number {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;

  // Breaking news / novelty indicators (+5)
  for (const indicator of NOVELTY_INDICATORS) {
    if (text.includes(indicator)) {
      score += 5;
      break; // Only count once
    }
  }

  // Version numbers suggest new release (+3)
  if (/v?\d+\.\d+(\.\d+)?/.test(title) || /version \d/i.test(title)) {
    score += 3;
  }

  // Specific date references suggest timely news (+2)
  if (/202[4-9]|today|yesterday|this week|bu hafta|bugün|dün/i.test(text)) {
    score += 2;
  }

  // Comparison/benchmark articles are valuable (+2)
  if (/vs\.?|versus|compared to|benchmark|karşılaştırma/i.test(text)) {
    score += 2;
  }

  // Research paper / study references (+2)
  if (/paper|study|research|araştırma|arxiv/i.test(text)) {
    score += 2;
  }

  return Math.min(10, score);
}

/**
 * Signal 7: Engagement Potential Score (0-5)
 * Predicts how engaging the article will be for readers
 */
function calculateEngagementPotential(
  title: string,
  description: string,
): number {
  const text = `${title} ${description}`.toLowerCase();
  let score = 0;

  // Large financial numbers (funding, valuation, revenue) (+2)
  if (/\$\d+\s*(b|m|billion|million)|milyar|milyon/i.test(text)) {
    score += 2;
  }

  // Controversy / regulation / ban (+2)
  if (
    /ban|lawsuit|sue|fine|controversy|regulation|restrict|yasakla|dava|ceza/i.test(
      text,
    )
  ) {
    score += 2;
  }

  // Competition / race (+1)
  if (/race|compete|rival|overtake|surpass|beat|geç|yarış/i.test(text)) {
    score += 1;
  }

  // Impact on jobs / society (+1)
  if (
    /job|employment|replace|automate|society|iş|istihdam|toplum/i.test(text)
  ) {
    score += 1;
  }

  // Open source release (+1)
  if (/open.?source|açık kaynak/i.test(text)) {
    score += 1;
  }

  return Math.min(5, score);
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Calculate multi-signal trend score for an article
 * Returns 0-100 score with full breakdown
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
  const desc = article.description || "";

  const aiRelevance = calculateAIRelevance(article.title, desc);
  const freshness = calculateFreshness(article.publishedAt);
  const sourceAuthority = calculateSourceAuthority(article.source, article.url);
  const titleQuality = calculateTitleQuality(article.title);
  const contentDepth = calculateContentDepth(desc);
  const topicNovelty = calculateTopicNovelty(article.title, desc);
  const engagementPotential = calculateEngagementPotential(article.title, desc);

  const total =
    aiRelevance +
    freshness +
    sourceAuthority +
    titleQuality +
    contentDepth +
    topicNovelty +
    engagementPotential;

  return {
    aiRelevance,
    freshness,
    sourceAuthority,
    titleQuality,
    contentDepth,
    topicNovelty,
    engagementPotential,
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
  logger.info(`Scored ${articles.length} articles in ${duration}ms`);

  // Log top 5 with compact breakdown
  const top5 = rankings.slice(0, 5);
  for (const r of top5) {
    const art = articles[r.index];
    const b = r.breakdown;
    logger.debug(
      `  [${r.score}] AI:${b.aiRelevance} F:${b.freshness} S:${b.sourceAuthority} T:${b.titleQuality} D:${b.contentDepth} N:${b.topicNovelty} E:${b.engagementPotential} — ${art.title.substring(0, 55)}`,
    );
  }

  return rankings;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  calculateTrendScore,
  rankArticlesByTrendScore,
};
