export {};

/**
 * Facebook Recovery Script
 * Fetches all posts from Facebook pages and extracts aihaberleri.org links
 * to recover article slugs and titles after database loss.
 *
 * Usage: npx tsx scripts/recover-from-facebook.ts
 */

const FACEBOOK_PAGE_ID = "882602408279863";
const FACEBOOK_PAGE_ACCESS_TOKEN =
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN ||
  "EAAj3ypqCAuUBQsQhJkzQjOi5AddfvRBkcq7ZBWTzyjsC5TJ5i0tqSO67RJZCNTU1y8C5ZCI1vw8LpN3iUUR9WjeDrprCZC04iLBBVl3Wvjzd1qaHDjkPpG9dnlSTa5JvZCmNi80Olk9GUrvRFxNCFzSoa6ZAvmpv7y8el9pERt6qvtUa4Ls90w48yZCwPCq8IuHQdiOhQZDZD";

const FACEBOOK_EN_PAGE_ID = "982113784986233";
const FACEBOOK_EN_PAGE_ACCESS_TOKEN =
  process.env.FACEBOOK_EN_PAGE_ACCESS_TOKEN ||
  "EAAj3ypqCAuUBQjth8K0jTcDkUsNoCX6WHEL6fZCdfL6FUYrA0I0ZB70I50iLW7vyF86PDlLu0l3zM4XzJDZCYXL6ARI4vAjhFAisMZAvHM3FwEmwlbwhSSTdca9mUheCtICNUv7DRpKqcMML6Iw6J5XW9dxdeKjA2AHitw1roZBIfpLTRhZBXh7KgDpPinSuskriqEugq5FsBLQzXoOwNYMWZAcHeAUQPZA8BsZAjZC";

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  attachments?: {
    data: Array<{
      type: string;
      url?: string;
      unshimmed_url?: string;
      title?: string;
      description?: string;
      target?: { url?: string };
    }>;
  };
}

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

async function fetchAllPosts(
  pageId: string,
  accessToken: string,
  pageName: string,
): Promise<FacebookPost[]> {
  const allPosts: FacebookPost[] = [];
  let url = `https://graph.facebook.com/v21.0/${pageId}/posts?fields=id,message,created_time,permalink_url,full_picture,attachments{type,url,unshimmed_url,title,description,target}&limit=100&access_token=${accessToken}`;

  let page = 1;
  while (url) {
    console.log(`[${pageName}] Sayfa ${page} çekiliyor...`);

    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.text();
      console.error(`Facebook API hatası:`, error);
      break;
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      allPosts.push(...data.data);
      console.log(
        `[${pageName}] ${data.data.length} post çekildi (toplam: ${allPosts.length})`,
      );
    }

    // Next page
    url = data.paging?.next || "";
    page++;

    // Rate limit koruması
    await new Promise((r) => setTimeout(r, 500));
  }

  return allPosts;
}

function extractArticleUrl(post: FacebookPost): string | null {
  // 1. Attachment'lardan URL çek
  if (post.attachments?.data) {
    for (const att of post.attachments.data) {
      const attUrl = att.unshimmed_url || att.url || att.target?.url;
      if (attUrl && attUrl.includes("aihaberleri.org")) {
        return attUrl;
      }
    }
  }

  // 2. Mesajdan URL çek
  if (post.message) {
    const urlMatch = post.message.match(
      /https?:\/\/(?:www\.)?aihaberleri\.org\/[^\s)"\]]+/gi,
    );
    if (urlMatch) return urlMatch[0];
  }

  return null;
}

