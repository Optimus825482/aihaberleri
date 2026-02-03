/**
 * Hybrid Search Manager
 * Intelligently combines Brave Search and Tavily API to avoid rate limits
 *
 * STRATEGY:
 * 1. Round-robin: Alternate between Brave and Tavily
 * 2. Fallback: If one fails (429), switch to the other
 * 3. Load balancing: Track usage and distribute requests
 * 4. Smart recovery: Retry failed provider after cooldown
 *
 * RATE LIMITS:
 * - Brave: 1 req/sec (free tier) or 20 req/sec (paid)
 * - Tavily: 5 req/sec (standard)
 */

import {
  braveSearch,
  calculateTrendScoreBrave,
  BraveSearchResult,
} from "./brave";
import {
  tavilySearch,
  calculateTrendScoreTavily,
  TavilySearchResult,
} from "./tavily";

// ============================================
// PROVIDER STATE MANAGEMENT
// ============================================

type SearchProvider = "brave" | "tavily";

interface ProviderState {
  available: boolean;
  lastError: Date | null;
  errorCount: number;
  requestCount: number;
  lastRequest: Date | null;
}

const providerStates: Record<SearchProvider, ProviderState> = {
  brave: {
    available: true,
    lastError: null,
    errorCount: 0,
    requestCount: 0,
    lastRequest: null,
  },
  tavily: {
    available: true,
    lastError: null,
    errorCount: 0,
    requestCount: 0,
    lastRequest: null,
  },
};

// Cooldown period after rate limit (5 minutes)
const RATE_LIMIT_COOLDOWN = 5 * 60 * 1000;

// Max consecutive errors before marking provider unavailable
const MAX_CONSECUTIVE_ERRORS = 3;

// Round-robin counter
let currentProviderIndex = 0;
const providers: SearchProvider[] = ["brave", "tavily"];

/**
 * Get next provider using round-robin
 */
function getNextProvider(): SearchProvider {
  // Try round-robin first
  for (let i = 0; i < providers.length; i++) {
    const provider = providers[(currentProviderIndex + i) % providers.length];
    const state = providerStates[provider];

    // Check if provider is available
    if (state.available) {
      // Check if cooldown period has passed
      if (state.lastError) {
        const timeSinceError = Date.now() - state.lastError.getTime();
        if (timeSinceError < RATE_LIMIT_COOLDOWN) {
          console.log(
            `⏳ ${provider} cooldown aktif (${Math.round((RATE_LIMIT_COOLDOWN - timeSinceError) / 1000)}s kaldı)`,
          );
          continue;
        } else {
          // Cooldown expired, reset error state
          state.available = true;
          state.lastError = null;
          state.errorCount = 0;
          console.log(
            `✅ ${provider} cooldown sona erdi, tekrar kullanılabilir`,
          );
        }
      }

      // Update round-robin counter
      currentProviderIndex = (currentProviderIndex + 1) % providers.length;
      return provider;
    }
  }

  // If all providers unavailable, use the one with oldest error
  const oldestErrorProvider = providers.reduce((oldest, current) => {
    const oldestState = providerStates[oldest];
    const currentState = providerStates[current];

    if (!oldestState.lastError) return current;
    if (!currentState.lastError) return oldest;

    return oldestState.lastError < currentState.lastError ? oldest : current;
  });

  console.warn(
    `⚠️ Tüm provider'lar unavailable, ${oldestErrorProvider} zorla kullanılıyor`,
  );
  return oldestErrorProvider;
}

/**
 * Mark provider as failed (rate limited or error)
 */
function markProviderFailed(provider: SearchProvider, isRateLimit: boolean) {
  const state = providerStates[provider];

  state.errorCount++;
  state.lastError = new Date();

  if (isRateLimit) {
    console.warn(
      `🚫 ${provider} rate limit! ${RATE_LIMIT_COOLDOWN / 1000}s cooldown başlatıldı`,
    );
    state.available = false;
  } else if (state.errorCount >= MAX_CONSECUTIVE_ERRORS) {
    console.warn(
      `🚫 ${provider} ${MAX_CONSECUTIVE_ERRORS} ardışık hata! Geçici olarak devre dışı`,
    );
    state.available = false;
  }
}

/**
 * Mark provider as successful
 */
function markProviderSuccess(provider: SearchProvider) {
  const state = providerStates[provider];

  state.errorCount = 0;
  state.requestCount++;
  state.lastRequest = new Date();
  state.available = true;
}

/**
 * Get provider statistics
 */
export function getProviderStats() {
  return {
    brave: {
      available: providerStates.brave.available,
      requests: providerStates.brave.requestCount,
      errors: providerStates.brave.errorCount,
      lastError: providerStates.brave.lastError,
    },
    tavily: {
      available: providerStates.tavily.available,
      requests: providerStates.tavily.requestCount,
      errors: providerStates.tavily.errorCount,
      lastError: providerStates.tavily.lastError,
    },
  };
}

// ============================================
// UNIFIED SEARCH INTERFACE
// ============================================

export interface HybridSearchResult {
  title: string;
  url: string;
  description: string;
  provider: SearchProvider;
  score?: number;
}

/**
 * Hybrid search with automatic fallback
 */
