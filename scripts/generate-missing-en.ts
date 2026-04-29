/**
 * TR makalelerin eksik EN çevirilerini oluştur
 *
 * Flow:
 * 1. ArticleTranslation'ı olmayan TR makaleleri bul
 * 2. DeepSeek ile TR → EN çeviri yap
 * 3. Article EN alanlarını güncelle (titleEn, contentEn, etc.)
 * 4. ArticleTranslation oluştur (locale: "en")
 *
 * Usage: npx tsx scripts/generate-missing-en.ts
 *   --batch=N    Paralel batch boyutu (default: 5)
 *   --start=N    Index'ten devam et
 *   --dry-run    Önizleme
 *   --limit=N    Maksimum makale sayısı
 */

import { PrismaClient } from "@prisma/client";
import axios from "axios";
import * as fs from "fs";

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || "sk-2750fa1691164dd2940c2ec3cb37d2e6";
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";

const BATCH_SIZE = parseInt(
  process.argv.find((a) => a.startsWith("--batch="))?.split("=")[1] || "5",
);
const START_INDEX = parseInt(
  process.argv.find((a) => a.startsWith("--start="))?.split("=")[1] || "0",
);
const LIMIT = parseInt(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "99999",
);
const DRY_RUN = process.argv.includes("--dry-run");
const CHECKPOINT_FILE = "scripts/generate-missing-en-checkpoint.json";

const prisma = new PrismaClient();

const stats = {
  total: 0,
  translated: 0,
  skipped: 0,
  failed: 0,
  errors: [] as string[],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 190);
}

async function translateToEn(article: {
  title: string;
  content: string;
  excerpt: string | null;
  keywords: string[] | null;
  metaDescription: string | null;
}): Promise<{
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaDescription: string;
} | null> {
  const prompt = `Translate this Turkish AI/tech news article to professional English.

TURKISH TITLE: ${article.title}
TURKISH EXCERPT: ${article.excerpt || ""}
TURKISH CONTENT (first 2000 chars): ${article.content.substring(0, 2000)}
TURKISH KEYWORDS: ${(article.keywords || []).join(", ")}
TURKISH META: ${article.metaDescription || ""}

Return JSON only:
{
  "title": "English SEO title",
  "slug": "url-friendly-english-slug",
  "excerpt": "2-3 sentence English summary",
  "content": "Full English article in HTML (<p>, <h2>, <h3>, <ul>, <li>, <strong>). Keep same structure, 300+ words.",
  "keywords": ["5-8 English keywords"],
  "metaDescription": "155 char English meta description"
}`;

  try {
    const resp = await axios.post(
      `${DEEPSEEK_API_URL}/chat/completions`,
      {
        model: "deepseek-v4-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a professional translator specializing in AI/tech news. Translate Turkish to English. Return only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.5,
        max_tokens: 3000,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        timeout: 60000,
      },
    );

    const raw = resp.data.choices[0]?.message?.content || "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    // Ensure slug is valid
    if (!parsed.slug || parsed.slug.length < 5) {
      parsed.slug = slugify(parsed.title);
    }
    return parsed;
  } catch (e: any) {
    console.error(`  ❌ DeepSeek: ${e.message}`);
    return null;
  }
}

