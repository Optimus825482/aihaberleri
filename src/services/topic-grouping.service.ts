/**
 * Topic Grouping Service — Konu Bazlı Haber Önceliklendirme
 *
 * Pipeline öncesinde RSS + YouTube haberlerini konularına göre gruplar
 * ve cross-platform trend cluster'larıyla eşleştirerek hibrit skor hesaplar.
 *
 * HİBRİT SKOR:
 *   finalScore = (trendScore * 0.4) + (clusterPopularity * 0.3)
 *              + (sourceCount * 0.2) + (recency * 0.1)
 *
 * Bu sayede popüler konular TEK KRİTER değil, birden fazla sinyalin
 * ağırlıklı ortalaması ile önceliklendirilir.
 */

import { distance } from "fastest-levenshtein";
import { createModuleLogger } from "@/lib/agent-log-stream";
import type { NewsArticle } from "./news.service";
import {
  getPopularTopics,
  type TopicCluster,
} from "./trend-topic-clustering.service";

const logger = createModuleLogger("TopicGrouping");

// ============================================================================
// TYPES
// ============================================================================

export interface GroupedArticle extends NewsArticle {
  /** Hibrit skor (0-100) — pipeline sıralaması buna göre yapılır */
  hybridScore: number;
  /** Hangi konu grubundan geldiği */
  groupTopic: string;
  /** Eşleşen trend cluster (varsa) */
  matchedCluster?: string;
  /** Grup içindeki kaynak sayısı */
  groupSourceCount: number;
  /** Skor bileşenleri (debug/log) */
  scoreBreakdown: {
    trendComponent: number;
    clusterComponent: number;
    sourceComponent: number;
    recencyComponent: number;
  };
}

interface ArticleGroup {
  topic: string;
  articles: NewsArticle[];
  bestArticle: NewsArticle;
  avgTrendScore: number;
  maxTrendScore: number;
  sourceCount: number;
  matchedCluster?: TopicCluster;
  clusterScore: number;
}

// ============================================================================
// AĞIRLIKLAR — Admin panelden ayarlanabilir hale getirilebilir
// ============================================================================

const WEIGHTS = {
  trendScore: 0.4, // RSS trend skorunun ağırlığı
  clusterPopularity: 0.3, // Cross-platform cluster eşleşme ağırlığı
  sourceCount: 0.2, // Aynı konuda kaç kaynak var
  recency: 0.1, // Güncellik (ne kadar yeni)
} as const;

// ============================================================================
// STRING SIMILARITY (haber → topic matching için)
// ============================================================================

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\sçğıöşüâîûÇĞİÖŞÜ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * İki metin arasında keyword overlap skoru (0-1)
 * Levenshtein yerine token-based: haber başlıkları genelde farklı sırada olabilir
 */
function keywordOverlap(text1: string, text2: string): number {
  const words1 = new Set(
    normalizeText(text1)
      .split(" ")
      .filter((w) => w.length > 2),
  );
  const words2 = new Set(
    normalizeText(text2)
      .split(" ")
      .filter((w) => w.length > 2),
  );

  if (words1.size === 0 || words2.size === 0) return 0;

  let overlap = 0;
  for (const w of words1) {
    if (words2.has(w)) overlap++;
  }

  // Jaccard
  const union = new Set([...words1, ...words2]);
  return overlap / union.size;
}

/**
 * Haber başlığı ile cluster kanonik konusu arasında fuzzy eşleşme
 */
function matchArticleToCluster(
  article: NewsArticle,
  cluster: TopicCluster,
): number {
  const articleText = normalizeText(
    `${article.title} ${article.description || ""}`,
  );
  const clusterTopic = normalizeText(cluster.canonicalTopic);

  // 1. Direkt kelime içerme kontrolü
  const topicWords = clusterTopic.split(" ").filter((w) => w.length > 2);
  const directMatchCount = topicWords.filter((w) =>
    articleText.includes(w),
  ).length;
  const directMatchRatio =
    topicWords.length > 0 ? directMatchCount / topicWords.length : 0;

  // 2. Cluster'daki trend başlıklarıyla karşılaştır
  let bestTrendMatch = 0;
  for (const trend of cluster.trends) {
    const trendSim = keywordOverlap(article.title, trend.topic);
    if (trendSim > bestTrendMatch) bestTrendMatch = trendSim;
  }

  // 3. Levenshtein bazlı benzerlik (kısa canonical topic'ler için)
  const truncatedArticle = articleText.substring(0, 80);
  const compareMaxLen = Math.max(truncatedArticle.length, clusterTopic.length);
  const levenshteinSim =
    compareMaxLen > 0
      ? 1 - distance(truncatedArticle, clusterTopic) / compareMaxLen
      : 0;

  // Minimum 1 kelime doğrudan eşleşmeli — yoksa false positive riski çok yüksek
  if (directMatchCount === 0 && bestTrendMatch < 0.15) {
    return 0;
  }

  // Ağırlıklı toplam
  const score =
    directMatchRatio * 0.5 + bestTrendMatch * 0.35 + levenshteinSim * 0.15;

  return Math.min(1, score);
}

