/**
 * Sync existing social media posts to SocialShare table
 * Bluesky ve Mastodon'dan mevcut postlari ceker,
 * DB'deki makalelerle eslestirir ve SocialShare tablosuna kaydeder.
 * Usage: npx tsx scripts/sync-social-shares.ts [--dry-run]
 */
import { PrismaClient, SocialPlatform } from "@prisma/client";

const DRY_RUN = process.argv.includes("--dry-run");
const prisma = new PrismaClient();
const BLUESKY_HANDLE = "aihaberleri.bsky.social";
const BSKY_API = "https://public.api.bsky.app/xrpc";
const MASTODON_INSTANCE = "https://mastodon.social";
const MASTODON_TOKEN =
  process.env.MASTODON_ACCESS_TOKEN ||
  "zmq8PuaAcst4paWnqDYQZucunG8xC4BNcWe0o2i92P4";
const MASTODON_ACCOUNT_ID = "116021915135387167";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ArticleInfo {
  id: string;
  slug: string;
  title: string;
  enSlug?: string;
}
let articlesBySlug: Map<string, ArticleInfo>;
let articlesByEnSlug: Map<string, ArticleInfo>;

async function loadArticles() {
  const articles = await prisma.$queryRaw<any[]>`
    SELECT a.id, a.slug, a.title, at.slug as "enSlug"
    FROM "Article" a
    LEFT JOIN "ArticleTranslation" at ON at."articleId" = a.id AND at.locale = 'en'
    WHERE a.language = 'tr' AND a.status = 'PUBLISHED'
  `;
  articlesBySlug = new Map();
  articlesByEnSlug = new Map();
  for (const a of articles) {
    const info: ArticleInfo = {
      id: a.id,
      slug: a.slug,
      title: a.title,
      enSlug: a.enSlug,
    };
    articlesBySlug.set(a.slug, info);
    if (a.enSlug) articlesByEnSlug.set(a.enSlug, info);
  }
  console.log(`\u{1F4DA} ${articles.length} makale yuklendi`);
}

function findArticle(slug: string): ArticleInfo | null {
  return articlesBySlug.get(slug) || articlesByEnSlug.get(slug) || null;
}

// Batch insert - cok daha hizli
interface PendingShare {
  articleId: string;
  platform: SocialPlatform;
  language: string;
  postId: string;
  sharedAt: Date;
}

async function batchInsertShares(shares: PendingShare[], label: string) {
  if (DRY_RUN || shares.length === 0) return;
  console.log(`  \u{1F4BE} ${label}: ${shares.length} kayit yaziliyor...`);
  const batchSize = 100;
  for (let i = 0; i < shares.length; i += batchSize) {
    const batch = shares.slice(i, i + batchSize);
    const values = batch
      .map(
        (s) =>
          `('${crypto.randomUUID()}', '${s.articleId}', '${s.platform}', '${s.language}', 'SHARED', '${s.postId.replace(/'/g, "''")}', '${s.sharedAt.toISOString()}', NOW(), NOW())`,
      )
      .join(",\n");
    await prisma.$executeRawUnsafe(`
      INSERT INTO "SocialShare" (id, "articleId", platform, language, status, "postId", "sharedAt", "createdAt", "updatedAt")
      VALUES ${values}
      ON CONFLICT ("articleId", platform, language) DO NOTHING
    `);
  }
  console.log(`  \u2705 ${shares.length} kayit yazildi`);
}

