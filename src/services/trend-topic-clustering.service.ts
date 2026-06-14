/**
 * Trend Topic Clustering Service
 *
 * Cross-platform trend'leri LLM ile analiz ederek:
 * 1. Her trend'den kanonik konu (canonical topic) çıkarır
 * 2. Aynı konudaki trend'leri platformlar arası gruplar
 * 3. Grup puanlarının ortalamasını alarak popüler konuları belirler
 *
 * PRIMARY LLM: NVIDIA NIM (Qwen3-80b)
 * FALLBACK: DeepSeek
 */

import { callDeepSeek } from "@/lib/deepseek";
import { createModuleLogger } from "@/lib/agent-log-stream";

const logger = createModuleLogger("TopicClustering");

// ============================================================================
// TYPES
// ============================================================================

export interface TrendInput {
  index: number;
  platform: string;
  topic: string;
  score: number;
  volume: number;
  url?: string;
}

export interface TopicCluster {
  canonicalTopic: string;
  trends: TrendInput[];
  avgScore: number;
  maxScore: number;
  platformCount: number;
  platforms: string[];
  totalVolume: number;
}

export interface ClusteringResult {
  clusters: TopicCluster[];
  unclustered: TrendInput[];
  timestamp: Date;
  trendCount: number;
  clusterCount: number;
  durationMs: number;
}

// ============================================================================
// IN-MEMORY CACHE — Son clustering sonucu
// ============================================================================

let lastClusteringResult: ClusteringResult | null = null;

/**
 * Son clustering sonucunu getir (API'ler için)
 */
export function getLastClusteringResult(): ClusteringResult | null {
  return lastClusteringResult;
}

// ============================================================================
// LLM TOPIC EXTRACTION
// ============================================================================

/**
 * LLM ile trend başlıklarından kanonik konu çıkar ve grupla
 * Tek bir API çağrısı ile toplu işlem yapar (maliyet optimize)
 */