function extractSlugFromUrl(url: string): string | null {
  // https://aihaberleri.org/haber/slug-name veya /en/article/slug-name
  const trMatch = url.match(/aihaberleri\.org\/haber\/([^?\s#/]+)/);
  if (trMatch) return trMatch[1];

  const enMatch = url.match(/aihaberleri\.org\/en\/article\/([^?\s#/]+)/);
  if (enMatch) return enMatch[1];

  // Fallback: son path segment
  const pathMatch = url.match(/aihaberleri\.org\/([^?\s#]+)/);
  if (pathMatch) {
    const parts = pathMatch[1].split("/").filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return null;
}

function extractTitle(post: FacebookPost): string {
  // 1. Attachment title
  if (post.attachments?.data) {
    for (const att of post.attachments.data) {
      if (att.title) return att.title;
    }
  }

  // 2. Mesajın ilk satırı
  if (post.message) {
    const firstLine = post.message.split("\n")[0].trim();
    // Emoji ve hashtag temizle
    const cleaned = firstLine
      .replace(/^[🔥🚀💡🤖📰🌐⚡️🔬💻📊🎯🧠]+\s*/, "")
      .replace(/#\w+/g, "")
      .trim();
    if (cleaned.length > 10) return cleaned;
  }

  return post.message?.substring(0, 100) || "Başlıksız";
}

async function main() {
  console.log("=== Facebook'tan Haber Kurtarma Başlıyor ===\n");

  // TR sayfasını çek
  console.log("📘 TR Facebook sayfası çekiliyor...");
  const trPosts = await fetchAllPosts(
    FACEBOOK_PAGE_ID,
    FACEBOOK_PAGE_ACCESS_TOKEN,
    "TR",
  );

  // EN sayfasını çek
  console.log("\n📘 EN Facebook sayfası çekiliyor...");
  const enPosts = await fetchAllPosts(
    FACEBOOK_EN_PAGE_ID,
    FACEBOOK_EN_PAGE_ACCESS_TOKEN,
    "EN",
  );

  console.log(`\nToplam: TR=${trPosts.length}, EN=${enPosts.length} post\n`);

  // Haberleri çıkar
  const recovered: RecoveredArticle[] = [];
  const seenSlugs = new Set<string>();

  // TR postlarını işle
  for (const post of trPosts) {
    const url = extractArticleUrl(post);
    if (!url) continue;

    const slug = extractSlugFromUrl(url);
    if (!slug || seenSlugs.has(slug)) continue;

    seenSlugs.add(slug);
    recovered.push({
      title: extractTitle(post),
      slug,
      url,
      facebookMessage: post.message || "",
      facebookDate: post.created_time,
      facebookPostId: post.id,
      imageUrl: post.full_picture || null,
      language: "tr",
    });
  }

  // EN postlarını işle
  for (const post of enPosts) {
    const url = extractArticleUrl(post);
    if (!url) continue;

    const slug = extractSlugFromUrl(url);
    if (!slug || seenSlugs.has(slug)) continue;

    seenSlugs.add(slug);
    recovered.push({
      title: extractTitle(post),
      slug,
      url,
      facebookMessage: post.message || "",
      facebookDate: post.created_time,
      facebookPostId: post.id,
      imageUrl: post.full_picture || null,
      language: "en",
    });
  }

  // Tarihe göre sırala (eskiden yeniye)
  recovered.sort(
    (a, b) =>
      new Date(a.facebookDate).getTime() - new Date(b.facebookDate).getTime(),
  );

  console.log(`\n✅ ${recovered.length} benzersiz haber kurtarıldı!\n`);
  console.log("--- İlk 10 haber ---");
  recovered.slice(0, 10).forEach((a, i) => {
    console.log(`${i + 1}. [${a.language.toUpperCase()}] ${a.title}`);
    console.log(`   Slug: ${a.slug}`);
    console.log(`   URL: ${a.url}`);
    console.log(`   Tarih: ${a.facebookDate}`);
    console.log("");
  });

  // JSON olarak kaydet
  const fs = await import("fs");
  const outputPath = "scripts/recovered-articles.json";
  fs.writeFileSync(outputPath, JSON.stringify(recovered, null, 2), "utf-8");
  console.log(`\n💾 Tüm veriler kaydedildi: ${outputPath}`);
  console.log(`   Toplam: ${recovered.length} haber`);
  console.log(`   TR: ${recovered.filter((a) => a.language === "tr").length}`);
  console.log(`   EN: ${recovered.filter((a) => a.language === "en").length}`);
}

main().catch(console.error);