async function syncBluesky() {
  console.log("\n\u{1F98B} Bluesky sync basliyor...");
  let cursor: string | undefined;
  const allPosts: any[] = [];
  while (true) {
    const params = new URLSearchParams({
      actor: BLUESKY_HANDLE,
      limit: "100",
      filter: "posts_no_replies",
    });
    if (cursor) params.append("cursor", cursor);
    const resp = await fetch(
      `${BSKY_API}/app.bsky.feed.getAuthorFeed?${params}`,
    );
    if (!resp.ok) break;
    const data = await resp.json();
    if (!data.feed?.length) break;
    allPosts.push(...data.feed);
    cursor = data.cursor;
    if (!cursor) break;
    await sleep(300);
  }
  console.log(`  \u{1F4E1} ${allPosts.length} post cekildi`);

  const shares: PendingShare[] = [];
  let trMatched = 0,
    enMatched = 0,
    noLink = 0,
    noMatch = 0;

  for (const item of allPosts) {
    const post = item.post;
    if (!post?.record?.text) continue;
    const text = post.record.text as string;
    const createdAt = new Date(post.record.createdAt || post.indexedAt);
    const postUri = post.uri;

    let link: string | null = null;
    if (post.record?.facets) {
      for (const f of post.record.facets) {
        for (const feat of f.features || []) {
          if (feat.uri?.includes("aihaberleri.org")) link = feat.uri;
        }
      }
    }
    if (!link && post.embed?.external?.uri?.includes("aihaberleri.org"))
      link = post.embed.external.uri;
    if (!link && post.record?.embed?.external?.uri?.includes("aihaberleri.org"))
      link = post.record.embed.external.uri;
    if (!link) {
      noLink++;
      continue;
    }

    const isEn = link.includes("/en/") || text.includes("#AINews");
    let slug: string | null = null;
    if (isEn) {
      const m = link.match(/\/en\/(?:news|haberler)\/([a-z0-9-]+)/);
      if (m) slug = m[1];
    } else {
      const m = link.match(/\/news\/([a-z0-9-]+)/);
      if (m) slug = m[1];
    }
    if (!slug) {
      noLink++;
      continue;
    }

    const article = findArticle(slug);
    if (!article) {
      noMatch++;
      continue;
    }

    if (isEn) {
      shares.push({
        articleId: article.id,
        platform: "BLUESKY_EN",
        language: "en",
        postId: postUri,
        sharedAt: createdAt,
      });
      enMatched++;
    } else {
      shares.push({
        articleId: article.id,
        platform: "BLUESKY",
        language: "tr",
        postId: postUri,
        sharedAt: createdAt,
      });
      trMatched++;
    }
  }

  await batchInsertShares(shares, "Bluesky");
  console.log(`  \u2705 Bluesky TR eslesen: ${trMatched}`);
  console.log(`  \u2705 Bluesky EN eslesen: ${enMatched}`);
  console.log(`  \u26A0\uFE0F  Link yok: ${noLink} | Eslesmeyen: ${noMatch}`);
  return { trMatched, enMatched, noMatch };
}

async function syncMastodon() {
  console.log("\n\u{1F418} Mastodon sync basliyor...");
  const allStatuses: any[] = [];
  let maxId: string | undefined;
  while (true) {
    let url = `${MASTODON_INSTANCE}/api/v1/accounts/${MASTODON_ACCOUNT_ID}/statuses?limit=40&exclude_replies=true&exclude_reblogs=true`;
    if (maxId) url += `&max_id=${maxId}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${MASTODON_TOKEN}` },
    });
    if (!resp.ok) break;
    const statuses = await resp.json();
    if (!Array.isArray(statuses) || statuses.length === 0) break;
    allStatuses.push(...statuses);
    maxId = statuses[statuses.length - 1].id;
    await sleep(300);
  }
  console.log(`  \u{1F4E1} ${allStatuses.length} post cekildi`);

  const shares: PendingShare[] = [];
  let trMatched = 0,
    enMatched = 0,
    noLink = 0,
    noMatch = 0;

  for (const status of allStatuses) {
    const html = status.content || "";
    const createdAt = new Date(status.created_at);
    const statusId = status.id;
    const linkRegex = /href="(https?:\/\/aihaberleri\.org[^"]+)"/g;
    let match;
    let link: string | null = null;
    while ((match = linkRegex.exec(html)) !== null) {
      link = match[1];
    }
    if (!link) {
      noLink++;
      continue;
    }

    const isEn = link.includes("/en/");
    let slug: string | null = null;
    if (isEn) {
      const m = link.match(/\/en\/(?:news|haberler)\/([a-z0-9-]+)/);
      if (m) slug = m[1];
    } else {
      const m = link.match(/\/news\/([a-z0-9-]+)/);
      if (m) slug = m[1];
    }
    if (!slug) {
      noLink++;
      continue;
    }

    const article = findArticle(slug);
    if (!article) {
      noMatch++;
      continue;
    }

    if (isEn) {
      shares.push({
        articleId: article.id,
        platform: "MASTODON_EN",
        language: "en",
        postId: statusId,
        sharedAt: createdAt,
      });
      enMatched++;
    } else {
      shares.push({
        articleId: article.id,
        platform: "MASTODON",
        language: "tr",
        postId: statusId,
        sharedAt: createdAt,
      });
      trMatched++;
    }
  }

  await batchInsertShares(shares, "Mastodon");
  console.log(`  \u2705 Mastodon TR eslesen: ${trMatched}`);
  console.log(`  \u2705 Mastodon EN eslesen: ${enMatched}`);
  console.log(`  \u26A0\uFE0F  Link yok: ${noLink} | Eslesmeyen: ${noMatch}`);
  return { trMatched, enMatched, noMatch };
}

