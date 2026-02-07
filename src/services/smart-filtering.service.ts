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
  console.log(`   Time window: ${timeWindowDays} gün`);
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
};
