/**
 * Share Missing Social Media Posts
 *
 * Tüm haberleri sırayla kontrol eder, paylaşılmamış platformlarda paylaşır.
 * Her haber arasında 30 saniye bekler.
 *
 * Usage:
 *   npx tsx scripts/share-missing-social.ts
 *   npx tsx scripts/share-missing-social.ts --dry-run
 *   npx tsx scripts/share-missing-social.ts --limit=100
 *   npx tsx scripts/share-missing-social.ts --skip-facebook
 *   npx tsx scripts/share-missing-social.ts --start-from=500
 */

import { PrismaClient, SocialPlatform } from "@prisma/client";
import { BskyAgent, RichText } from "@atproto/api";
import { createRestAPIClient } from "masto";
import * as fs from "fs";

// ═══════════════════════════════════════════════════════════════
// CLI ARGS
// ═══════════════════════════════════════════════════════════════

const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_FACEBOOK = process.argv.includes("--skip-facebook");
const LIMIT = parseInt(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "99999",
);
const START_FROM = parseInt(
  process.argv.find((a) => a.startsWith("--start-from="))?.split("=")[1] || "0",
);
const DELAY_MS = parseInt(
  process.argv.find((a) => a.startsWith("--delay="))?.split("=")[1] || "30000",
);

const SITE_URL = "https://aihaberleri.org";
const CHECKPOINT_FILE = "scripts/share-missing-checkpoint.json";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════
// METRICS
// ═══════════════════════════════════════════════════════════════

const metrics = {
  totalArticles: 0,
  processedArticles: 0,
  skippedArticles: 0, // Already fully shared
  shares: {
    BLUESKY: 0,
    BLUESKY_EN: 0,
    MASTODON: 0,
    MASTODON_EN: 0,
    FACEBOOK: 0,
    FACEBOOK_EN: 0,
  } as Record<string, number>,
  failures: {
    BLUESKY: 0,
    BLUESKY_EN: 0,
    MASTODON: 0,
    MASTODON_EN: 0,
    FACEBOOK: 0,
    FACEBOOK_EN: 0,
  } as Record<string, number>,
  errors: [] as string[],
  startTime: Date.now(),
};

// ═══════════════════════════════════════════════════════════════
// BLUESKY CLIENT
// ═══════════════════════════════════════════════════════════════

let bskyAgent: BskyAgent | null = null;

async function getBskyAgent(): Promise<BskyAgent | null> {
  if (bskyAgent) return bskyAgent;
  try {
    const agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({
      identifier: process.env.BLUESKY_HANDLE || "aihaberleri.bsky.social",
      password: process.env.BLUESKY_APP_PASSWORD || "qyme-umhy-ftpe-iiwh",
    });
    bskyAgent = agent;
    return agent;
  } catch (e: any) {
    console.error("❌ Bluesky login failed:", e.message);
    return null;
  }
}

async function shareBluesky(
  title: string,
  slug: string,
  excerpt: string,
  imageUrl: string | null,
  lang: "tr" | "en",
): Promise<string | null> {
  const agent = await getBskyAgent();
  if (!agent) return null;

  const url =
    lang === "en" ? `${SITE_URL}/en/news/${slug}` : `${SITE_URL}/news/${slug}`;
  const tags =
    lang === "en"
      ? "#AI #Tech #ArtificialIntelligence"
      : "#YapayZeka #AI #Teknoloji";

  let text = `📰 ${title}\n\n`;
  const remaining = 300 - text.length - tags.length - 5;
  if (remaining > 50 && excerpt) {
    text += `${excerpt.substring(0, remaining)}...\n\n`;
  }
  text += tags;
  if (text.length > 300) text = text.substring(0, 297) + "...";

  const rt = new RichText({ text });
  await rt.detectFacets(agent);

  let embed: any = undefined;
  try {
    let thumb: any = undefined;
    if (imageUrl) {
      const imgResp = await fetch(imageUrl);
      if (imgResp.ok) {
        const buf = new Uint8Array(await imgResp.arrayBuffer());
        const ct = imgResp.headers.get("content-type") || "image/jpeg";
        const upload = await agent.uploadBlob(buf, { encoding: ct });
        thumb = upload.data.blob;
      }
    }
    embed = {
      $type: "app.bsky.embed.external",
      external: {
        uri: url,
        title: title.substring(0, 100),
        description: (excerpt || "").substring(0, 300),
        ...(thumb && { thumb }),
      },
    };
  } catch {}

  const resp = await agent.post({
    text: rt.text,
    facets: rt.facets,
    ...(embed && { embed }),
    createdAt: new Date().toISOString(),
  });
  return resp.uri;
}