async function syncFacebookTr() {
  console.log("\n\u{1F4D8} Facebook TR sync...");
  const fs = await import("fs");
  if (!fs.existsSync("scripts/recovered-articles.json")) {
    console.log("  recovered-articles.json bulunamadi");
    return { matched: 0 };
  }
  const fbData = JSON.parse(
    fs.readFileSync("scripts/recovered-articles.json", "utf-8"),
  );
  const shares: PendingShare[] = [];
  let matched = 0;
  for (const item of fbData) {
    const article = articlesBySlug.get(item.slug);
    if (!article) continue;
    shares.push({
      articleId: article.id,
      platform: "FACEBOOK",
      language: "tr",
      postId: `fb-recovered-${item.slug}`,
      sharedAt: new Date("2025-01-28"),
    });
    matched++;
  }
  await batchInsertShares(shares, "Facebook TR");
  console.log(`  \u2705 Facebook TR eslesen: ${matched} / ${fbData.length}`);
  return { matched };
}

async function main() {
  console.log("\u{1F504} Social Share Sync");
  console.log(`   DryRun: ${DRY_RUN}`);
  console.log("=".repeat(60));
  await loadArticles();

  const bsky = await syncBluesky();
  const masto = await syncMastodon();
  const fb = await syncFacebookTr();

  console.log("\n" + "=".repeat(60));
  console.log("\u{1F4CA} SYNC SONUCLARI:");
  console.log(
    `  Bluesky  -> TR: ${bsky.trMatched} | EN: ${bsky.enMatched} | Eslesmeyen: ${bsky.noMatch}`,
  );
  console.log(
    `  Mastodon -> TR: ${masto.trMatched} | EN: ${masto.enMatched} | Eslesmeyen: ${masto.noMatch}`,
  );
  console.log(`  Facebook -> TR: ${fb.matched}`);

  if (!DRY_RUN) {
    const remaining = await prisma.$queryRaw<any[]>`
      SELECT
        (SELECT COUNT(*) FROM "Article" a WHERE a.language='tr' AND a.status='PUBLISHED'
         AND NOT EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId"=a.id AND ss.platform='BLUESKY' AND ss.status='SHARED')
        ) as bsky_tr,
        (SELECT COUNT(*) FROM "Article" a WHERE a.language='tr' AND a.status='PUBLISHED'
         AND NOT EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId"=a.id AND ss.platform='MASTODON' AND ss.status='SHARED')
        ) as masto_tr,
        (SELECT COUNT(*) FROM "Article" a JOIN "ArticleTranslation" at ON at."articleId"=a.id AND at.locale='en'
         WHERE a.language='tr' AND a.status='PUBLISHED'
         AND NOT EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId"=a.id AND ss.platform='BLUESKY_EN' AND ss.status='SHARED')
        ) as bsky_en,
        (SELECT COUNT(*) FROM "Article" a JOIN "ArticleTranslation" at ON at."articleId"=a.id AND at.locale='en'
         WHERE a.language='tr' AND a.status='PUBLISHED'
         AND NOT EXISTS (SELECT 1 FROM "SocialShare" ss WHERE ss."articleId"=a.id AND ss.platform='MASTODON_EN' AND ss.status='SHARED')
        ) as masto_en
    `;
    const r = remaining[0];
    console.log("\nPAYLASILMAMIS KALAN:");
    console.log(`  Bluesky  TR: ${r.bsky_tr} | EN: ${r.bsky_en}`);
    console.log(`  Mastodon TR: ${r.masto_tr} | EN: ${r.masto_en}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  prisma.$disconnect();
  process.exit(1);
});
