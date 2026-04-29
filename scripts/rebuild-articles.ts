/**
 * Rebuild Articles from Facebook Recovery Data — PARALLEL & FAST
 *
 * Pipeline per article:
 * 1. Google News search + R2 image check (PARALLEL)
 * 2. DeepSeek content generation (enriched with web results)
 * 3. Create Article with exact slug, publishedAt = facebookDate
 *
 * SPEED: Processes BATCH_SIZE articles concurrently via Promise.all
 *
 * Usage: npx tsx scripts/rebuild-articles.ts
 *   --dry-run       Preview without DB writes
 *   --batch=N       Concurrent articles per batch (default: 5)
 *   --start=N       Resume from index N
 *   --skip-search   Skip Google News enrichment
 *   --skip-images   Skip image processing
 */

import { PrismaClient, ArticleStatus } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import * as crypto from "crypto";
import { googleNewsSearch } from "../src/lib/google-news-search";

// ============================================================================
// CONFIG
// ============================================================================

const DEEPSEEK_API_KEY =
  process.env.DEEPSEEK_API_KEY || "sk-2750fa1691164dd2940c2ec3cb37d2e6";
const DEEPSEEK_API_URL =
  process.env.DEEPSEEK_API_URL || "https://api.deepseek.com/v1";
const R2_PUBLIC_URL = "https://images.aihaberleri.org";

const BATCH_SIZE = parseInt(
  process.argv.find((a) => a.startsWith("--batch="))?.split("=")[1] || "5",
);
const START_INDEX = parseInt(
  process.argv.find((a) => a.startsWith("--start="))?.split("=")[1] || "0",
);
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_SEARCH = process.argv.includes("--skip-search");
const SKIP_IMAGES = process.argv.includes("--skip-images");

const prisma = new PrismaClient();
// ============================================================================
// TYPES & STATS
// ============================================================================

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

interface SearchResult {
  title: string;
  url: string;
  content: string;
}

const stats = {
  total: 0,
  processed: 0,
  skippedExisting: 0,
  contentGenerated: 0,
  contentFailed: 0,
  searchEnriched: 0,
  searchFailed: 0,
  imageFromR2: 0,
  imageRegenerated: 0,
  imageSkipped: 0,
  created: 0,
  errors: [] as string[],
};

// ============================================================================
// CATEGORY HELPERS
// ============================================================================

const HASHTAG_TO_SLUG: Record<string, string> = {
  "#YapayZekaAraçları": "yapay-zeka-araclari",
  "#SektörHaberleri": "sektor-haberleri",
  "#DoğalDilİşleme": "dogal-dil-isleme",
  "#Robotik": "robotik",
  "#OtonomAraçlar": "otonom-araclar",
  "#SağlıkYZ": "saglik-yz",
  "#EğitimYZ": "egitim-yz",
  "#SiberGüvenlik": "siber-guvenlik",
  "#GörüntüTanıma": "goruntu-tanima",
  "#YapayZekaEtiği": "yapay-zeka-etigi",
  "#FinansYZ": "finans-yz",
  "#OyunYZ": "oyun-yz",
  "#MüzikYZ": "muzik-yz",
  "#BilimYZ": "bilim-yz",
  "#YapayZekaModelleri": "yapay-zeka-modelleri",
  "#BüyükDilModelleri": "buyuk-dil-modelleri",
  "#GörselÜretim": "gorsel-uretim",
  "#YapayZekaRegülasyon": "yapay-zeka-regulasyon",
};

const SLUG_TO_NAME: Record<string, string> = {
  "yapay-zeka-haberleri": "Yapay Zeka Haberleri",
  "yapay-zeka-araclari": "Yapay Zeka Araçları",
  "sektor-haberleri": "Sektör Haberleri",
  "dogal-dil-isleme": "Doğal Dil İşleme",
  robotik: "Robotik",
  "otonom-araclar": "Otonom Araçlar",
  "saglik-yz": "Sağlık ve YZ",
  "egitim-yz": "Eğitim ve YZ",
  "siber-guvenlik": "Siber Güvenlik",
  "goruntu-tanima": "Görüntü Tanıma",
  "yapay-zeka-etigi": "Yapay Zeka Etiği",
  "finans-yz": "Finans ve YZ",
  "oyun-yz": "Oyun ve YZ",
  "muzik-yz": "Müzik ve YZ",
  "bilim-yz": "Bilim ve YZ",
  "yapay-zeka-modelleri": "Yapay Zeka Modelleri",
  "buyuk-dil-modelleri": "Büyük Dil Modelleri",
  "gorsel-uretim": "Görsel Üretim",
  "yapay-zeka-regulasyon": "Yapay Zeka Regülasyon",
};