// ============================================================================
// HABER GRUPLAMA
// ============================================================================

// Entity pattern'leri — haber başlıklarından hızlı konu çıkarma
const QUICK_TOPIC_PATTERNS: Array<{ pattern: RegExp; topic: string }> = [
  { pattern: /openai|gpt-?[45o]|chatgpt|dall-?e/i, topic: "OpenAI" },
  { pattern: /google|gemini|deepmind|bard/i, topic: "Google AI" },
  { pattern: /anthropic|claude/i, topic: "Anthropic" },
  { pattern: /meta\s?ai|llama|zuckerberg/i, topic: "Meta AI" },
  { pattern: /microsoft|copilot|azure\s?ai/i, topic: "Microsoft AI" },
  { pattern: /nvidia|jensen|cuda|tensorrt/i, topic: "NVIDIA" },
  { pattern: /apple|siri|apple\s?intelligence/i, topic: "Apple AI" },
  { pattern: /tesla|elon\s?musk|xai|grok/i, topic: "xAI" },
  { pattern: /deepseek/i, topic: "DeepSeek" },
  { pattern: /mistral/i, topic: "Mistral AI" },
  { pattern: /hugging\s?face/i, topic: "Hugging Face" },
  { pattern: /stable\s?diffusion|stability/i, topic: "Stability AI" },
  { pattern: /midjourney/i, topic: "Midjourney" },
  { pattern: /perplexity/i, topic: "Perplexity" },
  { pattern: /amazon|aws|bedrock/i, topic: "Amazon AI" },
  { pattern: /robot(?:ic|ik|s)/i, topic: "Robotics" },
  { pattern: /quantum|kuantum/i, topic: "Quantum" },
  { pattern: /autonomous|self.?driv|otonom/i, topic: "Autonomous" },
  { pattern: /regulat|düzenleme|eu\s?ai\s?act/i, topic: "AI Regulation" },
  { pattern: /agent(?:ic|s)|ajan/i, topic: "AI Agents" },
  { pattern: /video|sora|runway/i, topic: "Video AI" },
  { pattern: /speech|voice|ses|tts/i, topic: "Voice AI" },
];

/**
 * Haber başlığından hızlı konu çıkar (LLM kullanmadan)
 */
function extractQuickTopic(article: NewsArticle): string {
  const text = `${article.title} ${article.description || ""}`;

  // Bilinen entity'leri kontrol et
  const matched: string[] = [];
  for (const { pattern, topic } of QUICK_TOPIC_PATTERNS) {
    if (pattern.test(text)) {
      matched.push(topic);
    }
  }

  if (matched.length > 0) {
    // İlk 2 match'i birleştir (örn: "OpenAI + AI Agents")
    return matched.slice(0, 2).join(" + ");
  }

  // RSS'ten gelen topic varsa kullan
  if (article.topic) {
    return article.topic;
  }

  // Fallback: başlıktan ilk 3-4 anlamlı kelime
  const words = normalizeText(article.title)
    .split(" ")
    .filter((w) => w.length > 3)
    .slice(0, 3);

  return words.join(" ") || "General AI";
}

/**
 * Haberleri konularına göre grupla
 */
function groupArticlesByTopic(
  articles: NewsArticle[],
): Map<string, NewsArticle[]> {
  const groups = new Map<string, NewsArticle[]>();

  for (const article of articles) {
    const topic = extractQuickTopic(article);

    // Mevcut gruplarla benzerlik kontrol et (yakın konuları birleştir)
    let mergedInto: string | null = null;
    for (const [existingTopic] of groups) {
      const sim = keywordOverlap(topic, existingTopic);
      if (sim > 0.4) {
        mergedInto = existingTopic;
        break;
      }
    }

    const targetTopic = mergedInto || topic;
    const group = groups.get(targetTopic) || [];
    group.push(article);
    groups.set(targetTopic, group);
  }

  return groups;
}

// ============================================================================
// HİBRİT SKOR HESAPLAMA
// ============================================================================

/**
 * Recency score: son 6 saat = 100, 6-12 saat = 75, 12-24 saat = 50, 24-48 saat = 25, >48 saat = 10
 */
