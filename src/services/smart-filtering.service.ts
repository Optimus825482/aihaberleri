/**
 * Smart Filtering Service
 *
 * Çok aşamalı akıllı haber filtreleme sistemi:
 * 1. Batch Filtering: 79 haber → 40 haber (puan bazlı)
 * 2. Topic Extraction: Her haberin konusunu çıkar
 * 3. Topic-Based Duplicate Check: Veritabanı ile karşılaştır
 * 4. Smart Selection: Unique topic'leri seç
 */

import { type NewsArticle } from "./news.service";
import {
  extractTopicsBatch,
  selectUniqueTopicArticles,
  type ArticleWithTopic,
} from "./topic-extraction.service";

export interface SmartFilteringResult {
  stage1_filtered: ArticleWithTopic[];
  stage2_with_topics: ArticleWithTopic[];
  stage3_unique: ArticleWithTopic[];
  stats: {
    input_count: number;
    stage1_count: number;
    stage2_count: number;
    stage3_count: number;
    duplicate_rate: number;
    processing_time_ms: number;
  };
}

/**
 * 🕐 DYNAMIC TIME WINDOW CALCULATOR
 * 
 * Kalan haber sayısına göre akıllı zaman penceresi hesaplar.
 * Daha az haber = daha kısa zaman penceresi (daha sıkı duplicate kontrolü)
 * Daha çok haber = daha uzun zaman penceresi (daha geniş kapsamlı kontrol)
 * 
 * Formül: logaritmik ölçekleme + minimum/maksimum sınırlar
 * 
 * @param articleCount - Kalan haber sayısı
 * @returns Zaman penceresi (gün cinsinden, ondalıklı)
 * 
 * Örnekler:
 * - 5 haber  → 0.0625 gün (1.5 saat)
 * - 10 haber → 0.167 gün (4 saat)  
 * - 20 haber → 0.25 gün (6 saat)
 * - 30 haber → 0.333 gün (8 saat)
 * - 50 haber → 0.5 gün (12 saat)
 * - 75+ haber → 0.75 gün (18 saat) max
 */
export function calculateDynamicTimeWindow(articleCount: number): number {
  // Sınırlar
  const MIN_HOURS = 1.5;   // Minimum 1.5 saat (çok az haber için)
  const MAX_HOURS = 18;    // Maksimum 18 saat (çok fazla haber için)
  
  // Referans noktaları
  const REF_ARTICLES = 50; // 50 haber = 12 saat (orta nokta)
  const REF_HOURS = 12;
  
  if (articleCount <= 0) {
    return MIN_HOURS / 24; // 1.5 saat
  }
  
  // Logaritmik ölçekleme: log(articleCount) / log(50) * 12
  // Bu formül:
  // - 5 haber için ~1.5 saat
  // - 10 haber için ~4 saat
  // - 25 haber için ~8 saat
  // - 50 haber için 12 saat
  // - 75+ haber için 18 saat (max)
  
  const logScale = Math.log(Math.max(articleCount, 1)) / Math.log(REF_ARTICLES);
  let hours = REF_HOURS * logScale;
  
  // Alt ve üst sınır uygula
  hours = Math.max(MIN_HOURS, Math.min(MAX_HOURS, hours));
  
  // Gün cinsine çevir
  const days = hours / 24;
  
  console.log(`📊 Dynamic Time Window: ${articleCount} haber → ${hours.toFixed(1)} saat (${(days * 24).toFixed(1)}h)`);
  
  return days;
}

/**
 * STAGE 1: Batch Filtering
 *
 * 79 haberi 8 batch'e böl, her batch'ten en iyi 5'ini seç
 * Sonuç: 40 haber
 */
export function batchFilter(
  articles: NewsArticle[],
  batchSize: number = 10,
  topPerBatch: number = 5,
): ArticleWithTopic[] {
  console.log(`\n📊 STAGE 1: BATCH FILTERING`);
  console.log(`   Input: ${articles.length} haber`);
  console.log(`   Batch size: ${batchSize}`);
  console.log(`   Top per batch: ${topPerBatch}`);

  const filtered: ArticleWithTopic[] = [];

  // Batch'lere böl
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(
      `   📦 Batch ${batchNumber}: ${batch.length} haber → ${Math.min(topPerBatch, batch.length)} seçilecek`,
    );

    // Puana göre sırala ve en iyi N'ini al
    const topArticles = batch
      .sort((a, b) => (b.trendScore || 0) - (a.trendScore || 0))
      .slice(0, topPerBatch);

    filtered.push(...topArticles);

    // Log top articles
    topArticles.forEach((article, index) => {
      console.log(
        `      ${index + 1}. [${article.trendScore || 0}] ${article.title.substring(0, 50)}...`,
      );
    });
  }

  console.log(`   ✅ Filtered: ${filtered.length} haber`);
  return filtered;
}

/**
 * STAGE 2: Topic Extraction
 *
 * Her haberin konusunu DeepSeek API ile çıkar
 */