async function extractTopicsWithLLM(
  trends: TrendInput[],
): Promise<Map<number, string>> {
  if (trends.length === 0) return new Map();

  // Trend listesini prompt formatına dönüştür
  const trendLines = trends
    .map((t) => `[${t.index}] ${t.platform}: "${t.topic}"`)
    .join("\n");

  const systemPrompt = `Sen bir trend analisti ve konu sınıflandırma uzmanısın. Verilen trend başlıklarından kanonik konuları çıkar.

KURALLAR:
1. Her trend'e TEK BİR kanonik konu ata
2. Kanonik konu 2-5 kelime, İngilizce olmalı
3. Aynı olay/konuyu tartışan trend'ler AYNI kanonik konuyu paylaşmalı
4. Spesifik ol: "OpenAI GPT-5" > "AI Models" > "AI"
5. Hashtag'leri (#ai, #machinelearning) gerçek konulara dönüştür
6. Türkçe başlıkları İngilizce konuya çevir
7. Bilimsel paper başlıklarını ana konularına sadeleştir

YANIT FORMATI — SADECE geçerli JSON döndür, başka hiçbir şey yazma:
{
  "assignments": [
    {"index": 0, "topic": "LLM Code Generation"},
    {"index": 1, "topic": "LLM Code Generation"},
    {"index": 2, "topic": "OpenAI GPT-5"}
  ]
}`;

  const userPrompt = `Aşağıdaki ${trends.length} trend başlığını analiz et ve her birine kanonik konu ata:\n\n${trendLines}`;

  try {
    const response = await callDeepSeek(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      {
        temperature: 0.2, // Düşük sıcaklık = tutarlı sonuçlar
        maxTokens: 4000, // 2000→4000: JSON kesilmesini önle (98 trend, 30 assignment)
      },
    );

    // JSON parse — markdown code bloklarını temizle, çoklu format dene
    const parsed = extractJsonFromLlmResponse(response);
    if (!parsed) {
      logger.warn("LLM yanıtında JSON bulunamadı, fallback kullanılıyor");
      return fallbackTopicExtraction(trends);
    }

    const assignments = parsed.assignments || parsed.clusters || [];
    const topicMap = new Map<number, string>();
    for (const a of assignments) {
      if (typeof a.index === "number" && typeof a.topic === "string") {
        topicMap.set(a.index, a.topic.trim());
      }
    }

    // LLM'in atamadığı trend'ler için fallback
    for (const t of trends) {
      if (!topicMap.has(t.index)) {
        topicMap.set(t.index, fallbackSingleTopic(t.topic));
      }
    }

    logger.info(
      `✅ LLM topic extraction: ${topicMap.size}/${trends.length} assigned`,
    );
    return topicMap;
  } catch (error) {
    logger.error(
      `❌ LLM topic extraction failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return fallbackTopicExtraction(trends);
  }
}

/**
 * LLM yanıtından JSON çıkarmak için çoklu strateji dener.
 * En kritik özellik: kesik JSON'ları bracket sayaciyla kapatabilir.
 *
 * Stratejiler (sırayla):
 * 1. ```json ... ``` markdown code block
 * 2. Kapsamli JSON temizle + bracket dengesiyle kapat
 * 3. Array formati [...]
 * 4. Tüm yaniti direkt dene
 * 5. Hiçbiri olmazsa debug log
 */
function extractJsonFromLlmResponse(
  response: string,
): Record<string, any> | null {
  if (!response || !response.trim()) return null;

  // ── Helper: JSON parse dene ──
  function tryParse(raw: string): Record<string, any> | null {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    } catch { /* ignore */ }
    return null;
  }

  // ── Helper: temizle (control chars, BOM, zero-width) ──
  function clean(raw: string): string {
    return raw
      .replace(/^\uFEFF/, "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[\x00-\x1F\x7F]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ── Helper: eksik kapanislari ekleyerek JSON'i duzelt ──
  function closeJson(raw: string): string {
    let fixed = raw;
    // Sondaki virgul/ tire/ bosluk/ newline temizle
    fixed = fixed.replace(/[,\s\-]+$/, '');
    // Açılıp kapanmamış parantezleri say
    const openBraces = (fixed.match(/\{/g) || []).length;
    const closeBraces = (fixed.match(/\}/g) || []).length;
    const openBrackets = (fixed.match(/\[/g) || []).length;
    const closeBrackets = (fixed.match(/\]/g) || []).length;
    // Eksik kapanislari ekle: önce array kapat, sonra obj kapat
    for (let i = 0; i < openBrackets - closeBrackets; i++) fixed += ']';
    for (let i = 0; i < openBraces - closeBraces; i++) fixed += '}';
    return fixed;
  }

  // ── Helper: tum JSON parse stratejilerini dene ──
  function tryParseAll(raw: string): Record<string, any> | null {
    return tryParse(clean(raw))
      || tryParse(clean(closeJson(raw)))
      || null;
  }

  const trimmed = response.trim();

  // 1. Markdown code block
  const mdMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (mdMatch) {
    const r = tryParseAll(mdMatch[1]);
    if (r) return r;
  }

  // 2. <think> tag'lerini temizle, ana JSON bloklarini dene
  const noThink = trimmed.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  // JSON baslangici ara — { ile baslayan veya [ ile baslayan
  const jsonStart = noThink.search(/[{[]/);
  if (jsonStart >= 0) {
    const jsonPart = noThink.slice(jsonStart);
    const r = tryParseAll(jsonPart);
    if (r) return r;
  }

  // 3. Array formatini dene — bazı modeller direkt dizi dondurur
  const arrMatch = noThink.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    const arrClean = clean(closeJson(arrMatch[0]));
    try {
      const arr = JSON.parse(arrClean);
      if (Array.isArray(arr) && arr.length > 0) {
        return { assignments: arr };
      }
    } catch { /* ignore */ }
  }

  // 4. Tüm yaniti dene
  const r = tryParseAll(trimmed);
  if (r) return r;

  // 5. Hicbiri calismadi — DEBUG
  logger.warn(
    `🔍 RAW LLM RESPONSE (first 500 chars): ${clean(trimmed).substring(0, 500)}`,
  );

  return null;
}

// ============================================================================
// FALLBACK TOPIC EXTRACTION (Rule-based)
// ============================================================================

const ENTITY_PATTERNS: Array<{ pattern: RegExp; topic: string }> = [
  { pattern: /openai|gpt-?[45o]|chatgpt|sam altman|dall-?e/i, topic: "OpenAI" },
  { pattern: /google|gemini|deepmind|bard/i, topic: "Google AI" },
  { pattern: /anthropic|claude/i, topic: "Anthropic Claude" },
  { pattern: /meta ai|llama|zuckerberg/i, topic: "Meta AI" },
  {
    pattern: /microsoft|copilot|satya nadella|azure ai/i,
    topic: "Microsoft AI",
  },
  { pattern: /nvidia|jensen huang|cuda|tensorrt/i, topic: "NVIDIA" },
  { pattern: /apple|apple intelligence|siri/i, topic: "Apple AI" },
  { pattern: /tesla|elon musk|xai|grok/i, topic: "xAI Grok" },
  { pattern: /deepseek/i, topic: "DeepSeek" },
  { pattern: /mistral/i, topic: "Mistral AI" },
  { pattern: /hugging\s?face/i, topic: "Hugging Face" },
  { pattern: /stable\s?diffusion|stability\s?ai/i, topic: "Stability AI" },
  { pattern: /midjourney/i, topic: "Midjourney" },
  { pattern: /perplexity/i, topic: "Perplexity AI" },
  // Konu bazlı pattern'ler
  { pattern: /autonomous|self-?driving|otonom/i, topic: "Autonomous Systems" },
  { pattern: /robot(?:ic|ik|s)?/i, topic: "Robotics" },
  { pattern: /quantum|kuantum/i, topic: "Quantum Computing" },
  {
    pattern: /regulation|düzenleme|etik|ethics|safety|güvenlik/i,
    topic: "AI Safety & Ethics",
  },
  { pattern: /embedding|vector|rag|retrieval/i, topic: "RAG & Embeddings" },
  { pattern: /agent(?:ic|s)?|ajan/i, topic: "AI Agents" },
  { pattern: /vision|görsel|image|görüntü/i, topic: "Computer Vision" },
  { pattern: /speech|voice|ses|tts|stt/i, topic: "Voice AI" },
  { pattern: /video|sora/i, topic: "Video AI" },
  { pattern: /coding|code|programlama|developer/i, topic: "AI Coding" },
  { pattern: /chip|semiconductor|gpu|tpu/i, topic: "AI Hardware" },
  { pattern: /open\s?source|açık\s?kaynak/i, topic: "Open Source AI" },
  { pattern: /fine-?tun|finetun|eğitim|training/i, topic: "Model Training" },
  { pattern: /healthcare|sağlık|medical|tıp/i, topic: "AI Healthcare" },
  {
    pattern: /invest|yatırım|fund|fonlama|acquisition/i,
    topic: "AI Investment",
  },
];

function fallbackSingleTopic(title: string): string {
  const lower = title.toLowerCase();

  // Entity-based detection
  const matched: string[] = [];
  for (const { pattern, topic } of ENTITY_PATTERNS) {
    if (pattern.test(lower)) {
      matched.push(topic);
    }
  }

  if (matched.length >= 2) {
    return matched.slice(0, 2).sort().join(" + ");
  }
  if (matched.length === 1) {
    return matched[0];
  }

  // Hashtag temizle
  if (title.startsWith("#")) {
    const clean = title
      .replace(/^#+/, "")
      .replace(/([A-Z])/g, " $1")
      .trim();
    return clean.substring(0, 30);
  }

  // İlk 3-4 anlamlı kelime
  const words = title
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 4);

  return words.join(" ") || "General AI";
}

function fallbackTopicExtraction(trends: TrendInput[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const t of trends) {
    map.set(t.index, fallbackSingleTopic(t.topic));
  }
  return map;
}

// ============================================================================
// CLUSTERING ENGINE
// ============================================================================

/**
 * Trend'leri kanonik konulara göre grupla ve puan ortalaması hesapla
 */
function buildClusters(
  trends: TrendInput[],
  topicMap: Map<number, string>,
): { clusters: TopicCluster[]; unclustered: TrendInput[] } {
  const groups = new Map<string, TrendInput[]>();

  for (const t of trends) {
    const topic = topicMap.get(t.index) || "Unknown";
    const group = groups.get(topic) || [];
    group.push(t);
    groups.set(topic, group);
  }

  const clusters: TopicCluster[] = [];
  const unclustered: TrendInput[] = [];

  for (const [canonicalTopic, trendGroup] of groups) {
    if (trendGroup.length === 1) {
      // Tek trend'li gruplar: unclustered olarak işaretle
      unclustered.push(trendGroup[0]);
      continue;
    }

    const scores = trendGroup.map((t) => t.score);
    const platforms = [...new Set(trendGroup.map((t) => t.platform))];

    // Multi-platform bonus: Birden fazla platformda görünmek önemli
    const platformBonus = Math.min(20, (platforms.length - 1) * 10);
    const avgScore =
      Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) +
      platformBonus;

    clusters.push({
      canonicalTopic,
      trends: trendGroup,
      avgScore: Math.min(100, avgScore),
      maxScore: Math.max(...scores),
      platformCount: platforms.length,
      platforms,
      totalVolume: trendGroup.reduce((sum, t) => sum + t.volume, 0),
    });
  }

  // En yüksek puandan düşüğe sırala
  clusters.sort((a, b) => b.avgScore - a.avgScore);

  return { clusters, unclustered };
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Trend'leri topla, LLM ile konu çıkar, grupla ve puanla
 *
 * @param trends - Global score'u hesaplanmış, filtrelenmiş trend'ler
 * @param maxTrends - LLM'e gönderilecek maksimum trend sayısı (maliyet kontrolü)
 * @returns ClusteringResult
 */
export async function clusterTrendTopics(
  trends: Array<{
    platform: string;
    topic: string;
    score: number;
    volume: number;
    url?: string;
  }>,
  maxTrends: number = 30,
): Promise<ClusteringResult> {
  const startTime = Date.now();
  logger.info(`🔬 Topic clustering başlatılıyor (${trends.length} trend)...`);

  // Top N trend'i al (zaten score'a göre sıralı)
  const topTrends: TrendInput[] = trends.slice(0, maxTrends).map((t, i) => ({
    index: i,
    platform: t.platform,
    topic: t.topic,
    score: t.score,
    volume: t.volume,
    url: t.url,
  }));

  // LLM ile konu çıkar
  const topicMap = await extractTopicsWithLLM(topTrends);

  // Grupla ve puanla
  const { clusters, unclustered } = buildClusters(topTrends, topicMap);

  const result: ClusteringResult = {
    clusters,
    unclustered,
    timestamp: new Date(),
    trendCount: topTrends.length,
    clusterCount: clusters.length,
    durationMs: Date.now() - startTime,
  };

  // Cache'e kaydet
  lastClusteringResult = result;

  logger.success(
    `✅ Topic clustering tamamlandı: ${clusters.length} cluster, ` +
      `${unclustered.length} unclustered, ` +
      `top topic: "${clusters[0]?.canonicalTopic || "N/A"}" (score: ${clusters[0]?.avgScore || 0}) ` +
      `(${result.durationMs}ms)`,
  );

  return result;
}

/**
 * Popüler konuları getir (en yüksek puanlı cluster'lar)
 */
export function getPopularTopics(
  minScore: number = 30,
  limit: number = 10,
): TopicCluster[] {
  if (!lastClusteringResult) return [];

  return lastClusteringResult.clusters
    .filter((c) => c.avgScore >= minScore)
    .slice(0, limit);
}

/**
 * Belirli bir konuyu ara (haber üretme entegrasyonu için)
 */
export function findTopicCluster(query: string): TopicCluster | undefined {
  if (!lastClusteringResult) return undefined;

  const lowerQuery = query.toLowerCase();
  return lastClusteringResult.clusters.find(
    (c) =>
      c.canonicalTopic.toLowerCase().includes(lowerQuery) ||
      c.trends.some((t) => t.topic.toLowerCase().includes(lowerQuery)),
  );
}

export default {
  clusterTrendTopics,
  getPopularTopics,
  getLastClusteringResult,
  findTopicCluster,
};