export async function hybridSearch(
  query: string,
  options: {
    count?: number;
    freshness?: string;
    preferredProvider?: SearchProvider;
  } = {},
): Promise<HybridSearchResult[]> {
  const maxRetries = 2; // Try both providers if needed
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const provider =
      attempt === 0 && options.preferredProvider
        ? options.preferredProvider
        : getNextProvider();

    console.log(
      `🔍 Hybrid search attempt ${attempt + 1}/${maxRetries} using ${provider}`,
    );

    try {
      let results: HybridSearchResult[];

      if (provider === "brave") {
        const braveResults = await braveSearch(query, {
          count: options.count || 10,
          freshness: options.freshness,
        });

        results = braveResults.map((r) => ({
          title: r.title,
          url: r.url,
          description: r.description || "",
          provider: "brave" as const,
        }));
      } else {
        const tavilyResults = await tavilySearch(query, {
          max_results: options.count || 10,
        });

        results = tavilyResults.map((r) => ({
          title: r.title,
          url: r.url,
          description: r.content,
          provider: "tavily" as const,
          score: r.score,
        }));
      }

      markProviderSuccess(provider);
      console.log(`✅ ${provider} başarılı: ${results.length} sonuç`);

      return results;
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429)
      const isRateLimit =
        error.response?.status === 429 ||
        error.message?.includes("rate limit") ||
        error.message?.includes("429");

      if (isRateLimit) {
        console.error(`🚫 ${provider} rate limit (429)!`);
        markProviderFailed(provider, true);
      } else {
        console.error(`❌ ${provider} error:`, error.message);
        markProviderFailed(provider, false);
      }

      // If this was the last attempt, throw error
      if (attempt === maxRetries - 1) {
        throw new Error(
          `Tüm search provider'lar başarısız: ${lastError?.message}`,
        );
      }

      // Otherwise, try next provider
      console.log(`🔄 Fallback: Diğer provider deneniyor...`);
    }
  }

  throw lastError || new Error("Hybrid search failed");
}

/**
 * Calculate trend score with hybrid approach
 */
export async function calculateTrendScoreHybrid(
  title: string,
  description: string,
): Promise<number> {
  const maxRetries = 2;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const provider = getNextProvider();

    try {
      let score: number;

      if (provider === "brave") {
        score = await calculateTrendScoreBrave(title, description);
      } else {
        score = await calculateTrendScoreTavily(title, description);
      }

      markProviderSuccess(provider);
      return score;
    } catch (error: any) {
      lastError = error;

      const isRateLimit =
        error.response?.status === 429 ||
        error.message?.includes("rate limit") ||
        error.message?.includes("429");

      markProviderFailed(provider, isRateLimit);

      if (attempt === maxRetries - 1) {
        console.warn(
          `⚠️ Trend score hesaplanamadı (${title.substring(0, 40)}...), varsayılan: 0`,
        );
        return 0; // Return 0 instead of throwing
      }
    }
  }

  return 0;
}

/**
 * Rank articles by trend using hybrid approach
 */
export async function rankArticlesByTrendHybrid(
  articles: Array<{ title: string; description: string }>,
): Promise<Array<{ index: number; score: number }>> {
  // ============================================
  // STEP 1: SMART SAMPLING
  // ============================================
  const MAX_ARTICLES = 100;
  const originalCount = articles.length;

  if (articles.length > MAX_ARTICLES) {
    console.log(
      `⚡ Smart Sampling: ${articles.length} haber → ${MAX_ARTICLES} habere düşürülüyor`,
    );
    articles = articles.slice(0, MAX_ARTICLES);
  }

  console.log(`📊 Hybrid ile ${articles.length} haber analiz ediliyor...`);

  // ============================================
  // STEP 2: BATCH PROCESSING WITH HYBRID PROVIDERS
  // ============================================
  const BATCH_SIZE = 10;
  const BATCH_DELAY = 500; // 500ms between batches

  const scores: Array<{ index: number; score: number }> = [];

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(articles.length / BATCH_SIZE);

    console.log(
      `📦 Batch ${batchNumber}/${totalBatches} işleniyor (${batch.length} haber)...`,
    );

    // Process batch with hybrid scoring
    const batchScores = await Promise.all(
      batch.map(async (article, batchIndex) => {
        const globalIndex = i + batchIndex;

        try {
          const score = await calculateTrendScoreHybrid(
            article.title,
            article.description,
          );
          return { index: globalIndex, score };
        } catch (error: any) {
          console.warn(
            `⚠️ Haber #${globalIndex + 1} analiz edilemedi, varsayılan skor: 0`,
          );
          return { index: globalIndex, score: 0 };
        }
      }),
    );

    scores.push(...batchScores);

    // Delay between batches
    if (i + BATCH_SIZE < articles.length) {
      console.log(`⏳ ${BATCH_DELAY}ms bekleniyor...`);
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  // ============================================
  // STEP 3: SORT BY SCORE
  // ============================================
  scores.sort((a, b) => b.score - a.score);

  console.log("✅ Hybrid trend sıralaması tamamlandı");
  console.log(`📊 İşlenen: ${articles.length}/${originalCount} haber`);
  console.log(
    "🏆 Top 5:",
    scores
      .slice(0, 5)
      .map((s) => `#${s.index + 1} (skor: ${Math.round(s.score)})`)
      .join(", "),
  );

  // Log provider statistics
  const stats = getProviderStats();
  console.log("📈 Provider İstatistikleri:");
  console.log(
    `   Brave: ${stats.brave.requests} istek, ${stats.brave.errors} hata, ${stats.brave.available ? "✅ aktif" : "🚫 devre dışı"}`,
  );
  console.log(
    `   Tavily: ${stats.tavily.requests} istek, ${stats.tavily.errors} hata, ${stats.tavily.available ? "✅ aktif" : "🚫 devre dışı"}`,
  );

  return scores;
}

export default {
  hybridSearch,
  calculateTrendScoreHybrid,
  rankArticlesByTrendHybrid,
  getProviderStats,
};