export async function extractTopicsStage(
  articles: ArticleWithTopic[],
): Promise<ArticleWithTopic[]> {
  console.log(`\n🧠 STAGE 2: TOPIC EXTRACTION`);
  console.log(`   Input: ${articles.length} haber`);

  const withTopics = await extractTopicsBatch(articles, 4);

  // Topic dağılımını göster
  const topicCounts: Record<string, number> = {};
  withTopics.forEach((article) => {
    const topic = article.topic || "unknown";
    topicCounts[topic] = (topicCounts[topic] || 0) + 1;
  });

  console.log(`\n   📊 Topic dağılımı:`);
  Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([topic, count]) => {
      console.log(`      ${topic}: ${count} haber`);
    });

  console.log(`   ✅ Topics extracted: ${withTopics.length} haber`);
  return withTopics;
}

/**
 * STAGE 3: Topic-Based Duplicate Check & Smart Selection
 *
 * Veritabanı ile karşılaştır, unique topic'leri seç
 */
export async function smartSelectionStage(
  articles: ArticleWithTopic[],
  targetCount: number = 5,
  timeWindowDays: number = 0.5, // 12 saate düşürüldü
  skipDuplicateCheck: boolean = false, // NEW: Skip if already filtered
): Promise<ArticleWithTopic[]> {
  console.log(`\n🔍 STAGE 3: TOPIC-BASED DUPLICATE CHECK & SMART SELECTION`);
  console.log(`   Input: ${articles.length} haber`);
  console.log(`   Target: ${targetCount} unique topics`);
  console.log(`   Skip duplicate check: ${skipDuplicateCheck}`);

  if (skipDuplicateCheck) {
    // Already filtered, just select top N
    console.log(`   ⚡ Duplicate check SKIPPED (already filtered)`);
    const selected = articles.slice(0, targetCount);
    console.log(
      `   ✅ Selected: ${selected.length} articles (no duplicate check needed)`,
    );
    return selected;
  }

  // Original logic with duplicate check
  const selected = await selectUniqueTopicArticles(
    articles,
    targetCount,
    timeWindowDays,
  );

  console.log(`   ✅ Selected: ${selected.length} unique topics`);
  return selected;
}

/**
 * MAIN PIPELINE: Tüm aşamaları çalıştır
 */
export async function runSmartFiltering(
  articles: NewsArticle[],
  options: {
    batchSize?: number;
    topPerBatch?: number;
    targetCount?: number;
    timeWindowDays?: number;
    skipDuplicateCheck?: boolean; // NEW: Skip duplicate check if already filtered
  } = {},
): Promise<SmartFilteringResult> {
  const startTime = Date.now();

  const {
    batchSize = 10,
    topPerBatch = 5,
    targetCount = 5,
    timeWindowDays = 0.5, // 12 saate düşürüldü
    skipDuplicateCheck = false, // NEW
  } = options;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🚀 SMART FILTERING PIPELINE BAŞLATILIYOR`);
  console.log(`${"=".repeat(60)}`);
  console.log(`   Input: ${articles.length} haber`);
  console.log(`   Target: ${targetCount} unique haber`);
  console.log(`   Time window: ${(timeWindowDays * 24).toFixed(1)} saat (${timeWindowDays.toFixed(3)} gün)`);
  console.log(`   Skip duplicate check: ${skipDuplicateCheck}`);

  // STAGE 1: Batch Filtering
  const stage1_filtered = batchFilter(articles, batchSize, topPerBatch);

  // STAGE 2: Topic Extraction (skip if already has topics)
  const hasTopics = stage1_filtered.every((a) => a.topic);
  let stage2_with_topics: ArticleWithTopic[];

  if (hasTopics && skipDuplicateCheck) {
    console.log(`\n🧠 STAGE 2: TOPIC EXTRACTION`);
    console.log(`   ⚡ SKIPPED (articles already have topics)`);
    stage2_with_topics = stage1_filtered;
  } else {
    stage2_with_topics = await extractTopicsStage(stage1_filtered);
  }

  // STAGE 3: Smart Selection
  const stage3_unique = await smartSelectionStage(
    stage2_with_topics,
    targetCount,
    timeWindowDays,
    skipDuplicateCheck, // NEW: Pass skip flag
  );

  const processingTime = Date.now() - startTime;

  // Calculate stats
  const stats = {
    input_count: articles.length,
    stage1_count: stage1_filtered.length,
    stage2_count: stage2_with_topics.length,
    stage3_count: stage3_unique.length,
    duplicate_rate:
      stage2_with_topics.length > 0
        ? 1 - stage3_unique.length / stage2_with_topics.length
        : 0,
    processing_time_ms: processingTime,
  };

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ SMART FILTERING TAMAMLANDI`);
  console.log(`${"=".repeat(60)}`);
  console.log(
    `   Stage 1 (Batch Filter):    ${articles.length} → ${stats.stage1_count}`,
  );
  console.log(
    `   Stage 2 (Topic Extract):   ${stats.stage1_count} → ${stats.stage2_count}`,
  );
  console.log(
    `   Stage 3 (Smart Select):    ${stats.stage2_count} → ${stats.stage3_count}`,
  );
  console.log(
    `   Duplicate Rate:            ${(stats.duplicate_rate * 100).toFixed(1)}%`,
  );
  console.log(
    `   Processing Time:           ${(processingTime / 1000).toFixed(1)}s`,
  );
  console.log(`${"=".repeat(60)}\n`);

  return {
    stage1_filtered,
    stage2_with_topics,
    stage3_unique,
    stats,
  };
}

export default {
  batchFilter,
  extractTopicsStage,
  smartSelectionStage,
  runSmartFiltering,
  calculateDynamicTimeWindow,
};