async function processArticle(article: any, index: number): Promise<boolean> {
  const label = `[${index + 1}/${stats.total}]`;

  try {
    // Double-check translation doesn't exist
    const existing = await prisma.articleTranslation.findFirst({
      where: { articleId: article.id, locale: "en" },
    });
    if (existing) {
      stats.skipped++;
      return true;
    }

    console.log(`${label} 🔄 ${article.title.substring(0, 60)}...`);

    if (DRY_RUN) {
      console.log(`${label} ✅ [DRY] Would translate`);
      stats.translated++;
      return true;
    }

    const en = await translateToEn(article);
    if (!en) {
      stats.failed++;
      stats.errors.push(`${article.slug}: Translation failed`);
      return false;
    }

    // Ensure unique slug
    let enSlug = en.slug;
    const slugExists = await prisma.articleTranslation.findFirst({
      where: { slug: enSlug, locale: "en" },
    });
    if (slugExists) {
      enSlug = `${enSlug}-${Date.now().toString(36)}`;
    }

    // Update Article EN fields
    await prisma.article.update({
      where: { id: article.id },
      data: {
        titleEn: en.title,
        excerptEn: en.excerpt,
        contentEn: en.content,
        metaDescriptionEn: en.metaDescription,
        keywordsEn: en.keywords,
      },
    });

    // Create ArticleTranslation
    await prisma.articleTranslation.create({
      data: {
        articleId: article.id,
        locale: "en",
        title: en.title,
        slug: enSlug,
        excerpt: en.excerpt,
        content: en.content,
        metaTitle: en.title,
        metaDescription: en.metaDescription,
      },
    });

    console.log(`${label} ✅ ${article.slug} → ${enSlug}`);
    stats.translated++;
    return true;
  } catch (e: any) {
    if (e.code === "P2002") {
      console.log(`${label} ⏭️  Slug çakışması, atlanıyor`);
      stats.skipped++;
      return true;
    }
    console.error(`${label} ❌ ${e.message}`);
    stats.errors.push(`${article.slug}: ${e.message}`);
    stats.failed++;
    return false;
  }
}

function saveCheckpoint(index: number) {
  fs.writeFileSync(
    CHECKPOINT_FILE,
    JSON.stringify(
      { lastIndex: index, timestamp: new Date().toISOString(), stats },
      null,
      2,
    ),
  );
}

async function main() {
  console.log("🌐 TR → EN Eksik Çeviri Üretici");
  console.log(
    `⚙️  Batch: ${BATCH_SIZE} | Start: ${START_INDEX} | DryRun: ${DRY_RUN} | Limit: ${LIMIT}`,
  );
  console.log("=".repeat(60));

  // TR makaleler — ArticleTranslation'ı olmayanlar
  const articles = await prisma.$queryRaw<any[]>`
    SELECT a.id, a.slug, a.title, a.content, a.excerpt, a.keywords, a."metaDescription"
    FROM "Article" a
    WHERE a.language = 'tr'
    AND NOT EXISTS (
      SELECT 1 FROM "ArticleTranslation" at
      WHERE at."articleId" = a.id AND at.locale = 'en'
    )
    ORDER BY a."publishedAt" ASC
  `;

  const toProcess = articles.slice(START_INDEX, START_INDEX + LIMIT);
  stats.total = toProcess.length;

  console.log(`📰 Toplam eksik EN: ${articles.length}`);
  console.log(`📦 İşlenecek: ${toProcess.length}`);
  console.log("=".repeat(60));

  if (toProcess.length === 0) {
    console.log("✅ Tüm makalelerin EN çevirisi var!");
    await prisma.$disconnect();
    return;
  }

  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);
    console.log(
      `\n--- Batch ${batchNum}/${totalBatches} (${batch.length} makale) ---`,
    );

    await Promise.all(
      batch.map((article, j) => processArticle(article, START_INDEX + i + j)),
    );

    saveCheckpoint(START_INDEX + i + batch.length);

    // Progress
    const elapsed = (Date.now() - startTime) / 1000;
    const processed = i + batch.length;
    const rate = processed / elapsed;
    const eta = (toProcess.length - processed) / rate;
    console.log(
      `⏱️  ${processed}/${toProcess.length} | ${rate.toFixed(1)} makale/sn | ETA: ${Math.ceil(eta / 60)} dk`,
    );
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log("\n" + "=".repeat(60));
  console.log("📊 SONUÇLAR:");
  console.log(`  ✅ Çevrilen: ${stats.translated}`);
  console.log(`  ⏭️  Atlanan: ${stats.skipped}`);
  console.log(`  ❌ Başarısız: ${stats.failed}`);
  console.log(`  ⏱️  Süre: ${(totalTime / 60).toFixed(1)} dk`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ HATALAR (${stats.errors.length}):`);
    stats.errors.slice(0, 20).forEach((e) => console.log(`  - ${e}`));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Fatal:", e.message);
  prisma.$disconnect();
  process.exit(1);
});