// ═══════════════════════════════════════════════════════════════
// MASTODON CLIENT
// ═══════════════════════════════════════════════════════════════

let mastoClient: any = null;

function getMastoClient() {
  if (mastoClient) return mastoClient;
  mastoClient = createRestAPIClient({
    url: process.env.MASTODON_INSTANCE_URL || "https://mastodon.social",
    accessToken:
      process.env.MASTODON_ACCESS_TOKEN ||
      "zmq8PuaAcst4paWnqDYQZucunG8xC4BNcWe0o2i92P4",
  });
  return mastoClient;
}

async function shareMastodon(
  title: string,
  slug: string,
  excerpt: string,
  imageUrl: string | null,
  lang: "tr" | "en",
): Promise<string | null> {
  const client = getMastoClient();
  const url =
    lang === "en" ? `${SITE_URL}/en/news/${slug}` : `${SITE_URL}/news/${slug}`;
  const tags =
    lang === "en"
      ? "#AI #Technology #MachineLearning #TechNews"
      : "#YapayZeka #AI #Teknoloji #MachineLearning #Haber";

  let text = `📰 ${title}\n\n`;
  const linkAndTags = `\n\n${tags}\n\n🔗 ${url}`;
  const remaining = 500 - text.length - linkAndTags.length;
  if (remaining > 50 && excerpt) {
    text += `${excerpt.substring(0, remaining - 3)}...`;
  }
  text += linkAndTags;
  if (text.length > 500) text = text.substring(0, 497) + "...";

  let mediaIds: string[] = [];
  if (imageUrl) {
    try {
      const imgResp = await fetch(imageUrl);
      if (imgResp.ok) {
        const blob = await imgResp.blob();
        const media = await client.v2.media.create({
          file: blob,
          description: title,
        });
        mediaIds = [media.id];
      }
    } catch {}
  }

  const status = await client.v1.statuses.create({
    status: text,
    visibility: "public",
    language: lang,
    ...(mediaIds.length > 0 && { mediaIds }),
  });
  return status.id;
}

// ═══════════════════════════════════════════════════════════════
// PROGRESS BAR & DISPLAY
// ═══════════════════════════════════════════════════════════════

function progressBar(
  current: number,
  total: number,
  width: number = 40,
): string {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(width * pct);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `[${bar}] ${(pct * 100).toFixed(1)}%`;
}