function calculateRecencyScore(article: NewsArticle): number {
  if (!article.publishedDate) return 50; // tarih yoksa orta değer

  const hoursAgo =
    (Date.now() - new Date(article.publishedDate).getTime()) / (1000 * 60 * 60);

  if (hoursAgo <= 6) return 100;
  if (hoursAgo <= 12) return 75;
  if (hoursAgo <= 24) return 50;
  if (hoursAgo <= 48) return 25;
  return 10;
}

/**
 * Source count score: kaç farklı kaynak aynı konuyu kapsamış
 * 1 kaynak = 20, 2 = 50, 3 = 70, 4 = 85, 5+ = 100
 */
function calculateSourceCountScore(count: number): number {
  const tiers = [0, 20, 50, 70, 85, 100];
  return tiers[Math.min(count, 5)] || 100;
}

/**
 * Hibrit skor hesapla
 */
function calculateHybridScore(
  article: NewsArticle,
  group: ArticleGroup,
): { score: number; breakdown: GroupedArticle["scoreBreakdown"] } {
  // 1. Trend Score component (0-100)
  const trendComponent = article.trendScore || 0;

  // 2. Cluster Popularity component (0-100)
  const clusterComponent = group.clusterScore;

  // 3. Source Count component (0-100)
  const sourceComponent = calculateSourceCountScore(group.sourceCount);

  // 4. Recency component (0-100)
  const recencyComponent = calculateRecencyScore(article);

  // Ağırlıklı toplam
  const score = Math.round(
    trendComponent * WEIGHTS.trendScore +
      clusterComponent * WEIGHTS.clusterPopularity +
      sourceComponent * WEIGHTS.sourceCount +
      recencyComponent * WEIGHTS.recency,
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: {
      trendComponent: Math.round(trendComponent * WEIGHTS.trendScore),
      clusterComponent: Math.round(
        clusterComponent * WEIGHTS.clusterPopularity,
      ),
      sourceComponent: Math.round(sourceComponent * WEIGHTS.sourceCount),
      recencyComponent: Math.round(recencyComponent * WEIGHTS.recency),
    },
  };
}

// ============================================================================
// ANA FONKSİYON
// ============================================================================

export interface TopicGroupingResult {
  /** Hibrit skora göre sıralanmış haberler (en önemli → en az önemli) */
  rankedArticles: GroupedArticle[];
  /** Konu grupları özeti */
  groupSummary: Array<{
    topic: string;
    articleCount: number;
    matchedCluster: string | null;
    avgHybridScore: number;
  }>;
  /** İstatistikler */
  stats: {
    totalArticles: number;
    totalGroups: number;
    clusteredGroups: number;
    unclusteredGroups: number;
    topTopic: string;
    topScore: number;
    durationMs: number;
  };
}

/**
 * Haberleri konularına göre grupla, trend cluster'larıyla eşleştir,
 * hibrit skor hesapla ve sıralı liste döndür.
 *
 * Bu fonksiyon pipeline öncesinde çağrılır:
 *   fetchAINews() → groupAndRankByTopic() → startMultiAgentPipeline()
 */
