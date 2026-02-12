/**
 * Batch Social Media Sharing + IndexNow + SEO Notifications
 *
 * Paylaşılmamış TR ve EN makaleleri sosyal medyada paylaşır ve
 * arama motorlarına bildirir.
 *
 * Flow:
 * 1. SocialShare tablosunda SHARED kaydı olmayan makaleleri bul
 * 2. Bluesky, Mastodon, Facebook'a paylaş (TR + EN)
 * 3. IndexNow batch submit (Bing, Yandex)
 * 4. WebSub, Ping-o-Matic, Cloudflare purge
 * 5. SocialShare tablosuna kaydet
 *
 * Usage: npx tsx scripts/batch-share-and-index.ts
 *   --lang=tr|en|all   Dil filtresi (default: all)
 *   --limit=N          Maksimum makale (default: 50)
 *   --delay=N          Paylaşımlar arası ms (default: 3000)
 *   --dry-run          Önizleme
 *   --skip-social      Sadece indexing yap
 *   --skip-index       Sadece social paylaş
 */

import { PrismaClient, SocialPlatform } from "@prisma/client";
import { BskyAgent, RichText } from "@atproto/api";
import { createRestAPIClient } from "masto";
import axios from "axios";
import * as fs from "fs";

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════

const LANG =
  process.argv.find((a) => a.startsWith("--lang="))?.split("=")[1] || "all";
const LIMIT = parseInt(
  process.argv.find((a) => a.startsWith("--limit="))?.split("=")[1] || "50",
);
const DELAY = parseInt(
  process.argv.find((a) => a.startsWith("--delay="))?.split("=")[1] || "3000",
);
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_SOCIAL = process.argv.includes("--skip-social");
const SKIP_INDEX = process.argv.includes("--skip-index");
const SKIP_FACEBOOK = process.argv.includes("--skip-facebook");

const SITE_URL = "https://aihaberleri.org";
const CHECKPOINT_FILE = "scripts/batch-share-checkpoint.json";

const prisma = new PrismaClient();
const stats = {
  tr: { bluesky: 0, mastodon: 0, facebook: 0, indexed: 0, failed: 0 },
  en: { bluesky: 0, mastodon: 0, facebook: 0, indexed: 0, failed: 0 },
  errors: [] as string[],
};

// ═══════════════════════════════════════════════════════════════
// BLUESKY
// ═══════════════════════════════════════════════════════════════

let bskyAgent: BskyAgent | null = null;

async function getBskyAgent(): Promise<BskyAgent | null> {
  if (bskyAgent) return bskyAgent;
  const handle = process.env.BLUESKY_HANDLE || "aihaberleri.bsky.social";
  const password = process.env.BLUESKY_APP_PASSWORD || "qyme-umhy-ftpe-iiwh";
  try {
    const agent = new BskyAgent({ service: "https://bsky.social" });
    await agent.login({ identifier: handle, password });
    bskyAgent = agent;
    console.log("🦋 Bluesky oturum açıldı");
    return agent;
  } catch (e: any) {
    console.error("❌ Bluesky login:", e.message);
    return null;
  }
}

