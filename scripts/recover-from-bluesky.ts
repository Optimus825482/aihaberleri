/**
 * Recover EN articles from Bluesky (aihaberleri.bsky.social)
 *
 * Bluesky public API ile tüm postları çeker, EN olanları filtreler,
 * slug + başlık + tarih + link çıkarır.
 *
 * Usage: npx tsx scripts/recover-from-bluesky.ts
 */

import * as fs from "fs";

const BLUESKY_HANDLE = "aihaberleri.bsky.social";
const API_BASE = "https://public.api.bsky.app/xrpc";
const OUTPUT_FILE = "scripts/recovered-articles-bluesky-en.json";
const LIMIT_PER_PAGE = 100; // max allowed by API

interface BlueskyPost {
  text: string;
  createdAt: string;
  uri: string;
  link?: string;
  embed?: any;
  facets?: any[];
}

interface RecoveredArticle {
  slug: string;
  title: string;
  date: string;
  link: string;
  source: "bluesky";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Extract article link from post facets or embed
 */
function extractLink(post: any): string | null {
  // Check facets for links
  if (post.record?.facets) {
    for (const facet of post.record.facets) {
      for (const feature of facet.features || []) {
        if (feature.$type === "app.bsky.richtext.facet#link" && feature.uri) {
          if (feature.uri.includes("aihaberleri.org")) {
            return feature.uri;
          }
        }
      }
    }
  }

  // Check embed for external link
  if (post.record?.embed?.$type === "app.bsky.embed.external") {
    const uri = post.record.embed.external?.uri;
    if (uri && uri.includes("aihaberleri.org")) {
      return uri;
    }
  }

  // Check resolved embed
  if (post.embed?.$type === "app.bsky.embed.external#view") {
    const uri = post.embed.external?.uri;
    if (uri && uri.includes("aihaberleri.org")) {
      return uri;
    }
  }

  return null;
}

/**
 * Extract slug from aihaberleri.org link
 * e.g. https://aihaberleri.org/en/news/some-slug → some-slug
 */
function extractSlug(link: string): string | null {
  // EN: /en/news/slug or /en/haberler/slug
  const enMatch = link.match(/\/en\/(?:news|haberler)\/([a-z0-9-]+)/);
  if (enMatch) return enMatch[1];

  // Fallback: last path segment
  const url = new URL(link);
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length > 0) {
    return segments[segments.length - 1];
  }
  return null;
}

/**
 * Detect if post is English
 */
function isEnglishPost(text: string): boolean {
  // EN posts use #AINews tag
  if (text.includes("#AINews")) return true;

  // Check for common English patterns
  const enIndicators = [
    /\b(the|and|for|with|has|have|from|that|this|will|are|was|been|its|new|can)\b/gi,
  ];

  const matches = enIndicators.reduce((count, regex) => {
    const found = text.match(regex);
    return count + (found ? found.length : 0);
  }, 0);

  // If 3+ common English words found, likely English
  return matches >= 3;
}

/**
 * Extract title from post text (first line after emoji)
 */
function extractTitle(text: string): string {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "";

  let title = lines[0];
  // Remove leading emoji
  title = title.replace(
    /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]+\s*/u,
    "",
  );
  // Remove hashtags
  title = title.replace(/#\w+/g, "").trim();
  return title;
}

