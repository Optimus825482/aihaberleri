/**
 * Recover EN articles from Mastodon (@aihaberleri@mastodon.social)
 *
 * Usage: npx tsx scripts/recover-from-mastodon.ts
 */

import * as fs from "fs";

const MASTODON_INSTANCE = "https://mastodon.social";
const MASTODON_TOKEN = "zmq8PuaAcst4paWnqDYQZucunG8xC4BNcWe0o2i92P4";
const ACCOUNT_ID = "116021915135387167";
const OUTPUT_FILE = "scripts/recovered-articles-mastodon-en.json";
const LIMIT_PER_PAGE = 40; // Mastodon max

interface RecoveredArticle {
  slug: string;
  title: string;
  date: string;
  link: string;
  source: "mastodon";
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Extract aihaberleri.org links from HTML content
 */
function extractLinks(html: string): string[] {
  const links: string[] = [];
  const regex = /href="(https?:\/\/aihaberleri\.org[^"]+)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }
  return links;
}

/**
 * Extract slug from link
 */
function extractSlug(link: string): string | null {
  const enMatch = link.match(/\/en\/(?:news|haberler)\/([a-z0-9-]+)/);
  if (enMatch) return enMatch[1];
  const url = new URL(link);
  const segments = url.pathname.split("/").filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : null;
}

/**
 * Strip HTML tags and extract plain text
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Detect if post is English
 */
function isEnglishPost(text: string): boolean {
  if (text.includes("#AINews")) return true;
  const enWords = text.match(
    /\b(the|and|for|with|has|have|from|that|this|will|are|was|been|its|new|can|not|but|all|into|more|how|what|why)\b/gi,
  );
  return (enWords?.length || 0) >= 3;
}

/**
 * Extract title from text (first meaningful line)
 */
function extractTitle(text: string): string {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return "";
  let title = lines[0];
  title = title.replace(
    /^[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}]+\s*/u,
    "",
  );
  title = title.replace(/#\w+/g, "").trim();
  return title;
}

async function fetchAllStatuses(): Promise<any[]> {
  const allStatuses: any[] = [];
  let maxId: string | undefined;
  let page = 0;

  console.log(
    `📡 Mastodon'dan postlar çekiliyor: @aihaberleri@mastodon.social`,
  );
  console.log("=".repeat(60));

  while (true) {
    page++;
    let url = `${MASTODON_INSTANCE}/api/v1/accounts/${ACCOUNT_ID}/statuses?limit=${LIMIT_PER_PAGE}&exclude_replies=true&exclude_reblogs=true`;
    if (maxId) url += `&max_id=${maxId}`;

    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${MASTODON_TOKEN}` },
      });

      if (!resp.ok) {
        console.error(`❌ API error: ${resp.status} ${resp.statusText}`);
        break;
      }

      const statuses = await resp.json();
      if (!Array.isArray(statuses) || statuses.length === 0) {
        console.log(`📄 Sayfa ${page}: boş — tamamlandı`);
        break;
      }

      allStatuses.push(...statuses);
      console.log(
        `📄 Sayfa ${page}: ${statuses.length} post (toplam: ${allStatuses.length})`,
      );

      // Pagination: use last status ID
      maxId = statuses[statuses.length - 1].id;
      await sleep(300);
    } catch (e: any) {
      console.error(`❌ Fetch error: ${e.message}`);
      break;
    }
  }

  console.log(`\n📊 Toplam çekilen post: ${allStatuses.length}`);
  return allStatuses;
}

async function main() {
  console.log("🐘 Mastodon EN Article Recovery");
  console.log("=".repeat(60));

  const allStatuses = await fetchAllStatuses();

  const enArticles: RecoveredArticle[] = [];
  const seenSlugs = new Set<string>();
  let trCount = 0;
  let noLinkCount = 0;
  let duplicateCount = 0;

  for (const status of allStatuses) {
    const html = status.content || "";
    const plainText = stripHtml(html);

    if (!isEnglishPost(plainText)) {
      trCount++;
      continue;
    }

    const links = extractLinks(html);
    const enLink = links.find(
      (l) => l.includes("/en/") || l.includes("aihaberleri.org"),
    );
    if (!enLink) {
      noLinkCount++;
      continue;
    }

    const slug = extractSlug(enLink);
    if (!slug) {
      noLinkCount++;
      continue;
    }

    if (seenSlugs.has(slug)) {
      duplicateCount++;
      continue;
    }
    seenSlugs.add(slug);

    const title = extractTitle(plainText);
    enArticles.push({
      slug,
      title,
      date: status.created_at || "",
      link: enLink,
      source: "mastodon",
    });
  }

  console.log("\n" + "=".repeat(60));
  console.log("📊 SONUÇLAR:");
  console.log(`  📝 Toplam post: ${allStatuses.length}`);
  console.log(`  🇬🇧 EN makale: ${enArticles.length}`);
  console.log(`  🇹🇷 TR (atlandı): ${trCount}`);
  console.log(`  🔗 Link yok (atlandı): ${noLinkCount}`);
  console.log(`  🔄 Duplikat (atlandı): ${duplicateCount}`);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(enArticles, null, 2));
  console.log(`\n💾 Kaydedildi: ${OUTPUT_FILE}`);

  // İlk 5 örnek
  console.log("\n📋 İlk 5 örnek:");
  enArticles.slice(0, 5).forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.title.substring(0, 70)}`);
    console.log(`     slug: ${a.slug}`);
  });

  // Facebook + Bluesky karşılaştırma
  const existingSlugs = new Set<string>();

  if (fs.existsSync("scripts/recovered-articles-en.json")) {
    const fbData = JSON.parse(
      fs.readFileSync("scripts/recovered-articles-en.json", "utf-8"),
    );
    fbData.forEach((a: any) => existingSlugs.add(a.slug));
  }
  if (fs.existsSync("scripts/recovered-articles-bluesky-en.json")) {
    const bsData = JSON.parse(
      fs.readFileSync("scripts/recovered-articles-bluesky-en.json", "utf-8"),
    );
    bsData.forEach((a: any) => existingSlugs.add(a.slug));
  }

  const newSlugs = enArticles.filter((a) => !existingSlugs.has(a.slug));
  console.log(`\n📊 Facebook + Bluesky karşılaştırma:`);
  console.log(`  📘 Zaten var: ${enArticles.length - newSlugs.length}`);
  console.log(`  🆕 Sadece Mastodon'da: ${newSlugs.length}`);

  if (newSlugs.length > 0) {
    console.log("\n🆕 Mastodon'da olup diğerlerinde olmayan:");
    newSlugs.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.slug}`);
    });
  }
}

main().catch((e) => {
  console.error("💥 Fatal:", e.message);
  process.exit(1);
});