async function postBluesky(
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
      ? "#AI #Tech #ArtificialIntelligence #News"
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

  // Link card embed
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
// MASTODON
// ═══════════════════════════════════════════════════════════════

let mastoClient: any = null;

function getMastoClient() {
  if (mastoClient) return mastoClient;
  const instanceUrl =
    process.env.MASTODON_INSTANCE_URL || "https://mastodon.social";
  const token =
    process.env.MASTODON_ACCESS_TOKEN ||
    "zmq8PuaAcst4paWnqDYQZucunG8xC4BNcWe0o2i92P4";
  mastoClient = createRestAPIClient({ url: instanceUrl, accessToken: token });
  console.log("🐘 Mastodon client oluşturuldu");
  return mastoClient;
}

async function postMastodon(
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
// FACEBOOK
// ═══════════════════════════════════════════════════════════════

const FB_GRAPH = "https://graph.facebook.com/v18.0";

async function postFacebook(
  title: string,
  slug: string,
  excerpt: string,
  imageUrl: string | null,
  lang: "tr" | "en",
): Promise<string | null> {
  const pageId =
    lang === "en"
      ? process.env.FACEBOOK_EN_PAGE_ID || "982113784986233"
      : process.env.FACEBOOK_PAGE_ID || "882602408279863";
  const token =
    lang === "en"
      ? process.env.FACEBOOK_EN_PAGE_ACCESS_TOKEN || ""
      : process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";

  if (!pageId || !token) return null;

  const url =
    lang === "en" ? `${SITE_URL}/en/news/${slug}` : `${SITE_URL}/news/${slug}`;
  const hashtags =
    lang === "en"
      ? "#AI #ArtificialIntelligence #Tech"
      : "#YapayZeka #AI #Teknoloji";

  // Photo post if image available (better engagement)
  if (imageUrl) {
    const caption = `📰 ${title}\n\n${excerpt}\n\n${hashtags}\n\n🔗 ${url}`;
    const resp = await axios.post(`${FB_GRAPH}/${pageId}/photos`, {
      url: imageUrl,
      caption,
      access_token: token,
    });
    return resp.data.id;
  } else {
    const message = `📰 ${title}\n\n${excerpt}\n\n${hashtags}\n\n🔗 ${url}`;
    const resp = await axios.post(`${FB_GRAPH}/${pageId}/feed`, {
      message,
      access_token: token,
    });
    return resp.data.id;
  }
}

// ═══════════════════════════════════════════════════════════════
// INDEXNOW
// ═══════════════════════════════════════════════════════════════

const INDEXNOW_ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
  "https://yandex.com/indexnow",
];

async function submitIndexNow(urls: string[]): Promise<boolean> {
  if (urls.length === 0) return false;
  // Get or generate key
  let apiKey: string;
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: "indexnow_api_key" },
    });
    apiKey = setting?.value || crypto.randomUUID();
  } catch {
    apiKey = crypto.randomUUID();
  }

  const host = "aihaberleri.org";
  const payload = {
    host,
    key: apiKey,
    keyLocation: `${SITE_URL}/${apiKey}.txt`,
    urlList: urls.slice(0, 10000),
  };

  const results = await Promise.allSettled(
    INDEXNOW_ENDPOINTS.map((ep) =>
      fetch(ep, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      }),
    ),
  );

  const ok = results.some(
    (r) =>
      r.status === "fulfilled" &&
      (r.value.status === 200 || r.value.status === 202),
  );
  if (ok) console.log(`✅ IndexNow: ${urls.length} URL gönderildi`);
  else console.warn(`⚠️ IndexNow: ${urls.length} URL gönderilemedi`);
  return ok;
}

// ═══════════════════════════════════════════════════════════════
// WEBSUB + PING-O-MATIC
// ═══════════════════════════════════════════════════════════════

async function notifyWebSub(): Promise<boolean> {
  const feedUrl = `${SITE_URL}/feed.xml`;
  const hubs = [
    "https://pubsubhubbub.appspot.com/",
    "https://pubsubhubbub.superfeedr.com/",
  ];
  for (const hub of hubs) {
    try {
      const form = new URLSearchParams();
      form.append("hub.mode", "publish");
      form.append("hub.url", feedUrl);
      const resp = await fetch(hub, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });
      if (resp.ok || resp.status === 204) {
        console.log(`✅ WebSub: ${hub}`);
        return true;
      }
    } catch {}
  }
  return false;
}

