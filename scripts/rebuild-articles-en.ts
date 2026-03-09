/**
 * Rebuild EN Articles — Update TR Articles with EN translations
 *
 * CORRECT FLOW:
 * 1. Match EN Facebook slugs with TR articles by post time (minute-level)
 * 2. Matched: Translate TR article content to English via DeepSeek
 * 3. Unmatched: Generate new EN content via SearXNG + DeepSeek
 * 4. Update TR Article's EN fields (titleEn, contentEn, excerptEn, etc.)
 * 5. Create ArticleTranslation record (locale: "en") for routing
 *
 * Usage: npx tsx scripts/rebuild-articles-en.ts
 *   --dry-run       Preview without DB writes
 *   --batch=N       Concurrent articles per batch (default: 5)
 *   --start=N       Resume from index N
 *   --only=matched|unmatched   Process only matched or unmatched
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import axios from "axios";
import { searxngSearch } from "../src/lib/searxng";

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
const DRY_RUN = process.argv.includes("--dry-run");
const ONLY =
  process.argv.find((a) => a.startsWith("--only="))?.split("=")[1] || "all";

const prisma = new PrismaClient();

interface RecoveredArticle {
  title: string;
  slug: string;
  url: string;
  facebookMessage: string;
  facebookDate: string;
  facebookPostId: string;
  imageUrl: string | null;
  language: "tr" | "en";
}

interface EnArticleTask {
  enArticle: RecoveredArticle;
  trArticle: RecoveredArticle | null;
  type: "translate" | "generate";
}

const stats = {
  total: 0,
  translated: 0,
  generated: 0,
  skippedExisting: 0,
  trNotInDb: 0,
  contentFailed: 0,
  updated: 0,
  translationCreated: 0,
  errors: [] as string[],
};

// ============================================================================
// MATCH EN WITH TR BY FACEBOOK POST TIME (minute-level)
// ============================================================================

function buildMatchMap(
  trArticles: RecoveredArticle[],
  enArticles: RecoveredArticle[],
): EnArticleTask[] {
  const trByMinute = new Map<string, RecoveredArticle>();
  for (const tr of trArticles) {
    const minute = tr.facebookDate.substring(0, 16); // "2026-02-06T12:53"
    if (!trByMinute.has(minute)) trByMinute.set(minute, tr);
  }

  const tasks: EnArticleTask[] = [];
  for (const en of enArticles) {
    const minute = en.facebookDate.substring(0, 16);
    const trMatch = trByMinute.get(minute) || null;
    tasks.push({
      enArticle: en,
      trArticle: trMatch,
      type: trMatch ? "translate" : "generate",
    });
  }
  return tasks;
}

// ============================================================================
// TRANSLATE TR CONTENT TO EN VIA DEEPSEEK
// ============================================================================

async function translateContent(
  trContent: string,
  trTitle: string,
  trExcerpt: string,
  trKeywords: string[],
  trMetaDesc: string,
  enTitle: string,
): Promise<{
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaDescription: string;
} | null> {
  const prompt = `Translate this Turkish news article to English. Keep the same HTML structure.

ENGLISH TITLE (use this): ${enTitle}
TURKISH TITLE: ${trTitle}
TURKISH EXCERPT: ${trExcerpt}
TURKISH META DESCRIPTION: ${trMetaDesc}
TURKISH KEYWORDS: ${trKeywords.join(", ")}

TURKISH CONTENT:
${trContent.substring(0, 4000)}

Return JSON:
{
  "title": "${enTitle}",
  "excerpt": "2-3 sentence English summary",
  "content": "Full English translation in HTML format (<p>, <h2>, <h3>, <ul>, <li>, <strong>)",
  "keywords": ["english", "keywords", "5-8"],
  "metaDescription": "155 char English meta description"
}

RULES:
- Keep the same HTML structure and formatting
- Professional news English
- Do NOT translate brand names, company names, or technical terms
- Use the provided English title exactly`;

  try {
    const resp = await axios.post(
      `${DEEPSEEK_API_URL}/chat/completions`,
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a professional news translator. Return only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
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
    return JSON.parse(jsonMatch[0]);
  } catch (e: any) {
    console.error(`  ❌ Çeviri hatası: ${e.message}`);
    return null;
  }
}

// ============================================================================
// GENERATE NEW EN CONTENT (for unmatched articles)
// ============================================================================

async function generateEnContent(
  title: string,
  fbMessage: string,
): Promise<{
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaDescription: string;
} | null> {
  let webContext = "No web results found.";
  try {
    const results = await searxngSearch(title, {
      count: 5,
      language: "en",
      safesearch: 1,
      categories: "general,news",
    });

    if (results.length > 0) {
      webContext = results
        .map((r: any, i: number) => `[${i + 1}] ${r.title}\n${r.content}`)
        .join("\n\n");
    }
  } catch {}

  const prompt = `Write a professional English news article based on:

TITLE: ${title}
FACEBOOK POST: ${fbMessage}

WEB SOURCES:
${webContext}

Return JSON:
{
  "title": "SEO-friendly title (stay close to original)",
  "excerpt": "2-3 sentence summary",
  "content": "400+ word article in HTML (<p>, <h2>, <h3>, <ul>, <li>, <strong>)",
  "keywords": ["keywords", "5-8"],
  "metaDescription": "155 char meta description"
}`;

  try {
    const resp = await axios.post(
      `${DEEPSEEK_API_URL}/chat/completions`,
      {
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content:
              "You are a professional English news editor. Return only valid JSON.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
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
    return JSON.parse(jsonMatch[0]);
  } catch (e: any) {
    console.error(`  ❌ Generate hatası: ${e.message}`);
    return null;
  }
}

// ============================================================================
// PROCESS SINGLE EN ARTICLE — Update TR Article + Create ArticleTranslation
// ============================================================================

async function processTask(
  task: EnArticleTask,
  index: number,
): Promise<boolean> {
  const { enArticle, trArticle, type } = task;
  const label = `[${index + 1}/${stats.total}]`;

  try {
    // Check if ArticleTranslation already exists for this EN slug
    const existingTranslation = await prisma.articleTranslation.findFirst({
      where: { slug: enArticle.slug, locale: "en" },
    });
    if (existingTranslation) {
      console.log(`${label} ⏭️  Mevcut: ${enArticle.slug}`);
      stats.skippedExisting++;
      return true;
    }

    const typeIcon = type === "translate" ? "🔄" : "✨";
    console.log(`${label} ${typeIcon} ${enArticle.title.substring(0, 55)}...`);

    let content: {
      title: string;
      excerpt: string;
      content: string;
      keywords: string[];
      metaDescription: string;
    } | null = null;

    // Find the TR article in DB (needed for both translate and to link translation)
    let trDbArticle: any = null;

    if (type === "translate" && trArticle) {
      trDbArticle = await prisma.article.findUnique({
        where: { slug: trArticle.slug },
      });

      if (trDbArticle) {
        content = await translateContent(
          trDbArticle.content,
          trDbArticle.title,
          trDbArticle.excerpt,
          trDbArticle.keywords,
          trDbArticle.metaDescription || "",
          enArticle.title,
        );
        if (content) stats.translated++;
      } else {
        // TR not in DB — fallback to generate
        stats.trNotInDb++;
        content = await generateEnContent(
          enArticle.title,
          enArticle.facebookMessage,
        );
        if (content) stats.generated++;
      }
    } else {
      // Unmatched: generate new content
      content = await generateEnContent(
        enArticle.title,
        enArticle.facebookMessage,
      );
      if (content) stats.generated++;
    }

    if (!content) {
      stats.contentFailed++;
      stats.errors.push(`${enArticle.slug}: Content failed`);
      return false;
    }

    if (DRY_RUN) {
      console.log(
        `${label} ✅ [DRY] ${type} | ${content.title.substring(0, 50)}`,
      );
      stats.updated++;
      return true;
    }

    // If we have a matched TR article in DB, update its EN fields + create translation
    if (trDbArticle) {
      // 1. Update TR Article's EN fields
      await prisma.article.update({
        where: { id: trDbArticle.id },
        data: {
          titleEn: content.title,
          excerptEn: content.excerpt,
          contentEn: content.content,
          metaDescriptionEn: content.metaDescription,
          keywordsEn: content.keywords,
        },
      });

      // 2. Create ArticleTranslation for EN routing
      await prisma.articleTranslation.create({
        data: {
          articleId: trDbArticle.id,
          locale: "en",
          title: content.title,
          slug: enArticle.slug,
          excerpt: content.excerpt,
          content: content.content,
          metaTitle: content.title,
          metaDescription: content.metaDescription,
        },
      });

      stats.translationCreated++;
      stats.updated++;
      console.log(
        `${label} ✅ ${type} → ${trDbArticle.slug} | EN: ${enArticle.slug}`,
      );
    } else {
      // No TR article found — we need to find ANY TR article to link to,
      // or skip. For unmatched, try to find by similar title/date.
      // For now: create a standalone TR article with EN content as primary,
      // then add translation. This preserves the EN slug for Google index.

      const publishDate = new Date(enArticle.facebookDate);

      // Find a default category
      const defaultCat = await prisma.category.findFirst({
        where: { slug: "yapay-zeka-haberleri" },
      });
      const user = await prisma.user.findFirst({
        where: { email: "admin@aihaberleri.org" },
      });

      if (!defaultCat || !user) {
        stats.errors.push(`${enArticle.slug}: No category or user found`);
        return false;
      }

      // Create a TR article with EN content (title stays EN for now)
      const trSlug = `tr-${enArticle.slug}`.substring(0, 190);

      // Check if this generated TR slug already exists
      const existingTr = await prisma.article.findUnique({
        where: { slug: trSlug },
      });
      if (existingTr) {
        // Link to existing
        await prisma.article.update({
          where: { id: existingTr.id },
          data: {
            titleEn: content.title,
            excerptEn: content.excerpt,
            contentEn: content.content,
            metaDescriptionEn: content.metaDescription,
            keywordsEn: content.keywords,
          },
        });
        await prisma.articleTranslation.create({
          data: {
            articleId: existingTr.id,
            locale: "en",
            title: content.title,
            slug: enArticle.slug,
            excerpt: content.excerpt,
            content: content.content,
            metaTitle: content.title,
            metaDescription: content.metaDescription,
          },
        });
        stats.translationCreated++;
        stats.updated++;
        console.log(
          `${label} ✅ linked to existing ${trSlug} | EN: ${enArticle.slug}`,
        );
      } else {
        // Create new article + translation
        const newArticle = await prisma.article.create({
          data: {
            title: content.title, // EN title as primary (no TR equivalent)
            slug: trSlug,
            excerpt: content.excerpt,
            content: content.content,
            imageUrl: null,
            sourceUrl: enArticle.url,
            status: "PUBLISHED",
            publishedAt: publishDate,
            createdAt: publishDate,
            categoryId: defaultCat.id,
            authorId: user.id,
            metaTitle: content.title,
            metaDescription: content.metaDescription,
            keywords: content.keywords,
            titleEn: content.title,
            excerptEn: content.excerpt,
            contentEn: content.content,
            metaDescriptionEn: content.metaDescription,
            keywordsEn: content.keywords,
            score: 600,
            language: "tr",
            readingTime: Math.ceil(content.content.split(/\s+/).length / 200),
          },
        });

        await prisma.articleTranslation.create({
          data: {
            articleId: newArticle.id,
            locale: "en",
            title: content.title,
            slug: enArticle.slug,
            excerpt: content.excerpt,
            content: content.content,
            metaTitle: content.title,
            metaDescription: content.metaDescription,
          },
        });

        stats.translationCreated++;
        stats.updated++;
        console.log(
          `${label} ✅ new article ${trSlug} | EN: ${enArticle.slug}`,
        );
      }
    }

    return true;
  } catch (e: any) {
    if (e.code === "P2002") {
      // Unique constraint — translation already exists
      console.log(`${label} ⏭️  Zaten var (unique): ${enArticle.slug}`);
      stats.skippedExisting++;
      return true;
    }
    console.error(`${label} ❌ ${e.message}`);
    stats.errors.push(`${enArticle.slug}: ${e.message}`);
    return false;
  }
}

// ============================================================================
// CHECKPOINT
// ============================================================================

function saveCheckpoint(index: number) {
  fs.writeFileSync(
    "scripts/rebuild-en-checkpoint.json",
    JSON.stringify(
      {
        lastIndex: index,
        timestamp: new Date().toISOString(),
        stats,
      },
      null,
      2,
    ),
  );
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("🚀 EN Article Rebuild — ArticleTranslation + EN Fields");
  console.log(
    `📦 Batch: ${BATCH_SIZE} | Start: ${START_INDEX} | DryRun: ${DRY_RUN} | Only: ${ONLY}`,
  );
  console.log("=".repeat(60));

  // Load data
  const trArticles: RecoveredArticle[] = JSON.parse(
    fs.readFileSync("scripts/recovered-articles.json", "utf-8"),
  );
  const enArticles: RecoveredArticle[] = JSON.parse(
    fs.readFileSync("scripts/recovered-articles-en.json", "utf-8"),
  );

  // Filter invalid EN slugs
  const validEn = enArticles
    .filter(
      (a) => a.slug !== "en" && !a.slug.includes("test") && a.title.length > 5,
    )
    .sort(
      (a, b) =>
        new Date(a.facebookDate).getTime() - new Date(b.facebookDate).getTime(),
    );

  // Build match map
  const allTasks = buildMatchMap(trArticles, validEn);

  // Filter by --only flag
  let tasks = allTasks;
  if (ONLY === "matched")
    tasks = allTasks.filter((t) => t.type === "translate");
  if (ONLY === "unmatched")
    tasks = allTasks.filter((t) => t.type === "generate");

  const matched = allTasks.filter((t) => t.type === "translate").length;
  const unmatched = allTasks.filter((t) => t.type === "generate").length;

  console.log(
    `📰 EN toplam: ${validEn.length} | Eşleşen: ${matched} | Eşleşmeyen: ${unmatched}`,
  );
  console.log(`📋 İşlenecek: ${tasks.length - START_INDEX}`);

  stats.total = tasks.length;

  // Verify DB connection
  const articleCount = await prisma.article.count();
  const translationCount = await prisma.articleTranslation.count();
  console.log(
    `📊 DB: ${articleCount} article, ${translationCount} translation`,
  );
  console.log("=".repeat(60));

  const toProcess = tasks.slice(START_INDEX);
  const startTime = Date.now();

  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);

    console.log(
      `\n--- Batch ${batchNum}/${totalBatches} (${batch.length} makale) ---`,
    );

    await Promise.all(
      batch.map((task, j) => processTask(task, START_INDEX + i + j)),
    );

    saveCheckpoint(START_INDEX + i + batch.length);

    const elapsed = (Date.now() - startTime) / 1000;
    const processed = i + batch.length;
    const rate = processed / elapsed;
    const eta = (toProcess.length - processed) / rate;
    console.log(
      `⏱️  ${processed}/${toProcess.length} | ${rate.toFixed(1)} makale/sn | ETA: ${Math.ceil(eta / 60)} dk`,
    );

    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  const totalTime = (Date.now() - startTime) / 1000;
  console.log("\n" + "=".repeat(60));
  console.log("📊 SONUÇLAR:");
  console.log(`  ✅ Güncellenen: ${stats.updated}`);
  console.log(`  🔄 Çevrilen (TR→EN): ${stats.translated}`);
  console.log(`  ✨ Üretilen (yeni): ${stats.generated}`);
  console.log(`  📝 Translation oluşturulan: ${stats.translationCreated}`);
  console.log(`  ⏭️  Mevcut (atlandı): ${stats.skippedExisting}`);
  console.log(`  ⚠️  TR DB'de yok: ${stats.trNotInDb}`);
  console.log(`  ❌ Başarısız: ${stats.contentFailed}`);
  console.log(`  ⏱️  Süre: ${(totalTime / 60).toFixed(1)} dk`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ HATALAR (${stats.errors.length}):`);
    stats.errors.slice(0, 20).forEach((e) => console.log(`  - ${e}`));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Fatal:", e);
  prisma.$disconnect();
  process.exit(1);
});