function elapsed(): string {
  const ms = Date.now() - metrics.startTime;
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function eta(current: number, total: number): string {
  if (current === 0) return "hesaplanıyor...";
  const msPerItem = (Date.now() - metrics.startTime) / current;
  const remaining = (total - current) * msPerItem;
  const s = Math.floor(remaining / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `~${h}h ${m % 60}m`;
  if (m > 0) return `~${m}m ${s % 60}s`;
  return `~${s}s`;
}

function totalShares(): number {
  return Object.values(metrics.shares).reduce((a, b) => a + b, 0);
}

function totalFailures(): number {
  return Object.values(metrics.failures).reduce((a, b) => a + b, 0);
}

function printStatus(articleIndex: number, total: number) {
  console.log("");
  console.log(`  ${progressBar(articleIndex + 1, total)}`);
  console.log(
    `  📊 ${articleIndex + 1}/${total} | ⏱️ ${elapsed()} | ETA: ${eta(articleIndex + 1, total)}`,
  );
  console.log(
    `  ✅ Paylaşım: ${totalShares()} | ❌ Hata: ${totalFailures()} | ⏭️ Atlandı: ${metrics.skippedArticles}`,
  );
  console.log(
    `  🦋 Bsky TR:${metrics.shares.BLUESKY} EN:${metrics.shares.BLUESKY_EN} | 🐘 Masto TR:${metrics.shares.MASTODON} EN:${metrics.shares.MASTODON_EN} | 📘 FB:${metrics.shares.FACEBOOK} EN:${metrics.shares.FACEBOOK_EN}`,
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARE RECORDING
// ═══════════════════════════════════════════════════════════════

async function recordShare(
  articleId: string,
  platform: SocialPlatform,
  language: string,
  success: boolean,
  postId?: string | null,
  error?: string,
) {
  try {
    await prisma.socialShare.upsert({
      where: { articleId_platform_language: { articleId, platform, language } },
      create: {
        articleId,
        platform,
        language,
        status: success ? "SHARED" : "FAILED",
        postId: postId || null,
        sharedAt: success ? new Date() : null,
        error: error || null,
      },
      update: {
        status: success ? "SHARED" : "FAILED",
        postId: success ? postId || null : undefined,
        sharedAt: success ? new Date() : undefined,
        error: error || null,
      },
    });
  } catch {}
}

function saveCheckpoint(index: number, total: number) {
  fs.writeFileSync(
    CHECKPOINT_FILE,
    JSON.stringify(
      { index, total, metrics, timestamp: new Date().toISOString() },
      null,
      2,
    ),
  );
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM SHARE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

interface PlatformCheck {
  platform: SocialPlatform;
  language: string;
  label: string;
  emoji: string;
  shareFn: (
    title: string,
    slug: string,
    excerpt: string,
    imageUrl: string | null,
  ) => Promise<string | null>;
  skip?: boolean;
}

function getPlatformChecks(
  hasEnTranslation: boolean,
  enSlug: string | null,
): PlatformCheck[] {
  const checks: PlatformCheck[] = [
    {
      platform: "BLUESKY",
      language: "tr",
      label: "Bluesky TR",
      emoji: "🦋",
      shareFn: (t, s, e, img) => shareBluesky(t, s, e, img, "tr"),
    },
    {
      platform: "MASTODON",
      language: "tr",
      label: "Mastodon TR",
      emoji: "🐘",
      shareFn: (t, s, e, img) => shareMastodon(t, s, e, img, "tr"),
    },
  ];

  // EN platforms only if translation exists
  if (hasEnTranslation && enSlug) {
    checks.push(
      {
        platform: "BLUESKY_EN",
        language: "en",
        label: "Bluesky EN",
        emoji: "🦋",
        shareFn: (t, s, e, img) => shareBluesky(t, s, e, img, "en"),
      },
      {
        platform: "MASTODON_EN",
        language: "en",
        label: "Mastodon EN",
        emoji: "🐘",
        shareFn: (t, s, e, img) => shareMastodon(t, s, e, img, "en"),
      },
    );
  }

  // Facebook TR — skip by default (all TR already shared from recovery)
  // Facebook EN — token returns 400, skip by default
  // Can be enabled by removing --skip-facebook flag... but both are problematic

  return checks;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║     📤 SOSYAL MEDYA EKSİK PAYLAŞIM KONTROLÜ            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(
    `  ⚙️  Delay: ${DELAY_MS / 1000}s | Limit: ${LIMIT} | DryRun: ${DRY_RUN} | SkipFB: ${SKIP_FACEBOOK}`,
  );
  if (START_FROM > 0) console.log(`  ⏩ Starting from index: ${START_FROM}`);
  console.log("");

  // Step 1: Fetch ALL published TR articles with their EN translations and existing shares
  console.log("📊 Veritabanından tüm makaleler çekiliyor...");

  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      language: "tr",
    },
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      imageUrl: true,
      publishedAt: true,
      translations: {
        where: { locale: "en" },
        select: {
          title: true,
          slug: true,
          excerpt: true,
        },
      },
      socialShares: {
        where: { status: "SHARED" },
        select: {
          platform: true,
          language: true,
        },
      },
    },
    orderBy: { publishedAt: "asc" }, // En eskiden en yeniye
    take: LIMIT,
  });

  metrics.totalArticles = articles.length;
  console.log(`  📰 Toplam makale: ${articles.length}`);
  console.log("");

  // Step 2: Login to platforms
  if (!DRY_RUN) {
    console.log("🔐 Platformlara bağlanılıyor...");
    const bsky = await getBskyAgent();
    if (bsky) console.log("  🦋 Bluesky ✅");
    else console.log("  🦋 Bluesky ❌ (bağlantı başarısız)");

    try {
      getMastoClient();
      console.log("  🐘 Mastodon ✅");
    } catch {
      console.log("  🐘 Mastodon ❌ (bağlantı başarısız)");
    }
    console.log("");
  }

  // Step 3: Process each article
  for (let i = START_FROM; i < articles.length; i++) {
    const article = articles[i];
    const enTranslation = article.translations[0] || null;
    const existingShares = new Set(
      article.socialShares.map((s) => `${s.platform}_${s.language}`),
    );

    // Determine which platforms need sharing
    const platformChecks = getPlatformChecks(
      !!enTranslation,
      enTranslation?.slug || null,
    );
    const missingPlatforms = platformChecks.filter(
      (p) => !existingShares.has(`${p.platform}_${p.language}`),
    );

    // Header for this article
    const shortTitle = article.title.substring(0, 55);
    console.log(
      `\n─── [${i + 1}/${articles.length}] ${shortTitle}${article.title.length > 55 ? "..." : ""} ───`,
    );

    if (missingPlatforms.length === 0) {
      console.log("  ✅ Tüm platformlarda paylaşılmış — atlanıyor");
      metrics.skippedArticles++;
      metrics.processedArticles++;
      // No delay for skipped articles
      continue;
    }

    console.log(
      `  📋 Eksik: ${missingPlatforms.map((p) => p.label).join(", ")}`,
    );

    if (DRY_RUN) {
      console.log(
        `  🔍 [DRY] Paylaşılacak: ${missingPlatforms.map((p) => p.label).join(", ")}`,
      );
      metrics.processedArticles++;
      continue;
    }

    // Share on each missing platform
    for (const platform of missingPlatforms) {
      const isEN = platform.language === "en";
      const shareTitle = isEN
        ? enTranslation?.title || article.title
        : article.title;
      const shareSlug = isEN
        ? enTranslation?.slug || article.slug
        : article.slug;
      const shareExcerpt = isEN
        ? enTranslation?.excerpt || article.excerpt
        : article.excerpt;

      try {
        const postId = await platform.shareFn(
          shareTitle,
          shareSlug,
          shareExcerpt,
          article.imageUrl,
        );
        if (postId) {
          await recordShare(
            article.id,
            platform.platform,
            platform.language,
            true,
            postId,
          );
          metrics.shares[platform.platform]++;
          console.log(`  ${platform.emoji} ${platform.label} ✅`);
        } else {
          console.log(
            `  ${platform.emoji} ${platform.label} ⏭️ (null döndü — platform devre dışı?)`,
          );
        }
      } catch (e: any) {
        await recordShare(
          article.id,
          platform.platform,
          platform.language,
          false,
          null,
          e.message,
        );
        metrics.failures[platform.platform]++;
        metrics.errors.push(
          `[${i + 1}] ${platform.label}: ${e.message?.substring(0, 80)}`,
        );
        console.log(
          `  ${platform.emoji} ${platform.label} ❌ ${e.message?.substring(0, 60)}`,
        );

        // Rate limit — wait extra
        if (e.message?.includes("429") || e.message?.includes("rate limit")) {
          console.log("  ⏳ Rate limit! 60 saniye bekleniyor...");
          await new Promise((r) => setTimeout(r, 60000));
        }
      }
    }

    metrics.processedArticles++;
    saveCheckpoint(i, articles.length);
    printStatus(i, articles.length);

    // Wait between articles (skip delay for last article)
    if (i < articles.length - 1) {
      const nextHasMissing = true; // We'll check next iteration anyway
      if (missingPlatforms.length > 0) {
        process.stdout.write(`  ⏳ ${DELAY_MS / 1000}s bekleniyor...`);
        await new Promise((r) => setTimeout(r, DELAY_MS));
        process.stdout.write(" ✓\n");
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════════════════════════

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║                    📊 SONUÇ RAPORU                      ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  📰 Toplam makale: ${metrics.totalArticles}`);
  console.log(`  ✅ İşlenen: ${metrics.processedArticles}`);
  console.log(`  ⏭️  Atlandı (zaten paylaşılmış): ${metrics.skippedArticles}`);
  console.log(`  ⏱️  Süre: ${elapsed()}`);
  console.log("");
  console.log("  📤 PAYLAŞIMLAR:");
  console.log(
    `    🦋 Bluesky  TR: ${metrics.shares.BLUESKY}  EN: ${metrics.shares.BLUESKY_EN}`,
  );
  console.log(
    `    🐘 Mastodon TR: ${metrics.shares.MASTODON}  EN: ${metrics.shares.MASTODON_EN}`,
  );
  console.log(
    `    📘 Facebook TR: ${metrics.shares.FACEBOOK}  EN: ${metrics.shares.FACEBOOK_EN}`,
  );
  console.log(`    ─────────────────────────`);
  console.log(`    TOPLAM: ${totalShares()} paylaşım, ${totalFailures()} hata`);

  if (metrics.errors.length > 0) {
    console.log(`\n  ❌ HATALAR (${metrics.errors.length}):`);
    metrics.errors.slice(0, 15).forEach((e) => console.log(`    - ${e}`));
    if (metrics.errors.length > 15) {
      console.log(`    ... ve ${metrics.errors.length - 15} hata daha`);
    }
  }

  console.log("");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("💥 Fatal:", e.message);
  prisma.$disconnect();
  process.exit(1);
});