function extractCategorySlug(msg: string): string {
  for (const [tag, slug] of Object.entries(HASHTAG_TO_SLUG)) {
    if (msg.includes(tag)) return slug;
  }
  return "yapay-zeka-haberleri";
}

// ============================================================================
// SEARXNG SEARCH
// ============================================================================

async function searchWeb(query: string): Promise<SearchResult[]> {
  if (SKIP_SEARCH) return [];
  try {
    const results = await googleNewsSearch(query, {
      count: 5,
      language: "tr-TR",
      safesearch: 1,
      categories: "general,news",
    });

    return results.map((r: any) => ({
      title: r.title || "",
      url: r.url || "",
      content: r.content || "",
    }));
  } catch (e: any) {
    stats.searchFailed++;
    return [];
  }
}

// ============================================================================
// DEEPSEEK CONTENT GENERATION
// ============================================================================

async function generateContent(
  title: string,
  fbMessage: string,
  webResults: SearchResult[],
): Promise<{
  title: string;
  excerpt: string;
  content: string;
  keywords: string[];
  metaDescription: string;
  score: number;
} | null> {
  const webContext =
    webResults.length > 0
      ? webResults
          .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`)
          .join("\n\n")
      : "Web araması sonucu bulunamadı.";

  const prompt = `Sen bir yapay zeka haber editörüsün. Aşağıdaki bilgileri kullanarak profesyonel bir Türkçe haber makalesi yaz.

BAŞLIK: ${title}
FACEBOOK GÖNDERİSİ: ${fbMessage}

WEB KAYNAKLARI:
${webContext}

JSON formatında yanıt ver:
{
  "title": "SEO uyumlu başlık (orijinale sadık kal)",
  "excerpt": "2-3 cümlelik özet",
  "content": "En az 400 kelimelik detaylı haber içeriği. HTML formatında <p>, <h2>, <h3>, <ul>, <li>, <strong> etiketleri kullan. Paragraflar arası boşluk bırak.",
  "keywords": ["anahtar", "kelimeler", "5-8 adet"],
  "metaDescription": "155 karakterlik meta açıklama",
  "score": 700
}

KURALLAR:
- İçerik en az 400 kelime olmalı
- HTML formatında yaz, markdown KULLANMA
- Profesyonel haber dili kullan
- Kaynaklardan bilgi ekle ama kopyalama
- score her zaman 700 olsun`;

  try {
    const resp = await axios.post(
      `${DEEPSEEK_API_URL}/chat/completions`,
      {
        model: "deepseek-v4-flash",
        messages: [
          {
            role: "system",
            content:
              "Sen profesyonel bir Türkçe haber editörüsün. Sadece JSON formatında yanıt ver.",
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
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    stats.contentGenerated++;
    return parsed;
  } catch (e: any) {
    console.error(`  ❌ DeepSeek hata: ${e.message}`);
    stats.contentFailed++;
    return null;
  }
}

// ============================================================================
// R2 IMAGE CHECK
// ============================================================================

async function checkR2Image(slug: string): Promise<{
  hasImages: boolean;
  urls: { large?: string; medium?: string; small?: string; thumb?: string };
}> {
  if (SKIP_IMAGES) return { hasImages: false, urls: {} };

  const sizes = ["large", "medium", "small", "thumb"] as const;
  const urls: Record<string, string> = {};
  let found = false;

  await Promise.all(
    sizes.map(async (size) => {
      const url = `${R2_PUBLIC_URL}/${slug}-${size}.webp`;
      try {
        const resp = await axios.head(url, { timeout: 5000 });
        if (resp.status === 200) {
          urls[size] = url;
          found = true;
        }
      } catch {}
    }),
  );

  if (found) stats.imageFromR2++;
  else stats.imageSkipped++;

  return { hasImages: found, urls };
}

// ============================================================================
// POLLINATIONS PROMPT EXTRACTION
// ============================================================================

function extractPollinationsPrompt(fbImageUrl: string | null): string | null {
  if (!fbImageUrl) return null;
  try {
    const urlObj = new URL(fbImageUrl);
    const innerUrl = urlObj.searchParams.get("url");
    if (!innerUrl) return null;
    const decoded = decodeURIComponent(innerUrl);
    const match = decoded.match(/pollinations\.ai\/prompt\/([^?]+)/);
    if (match) return decodeURIComponent(match[1]);
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// SETUP USER & CATEGORIES
// ============================================================================

async function setupUserAndCategories(): Promise<{
  userId: string;
  categoryMap: Map<string, string>;
}> {
  // Get or create admin user
  let user = await prisma.user.findFirst({
    where: { email: "admin@aihaberleri.org" },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "admin@aihaberleri.org",
        name: "AI Haberleri Admin",
        role: "ADMIN",
        password: crypto.randomBytes(32).toString("hex"),
      },
    });
    console.log(`👤 Admin kullanıcı oluşturuldu: ${user.id}`);
  } else {
    console.log(`👤 Admin kullanıcı mevcut: ${user.id}`);
  }

  // Get or create categories
  const categoryMap = new Map<string, string>();
  for (const [slug, name] of Object.entries(SLUG_TO_NAME)) {
    let cat = await prisma.category.findFirst({ where: { slug } });
    if (!cat) {
      cat = await prisma.category.create({
        data: { name, slug, description: `${name} kategorisi` },
      });
      console.log(`📁 Kategori oluşturuldu: ${name}`);
    }
    categoryMap.set(slug, cat.id);
  }

  return { userId: user.id, categoryMap };
}

// ============================================================================
// PROCESS SINGLE ARTICLE
// ============================================================================

async function processArticle(
  article: RecoveredArticle,
  index: number,
  userId: string,
  categoryMap: Map<string, string>,
): Promise<boolean> {
  const label = `[${index + 1}/${stats.total}]`;

  try {
    // Skip if already exists
    const existing = await prisma.article.findUnique({
      where: { slug: article.slug },
    });
    if (existing) {
      console.log(`${label} ⏭️  Mevcut: ${article.slug}`);
      stats.skippedExisting++;
      return true;
    }

    console.log(`${label} 🔄 ${article.title.substring(0, 60)}...`);

    // PARALLEL: Google News + R2 check
    const [webResults, r2Result] = await Promise.all([
      searchWeb(article.title),
      checkR2Image(article.slug),
    ]);

    if (webResults.length > 0) stats.searchEnriched++;

    // DeepSeek content generation
    const content = await generateContent(
      article.title,
      article.facebookMessage,
      webResults,
    );

    if (!content) {
      console.log(`${label} ❌ İçerik üretilemedi, fallback kullanılıyor`);
      // Fallback: use facebook message as content
      const fallbackContent = {
        title: article.title,
        excerpt: article.facebookMessage
          .split("\n")
          .slice(2, 4)
          .join(" ")
          .substring(0, 200),
        content: `<p>${article.facebookMessage.replace(/\n/g, "</p><p>").replace(/#\w+/g, "")}</p>`,
        keywords: ["yapay zeka", "teknoloji"],
        metaDescription: article.title.substring(0, 155),
        score: 300,
      };
      Object.assign(content || {}, fallbackContent);
      if (!content) {
        stats.errors.push(`${article.slug}: İçerik üretilemedi`);
        return false;
      }
    }

    // Determine category
    const catSlug = extractCategorySlug(article.facebookMessage);
    const categoryId =
      categoryMap.get(catSlug) || categoryMap.get("yapay-zeka-haberleri")!;

    // Parse facebook date
    const publishDate = new Date(article.facebookDate);

    // Image URLs from R2
    const imageUrl = r2Result.urls.large || null;
    const imageUrlMedium = r2Result.urls.medium || null;
    const imageUrlSmall = r2Result.urls.small || null;
    const imageUrlThumb = r2Result.urls.thumb || null;

    // Extract pollinations prompt for topic
    const pollinationsPrompt = extractPollinationsPrompt(article.imageUrl);

    if (DRY_RUN) {
      console.log(`${label} ✅ [DRY-RUN] ${content.title}`);
      console.log(
        `  📅 ${publishDate.toISOString()} | 🔍 ${webResults.length} kaynak | 🖼️ R2: ${r2Result.hasImages}`,
      );
      stats.created++;
      return true;
    }

    // Create article in DB
    await prisma.article.create({
      data: {
        title: content.title,
        slug: article.slug,
        excerpt: content.excerpt,
        content: content.content,
        imageUrl,
        imageUrlMedium,
        imageUrlSmall,
        imageUrlThumb,
        sourceUrl: article.url,
        status: "PUBLISHED",
        publishedAt: publishDate,
        createdAt: publishDate,
        categoryId,
        authorId: userId,
        metaTitle: content.title,
        metaDescription: content.metaDescription,
        keywords: content.keywords,
        score: content.score,
        language: article.language,
        readingTime: Math.ceil(content.content.split(/\s+/).length / 200),
        topic: pollinationsPrompt?.substring(0, 100) || null,
      },
    });

    console.log(
      `${label} ✅ ${content.title.substring(0, 50)}... | 📅 ${publishDate.toLocaleDateString("tr-TR")}`,
    );
    stats.created++;
    return true;
  } catch (e: any) {
    console.error(`${label} ❌ HATA: ${e.message}`);
    stats.errors.push(`${article.slug}: ${e.message}`);
    return false;
  }
}