async function fetchAllPosts(): Promise<any[]> {
  const allPosts: any[] = [];
  let cursor: string | undefined;
  let page = 0;

  console.log(`📡 Bluesky'dan postlar çekiliyor: @${BLUESKY_HANDLE}`);
  console.log("=".repeat(60));

  while (true) {
    page++;
    const params = new URLSearchParams({
      actor: BLUESKY_HANDLE,
      limit: LIMIT_PER_PAGE.toString(),
      filter: "posts_no_replies",
    });
    if (cursor) params.append("cursor", cursor);

    const url = `${API_BASE}/app.bsky.feed.getAuthorFeed?${params.toString()}`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        console.error(`❌ API error: ${resp.status} ${resp.statusText}`);
        break;
      }

      const data = await resp.json();
      const posts = data.feed || [];

      if (posts.length === 0) {
        console.log(`📄 Sayfa ${page}: boş — tamamlandı`);
        break;
      }

      allPosts.push(...posts);
      console.log(
        `📄 Sayfa ${page}: ${posts.length} post (toplam: ${allPosts.length})`,
      );

      cursor = data.cursor;
      if (!cursor) break;

      // Rate limit: be nice to the API
      await sleep(500);
    } catch (e: any) {
      console.error(`❌ Fetch error: ${e.message}`);
      break;
    }
  }

  console.log(`\n📊 Toplam çekilen post: ${allPosts.length}`);
  return allPosts;
}

async function main() {
  console.log("🦋 Bluesky EN Article Recovery");
  console.log("=".repeat(60));

  const allPosts = await fetchAllPosts();

  // Filter EN posts with links
  const enArticles: RecoveredArticle[] = [];
  const seenSlugs = new Set<string>();
  let trCount = 0;
  let noLinkCount = 0;
  let duplicateCount = 0;

  for (const item of allPosts) {
    const post = item.post;
    if (!post?.record?.text) continue;

    const text = post.record.text;

    // Skip TR posts
    if (!isEnglishPost(text)) {
      trCount++;
      continue;
    }

    // Extract link
    const link = extractLink(post);
    if (!link) {
      noLinkCount++;
      continue;
    }

    // Extract slug
    const slug = extractSlug(link);
    if (!slug) {
      noLinkCount++;
      continue;
    }

    // Deduplicate
    if (seenSlugs.has(slug)) {
      duplicateCount++;
      continue;
    }
    seenSlugs.add(slug);

    // Extract title
    const title = extractTitle(text);
    const date = post.record.createdAt || post.indexedAt || "";

    enArticles.push({
      slug,
      title,
      date,
      link,
      source: "bluesky",
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 SONUÇLAR:");
  console.log(`  📝 Toplam post: ${allPosts.length}`);
  console.log(`  🇬🇧 EN makale: ${enArticles.length}`);
  console.log(`  🇹🇷 TR (atlandı): ${trCount}`);
  console.log(`  🔗 Link yok (atlandı): ${noLinkCount}`);
  console.log(`  🔄 Duplikat (atlandı): ${duplicateCount}`);

  // Save
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enArticles, null, 2));
  console.log(`\n💾 Kaydedildi: ${OUTPUT_FILE}`);

  // Show first 5 samples
  console.log("\n📋 İlk 5 örnek:");
  enArticles.slice(0, 5).forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.title.substring(0, 70)}`);
    console.log(`     slug: ${a.slug}`);
    console.log(`     link: ${a.link}`);
  });

  // Compare with existing Facebook EN data
  if (fs.existsSync("scripts/recovered-articles-en.json")) {
    const fbData = JSON.parse(
      fs.readFileSync("scripts/recovered-articles-en.json", "utf-8"),
    );
    const fbSlugs = new Set(fbData.map((a: any) => a.slug));

    const newSlugs = enArticles.filter((a) => !fbSlugs.has(a.slug));
    const overlapSlugs = enArticles.filter((a) => fbSlugs.has(a.slug));

    console.log("\n📊 Facebook karşılaştırma:");
    console.log(`  📘 Facebook'ta var: ${overlapSlugs.length}`);
    console.log(`  🆕 Sadece Bluesky'da: ${newSlugs.length}`);
    console.log(`  📘 Facebook toplam: ${fbData.length}`);

    if (newSlugs.length > 0) {
      console.log("\n🆕 Bluesky'da olup Facebook'ta olmayan ilk 10:");
      newSlugs.slice(0, 10).forEach((a, i) => {
        console.log(`  ${i + 1}. ${a.slug}`);
      });
    }
  }
}

main().catch((e) => {
  console.error("💥 Fatal:", e.message);
  process.exit(1);
});