async function pingOMatic(): Promise<boolean> {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<methodCall>
  <methodName>weblogUpdates.extendedPing</methodName>
  <params>
    <param><value><string>AI Haberleri</string></value></param>
    <param><value><string>${SITE_URL}</string></value></param>
    <param><value><string>${SITE_URL}</string></value></param>
    <param><value><string>${SITE_URL}/feed.xml</string></value></param>
  </params>
</methodCall>`;
  try {
    const resp = await fetch("https://rpc.pingomatic.com/", {
      method: "POST",
      headers: { "Content-Type": "text/xml", "User-Agent": "AIHaberleri/1.0" },
      body: xml,
    });
    if (resp.ok) {
      console.log("✅ Ping-o-Matic: 20+ servise bildirildi");
      return true;
    }
  } catch {}
  return false;
}

// ═══════════════════════════════════════════════════════════════
// SHARE TRACKING
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
// ═══════════════════════════════════════════════════════════════
// PROCESS ARTICLE
// ═══════════════════════════════════════════════════════════════

async function processArticle(
  article: {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    imageUrl: string | null;
    bskyDone?: boolean;
    mastoDone?: boolean;
  },
  lang: "tr" | "en",
  enSlug?: string,
  index?: number,
  total?: number,
) {
  const label = `[${(index || 0) + 1}/${total || "?"}]`;
  const shareSlug = lang === "en" ? enSlug || article.slug : article.slug;
  const shareTitle = article.title;
  const shareExcerpt = article.excerpt || "";
  const shareImage = article.imageUrl;

  console.log(
    `${label} 📤 ${lang.toUpperCase()} ${shareTitle.substring(0, 55)}...`,
  );

  if (DRY_RUN) {
    console.log(`${label} ✅ [DRY] Would share to Bluesky, Mastodon, Facebook`);
    return;
  }

  if (!SKIP_SOCIAL) {
    // Bluesky
    const bskyPlatform: SocialPlatform =
      lang === "en" ? "BLUESKY_EN" : "BLUESKY";
    if (article.bskyDone) {
      console.log(`${label}   🦋 Bluesky ⏭️ zaten paylaşılmış`);
    } else {
      try {
        const bskyId = await postBluesky(
          shareTitle,
          shareSlug,
          shareExcerpt,
          shareImage,
          lang,
        );
        if (bskyId) {
          await recordShare(article.id, bskyPlatform, lang, true, bskyId);
          stats[lang].bluesky++;
          console.log(`${label}   🦋 Bluesky ✅`);
        }
      } catch (e: any) {
        await recordShare(
          article.id,
          bskyPlatform,
          lang,
          false,
          null,
          e.message,
        );
        stats.errors.push(`${shareSlug}: Bluesky ${e.message}`);
        console.log(`${label}   🦋 Bluesky ❌ ${e.message}`);
      }
    }

    // Mastodon
    const mastoPlatform: SocialPlatform =
      lang === "en" ? "MASTODON_EN" : "MASTODON";
    if (article.mastoDone) {
      console.log(`${label}   🐘 Mastodon ⏭️ zaten paylaşılmış`);
    } else {
      try {
        const mastoId = await postMastodon(
          shareTitle,
          shareSlug,
          shareExcerpt,
          shareImage,
          lang,
        );
        if (mastoId) {
          await recordShare(article.id, mastoPlatform, lang, true, mastoId);
          stats[lang].mastodon++;
          console.log(`${label}   🐘 Mastodon ✅`);
        }
      } catch (e: any) {
        await recordShare(
          article.id,
          mastoPlatform,
          lang,
          false,
          null,
          e.message,
        );
        stats.errors.push(`${shareSlug}: Mastodon ${e.message}`);
        console.log(`${label}   🐘 Mastodon ❌ ${e.message}`);
      }
    }

    // Facebook
    if (!SKIP_FACEBOOK) {
      const fbPlatform: SocialPlatform =
        lang === "en" ? "FACEBOOK_EN" : "FACEBOOK";
      try {
        const fbId = await postFacebook(
          shareTitle,
          shareSlug,
          shareExcerpt,
          shareImage,
          lang,
        );
        if (fbId) {
          await recordShare(article.id, fbPlatform, lang, true, fbId);
          stats[lang].facebook++;
          console.log(`${label}   📘 Facebook ✅`);
        }
      } catch (e: any) {
        await recordShare(article.id, fbPlatform, lang, false, null, e.message);
        stats.errors.push(`${shareSlug}: Facebook ${e.message}`);
        console.log(`${label}   📘 Facebook ❌ ${e.message}`);
      }
    }
  }
}

function saveCheckpoint(data: any) {
  fs.writeFileSync(
    CHECKPOINT_FILE,
    JSON.stringify(
      { ...data, stats, timestamp: new Date().toISOString() },
      null,
      2,
    ),
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log("🚀 Batch Social Share + Indexing");
  console.log(
    `⚙️  Lang: ${LANG} | Limit: ${LIMIT} | Delay: ${DELAY}ms | DryRun: ${DRY_RUN}`,
  );
  console.log(`   SkipSocial: ${SKIP_SOCIAL} | SkipIndex: ${SKIP_INDEX}`);
  console.log("=".repeat(60));

  const allUrls: string[] = [];

  // ─── TR ARTICLES ───
  if (LANG === "all" || LANG === "tr") {
    // TR articles not yet shared to Bluesky OR Mastodon
    const trArticles = await prisma.$queryRaw<any[]>`
      SELECT a.id, a.slug, a.title, a.excerpt, a."imageUrl",
        EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId" = a.id AND ss.platform = 'BLUESKY' AND ss.language = 'tr' AND ss.status = 'SHARED') as "bskyDone",
        EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId" = a.id AND ss.platform = 'MASTODON' AND ss.language = 'tr' AND ss.status = 'SHARED') as "mastoDone"
      FROM "Article" a
      WHERE a.language = 'tr' AND a.status = 'PUBLISHED'
      AND (
        NOT EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId" = a.id AND ss.platform = 'BLUESKY' AND ss.language = 'tr' AND ss.status = 'SHARED')
        OR NOT EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId" = a.id AND ss.platform = 'MASTODON' AND ss.language = 'tr' AND ss.status = 'SHARED')
      )
      ORDER BY a."publishedAt" DESC
      LIMIT ${LIMIT}
    `;

    console.log(`\n📰 TR paylaşılmamış: ${trArticles.length}`);

    for (let i = 0; i < trArticles.length; i++) {
      await processArticle(
        trArticles[i],
        "tr",
        undefined,
        i,
        trArticles.length,
      );
      allUrls.push(`${SITE_URL}/news/${trArticles[i].slug}`);
      saveCheckpoint({ phase: "tr", index: i + 1, total: trArticles.length });
      if (i < trArticles.length - 1)
        await new Promise((r) => setTimeout(r, DELAY));
    }
  }

  // ─── EN ARTICLES ───
  if (LANG === "all" || LANG === "en") {
    // EN translations not yet shared to Bluesky EN OR Mastodon EN
    const enArticles = await prisma.$queryRaw<any[]>`
      SELECT a.id, a.slug, a.title, a.excerpt, a."imageUrl",
             at.slug as "enSlug", at.title as "enTitle", at.excerpt as "enExcerpt",
        EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId" = a.id AND ss.platform = 'BLUESKY_EN' AND ss.language = 'en' AND ss.status = 'SHARED') as "bskyDone",
        EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId" = a.id AND ss.platform = 'MASTODON_EN' AND ss.language = 'en' AND ss.status = 'SHARED') as "mastoDone"
      FROM "Article" a
      JOIN "ArticleTranslation" at ON at."articleId" = a.id AND at.locale = 'en'
      WHERE a.language = 'tr' AND a.status = 'PUBLISHED'
      AND (
        NOT EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId" = a.id AND ss.platform = 'BLUESKY_EN' AND ss.language = 'en' AND ss.status = 'SHARED')
        OR NOT EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId" = a.id AND ss.platform = 'MASTODON_EN' AND ss.language = 'en' AND ss.status = 'SHARED')
      )
      ORDER BY a."publishedAt" DESC
      LIMIT ${LIMIT}
    `;

    console.log(`\n🌐 EN paylaşılmamış: ${enArticles.length}`);

    for (let i = 0; i < enArticles.length; i++) {
      const art = enArticles[i];
      // Use EN title/excerpt for sharing
      const enArticle = {
        id: art.id,
        slug: art.slug,
        title: art.enTitle || art.title,
        excerpt: art.enExcerpt || art.excerpt,
        imageUrl: art.imageUrl,
        bskyDone: art.bskyDone,
        mastoDone: art.mastoDone,
      };
      await processArticle(enArticle, "en", art.enSlug, i, enArticles.length);
      allUrls.push(`${SITE_URL}/en/news/${art.enSlug}`);
      saveCheckpoint({ phase: "en", index: i + 1, total: enArticles.length });
      if (i < enArticles.length - 1)
        await new Promise((r) => setTimeout(r, DELAY));
    }
  }

  // ─── INDEXING ───
  if (!SKIP_INDEX && allUrls.length > 0 && !DRY_RUN) {
    console.log(`\n🔍 SEO Indexing: ${allUrls.length} URL`);

    // IndexNow batch
    await submitIndexNow(allUrls);

    // WebSub + Ping-o-Matic (paralel)
    await Promise.allSettled([notifyWebSub(), pingOMatic()]);

    // Sitemap ping
    try {
      const sitemapUrl = encodeURIComponent(`${SITE_URL}/sitemap.xml`);
      await Promise.allSettled([
        fetch(`https://www.bing.com/ping?sitemap=${sitemapUrl}`, {
          signal: AbortSignal.timeout(10000),
        }),
      ]);
      console.log("✅ Sitemap ping gönderildi");
    } catch {}
  }

  // ─── SUMMARY ───
  console.log("\n" + "=".repeat(60));
  console.log("📊 SONUÇLAR:");
  console.log(
    `  TR → Bluesky: ${stats.tr.bluesky} | Mastodon: ${stats.tr.mastodon} | Facebook: ${stats.tr.facebook}`,
  );
  console.log(
    `  EN → Bluesky: ${stats.en.bluesky} | Mastodon: ${stats.en.mastodon} | Facebook: ${stats.en.facebook}`,
  );
  console.log(`  🔍 Indexed URLs: ${allUrls.length}`);

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