// ============================================================================
// CHECKPOINT
// ============================================================================

function saveCheckpoint(index: number) {
  const checkpoint = {
    lastIndex: index,
    timestamp: new Date().toISOString(),
    stats,
  };
  fs.writeFileSync(
    "scripts/rebuild-checkpoint.json",
    JSON.stringify(checkpoint, null, 2),
  );
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("🚀 Article Rebuild — PARALLEL MODE");
  console.log(
    `📦 Batch: ${BATCH_SIZE} | Start: ${START_INDEX} | DryRun: ${DRY_RUN}`,
  );
  console.log("=".repeat(60));

  // Load recovered articles
  const raw = fs.readFileSync("scripts/recovered-articles.json", "utf-8");
  const allArticles: RecoveredArticle[] = JSON.parse(raw);

  // Filter out invalid titles and sort oldest first
  const articles = allArticles
    .filter((a) => a.title !== "aihaberleri.org" && a.title.length > 5)
    .sort(
      (a, b) =>
        new Date(a.facebookDate).getTime() - new Date(b.facebookDate).getTime(),
    );

  console.log(
    `📰 Toplam: ${allArticles.length} | Geçerli: ${articles.length} | İşlenecek: ${articles.length - START_INDEX}`,
  );

  stats.total = articles.length;

  // Setup
  const { userId, categoryMap } = await setupUserAndCategories();
  console.log(`📁 ${categoryMap.size} kategori hazır`);
  console.log("=".repeat(60));

  const toProcess = articles.slice(START_INDEX);
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < toProcess.length; i += BATCH_SIZE) {
    const batch = toProcess.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(toProcess.length / BATCH_SIZE);

    console.log(
      `\n--- Batch ${batchNum}/${totalBatches} (${batch.length} makale) ---`,
    );

    // Process batch in parallel
    await Promise.all(
      batch.map((article, j) =>
        processArticle(article, START_INDEX + i + j, userId, categoryMap),
      ),
    );

    // Checkpoint after each batch
    saveCheckpoint(START_INDEX + i + batch.length);

    // Stats
    const elapsed = (Date.now() - startTime) / 1000;
    const processed = i + batch.length;
    const rate = processed / elapsed;
    const eta = (toProcess.length - processed) / rate;
    console.log(
      `⏱️  ${processed}/${toProcess.length} | ${rate.toFixed(1)} makale/sn | ETA: ${Math.ceil(eta / 60)} dk`,
    );

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < toProcess.length) {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // Final stats
  const totalTime = (Date.now() - startTime) / 1000;
  console.log("\n" + "=".repeat(60));
  console.log("📊 SONUÇLAR:");
  console.log(`  ✅ Oluşturulan: ${stats.created}`);
  console.log(`  ⏭️  Mevcut (atlandı): ${stats.skippedExisting}`);
  console.log(`  🔍 Web zenginleştirme: ${stats.searchEnriched}`);
  console.log(`  🤖 İçerik üretilen: ${stats.contentGenerated}`);
  console.log(`  ❌ İçerik başarısız: ${stats.contentFailed}`);
  console.log(`  🖼️  R2 görsel: ${stats.imageFromR2}`);
  console.log(`  ⏱️  Toplam süre: ${(totalTime / 60).toFixed(1)} dakika`);
  console.log(
    `  🚀 Hız: ${(stats.total / totalTime).toFixed(2)} makale/saniye`,
  );

  if (stats.errors.length > 0) {
    console.log(`\n❌ HATALAR (${stats.errors.length}):`);
    stats.errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    if (stats.errors.length > 10)
      console.log(`  ... ve ${stats.errors.length - 10} daha`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Fatal:", e);
  prisma.$disconnect();
  process.exit(1);
});