export async function groupAndRankByTopic(
  articles: NewsArticle[],
): Promise<TopicGroupingResult> {
  const startTime = Date.now();
  logger.info(`📊 Konu gruplandırma başlatılıyor: ${articles.length} haber`);

  if (articles.length === 0) {
    return {
      rankedArticles: [],
      groupSummary: [],
      stats: {
        totalArticles: 0,
        totalGroups: 0,
        clusteredGroups: 0,
        unclusteredGroups: 0,
        topTopic: "N/A",
        topScore: 0,
        durationMs: 0,
      },
    };
  }

  // ── Adım 1: Haberleri konularına göre grupla ──────────────────────
  const topicGroups = groupArticlesByTopic(articles);
  logger.info(`  ${topicGroups.size} konu grubu oluşturuldu`);

  // ── Adım 2: Popüler trend cluster'larını al ──────────────────────
  const popularClusters = getPopularTopics(20, 20); // minScore=20, limit=20
  logger.info(`  ${popularClusters.length} popüler trend cluster mevcut`);

  // ── Adım 3: Her konu grubunu cluster'larla eşleştir ──────────────
  const articleGroups: ArticleGroup[] = [];

  for (const [topic, groupArticles] of topicGroups) {
    // En yüksek trend skorlu haberi "temsilci" olarak seç
    const sorted = [...groupArticles].sort(
      (a, b) => (b.trendScore || 0) - (a.trendScore || 0),
    );
    const bestArticle = sorted[0];

    // Trend cluster eşleştirme
    let bestCluster: TopicCluster | undefined;
    let bestClusterScore = 0;

    for (const cluster of popularClusters) {
      const matchScore = matchArticleToCluster(bestArticle, cluster);
      if (matchScore > bestClusterScore && matchScore >= 0.40) {
        bestClusterScore = matchScore;
        bestCluster = cluster;
      }
    }

    // Cluster skoru: eşleşme skoru × cluster'ın avgScore'u
    const clusterScore = bestCluster
      ? Math.round(bestClusterScore * bestCluster.avgScore)
      : 0;

    const scores = groupArticles.map((a) => a.trendScore || 0);

    articleGroups.push({
      topic,
      articles: groupArticles,
      bestArticle,
      avgTrendScore: Math.round(
        scores.reduce((sum, s) => sum + s, 0) / scores.length,
      ),
      maxTrendScore: Math.max(...scores),
      sourceCount: groupArticles.length,
      matchedCluster: bestCluster,
      clusterScore,
    });
  }

  // ── Adım 4: Her grup için en iyi habere hibrit skor ata ──────────
  const rankedArticles: GroupedArticle[] = [];

  for (const group of articleGroups) {
    // Gruptaki her habere skor ver (ama sonra sadece en iyisini seçeceğiz)
    const { score, breakdown } = calculateHybridScore(group.bestArticle, group);

    rankedArticles.push({
      ...group.bestArticle,
      topic: group.topic, // Pipeline'ın kullandığı alan — gruptan gelen konu
      hybridScore: score,
      groupTopic: group.topic,
      matchedCluster: group.matchedCluster?.canonicalTopic,
      groupSourceCount: group.sourceCount,
      scoreBreakdown: breakdown,
    });

    // Eğer grupta 2+ kaynak varsa, ikinci en iyi haberi de ekle (ama daha düşük skorla)
    if (group.articles.length >= 3 && group.articles[1]) {
      const secondBest = group.articles.find((a) => a !== group.bestArticle);
      if (secondBest) {
        const { score: score2, breakdown: breakdown2 } = calculateHybridScore(
          secondBest,
          group,
        );
        rankedArticles.push({
          ...secondBest,
          topic: group.topic,
          hybridScore: Math.round(score2 * 0.8), // %20 penalty (çeşitlilik için)
          groupTopic: group.topic,
          matchedCluster: group.matchedCluster?.canonicalTopic,
          groupSourceCount: group.sourceCount,
          scoreBreakdown: breakdown2,
        });
      }
    }
  }

  // ── Adım 5: Hibrit skora göre sırala ─────────────────────────────
  rankedArticles.sort((a, b) => b.hybridScore - a.hybridScore);

  // ── Özet oluştur ─────────────────────────────────────────────────
  const groupSummary = articleGroups
    .map((g) => ({
      topic: g.topic,
      articleCount: g.articles.length,
      matchedCluster: g.matchedCluster?.canonicalTopic || null,
      avgHybridScore: Math.round(
        rankedArticles
          .filter((a) => a.groupTopic === g.topic)
          .reduce((sum, a) => sum + a.hybridScore, 0) /
          rankedArticles.filter((a) => a.groupTopic === g.topic).length || 0,
      ),
    }))
    .sort((a, b) => b.avgHybridScore - a.avgHybridScore);

  const clusteredGroups = articleGroups.filter((g) => g.matchedCluster).length;
  const durationMs = Date.now() - startTime;

  // ── Logla ─────────────────────────────────────────────────────────
  logger.success(
    `✅ Konu gruplandırma tamamlandı: ${articleGroups.length} grup, ` +
      `${clusteredGroups} trend eşleşmesi, ` +
      `top: "${rankedArticles[0]?.groupTopic || "N/A"}" ` +
      `(hibrit: ${rankedArticles[0]?.hybridScore || 0}) ` +
      `(${durationMs}ms)`,
  );

  // Top 5 grup detayları
  for (const g of groupSummary.slice(0, 5)) {
    const clusterInfo = g.matchedCluster ? ` ↔ 🔥 ${g.matchedCluster}` : "";
    logger.info(
      `  📌 ${g.topic} (${g.articleCount} kaynak, skor: ${g.avgHybridScore})${clusterInfo}`,
    );
  }

  const stats = {
    totalArticles: articles.length,
    totalGroups: articleGroups.length,
    clusteredGroups,
    unclusteredGroups: articleGroups.length - clusteredGroups,
    topTopic: rankedArticles[0]?.groupTopic || "N/A",
    topScore: rankedArticles[0]?.hybridScore || 0,
    durationMs,
  };

  return { rankedArticles, groupSummary, stats };
}

export default {
  groupAndRankByTopic,
};
