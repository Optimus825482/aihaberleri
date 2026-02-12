export {};

/**
 * EN Facebook Recovery Script
 * Fetches all posts from EN Facebook page and extracts aihaberleri.org/en links
 *
 * Usage: npx tsx scripts/recover-en-facebook.ts
 */

const FACEBOOK_EN_PAGE_ID = "982113784986233";
const FACEBOOK_EN_TOKEN =
  "EAAj3ypqCAuUBQsfZBIubZBEF5o2OYmeV5ELJqfV2tyeOxC6O5OHsrWPNQhKUp7FQ7UHCIE4aZADpvHfolYZAHcfDTLpsKHPFzgZBEBZA4ytqBrMfribcCeD3kU6GLIkUo4k7DHkQktEncoHtiJsRPJ7ZAJExrH3VUS4gQZCAdMv3LXrrMQWhQB4tEhFac7bw08YXJpAQuQDZCXeJzHPF05DWfeQsgo8CwXZCUsWxeh";

interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  full_picture?: string;
  attachments?: {
    data: Array<{
      type: string;
      url?: string;
      unshimmed_url?: string;
      title?: string;
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
  language: "en";
}

async function fetchAllPosts(): Promise<FacebookPost[]> {
  const allPosts: FacebookPost[] = [];
  let url = `https://graph.facebook.com/v21.0/${FACEBOOK_EN_PAGE_ID}/posts?fields=id,message,created_time,full_picture,attachments{type,url,unshimmed_url,title,target}&limit=100&access_token=${FACEBOOK_EN_TOKEN}`;

  let page = 1;
  while (url) {
    console.log(`📘 Sayfa ${page} çekiliyor...`);
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Facebook API hatası:`, await response.text());
      break;
    }
    const data = await response.json();
    if (data.data?.length > 0) {
      allPosts.push(...data.data);
      console.log(`  ${data.data.length} post (toplam: ${allPosts.length})`);
    }
    url = data.paging?.next || "";
    page++;
    await new Promise((r) => setTimeout(r, 500));
  }
  return allPosts;
}

function extractArticleUrl(post: FacebookPost): string | null {
  if (post.attachments?.data) {
    for (const att of post.attachments.data) {
      const attUrl = att.unshimmed_url || att.url || att.target?.url;
      if (attUrl && attUrl.includes("aihaberleri.org")) return attUrl;
    }
  }
  if (post.message) {
    const match = post.message.match(
      /https?:\/\/(?:www\.)?aihaberleri\.org\/[^\s)"\]]+/gi,
    );
    if (match) return match[0];
  }
  return null;
}

function extractSlug(url: string): string | null {
  // /en/article/slug or /en/news/slug or /news/slug
  const enMatch = url.match(
    /aihaberleri\.org\/en\/(?:article|news)\/([^?\s#/]+)/,
  );
  if (enMatch) return enMatch[1];
  const match = url.match(/aihaberleri\.org\/news\/([^?\s#/]+)/);
  if (match) return match[1];
  // Fallback: last path segment
  const pathMatch = url.match(/aihaberleri\.org\/([^?\s#]+)/);
  if (pathMatch) {
    const parts = pathMatch[1].split("/").filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return null;
}

function extractTitle(post: FacebookPost): string {
  if (post.attachments?.data) {
    for (const att of post.attachments.data) {
      if (att.title) return att.title;
    }
  }
  if (post.message) {
    const firstLine = post.message.split("\n")[0].trim();
    const cleaned = firstLine
      .replace(/^[🔥🚀💡🤖📰🌐⚡️🔬💻📊🎯🧠]+\s*/, "")
      .replace(/#\w+/g, "")
      .trim();
    if (cleaned.length > 10) return cleaned;
  }
  return post.message?.substring(0, 100) || "Untitled";
}

async function main() {
  console.log("=== EN Facebook Recovery ===\n");

  const posts = await fetchAllPosts();
  console.log(`\n📦 Toplam ${posts.length} post çekildi\n`);

  const recovered: RecoveredArticle[] = [];
  const seenSlugs = new Set<string>();

  for (const post of posts) {
    const url = extractArticleUrl(post);
    if (!url) continue;

    const slug = extractSlug(url);
    if (!slug || seenSlugs.has(slug)) continue;

    const title = extractTitle(post);
    if (title === "aihaberleri.org" || title.length < 5) continue;

    seenSlugs.add(slug);
    recovered.push({
      title,
      slug,
      url,
      facebookMessage: post.message || "",
      facebookDate: post.created_time,
      facebookPostId: post.id,
      imageUrl: post.full_picture || null,
      language: "en",
    });
  }

  // Sort oldest first
  recovered.sort(
    (a, b) =>
      new Date(a.facebookDate).getTime() - new Date(b.facebookDate).getTime(),
  );

  console.log(`✅ ${recovered.length} EN haber kurtarıldı!\n`);
  recovered.slice(0, 5).forEach((a, i) => {
    console.log(`${i + 1}. ${a.title}`);
    console.log(`   Slug: ${a.slug}`);
    console.log(`   Tarih: ${a.facebookDate}\n`);
  });

  const fs = await import("fs");
  fs.writeFileSync(
    "scripts/recovered-articles-en.json",
    JSON.stringify(recovered, null, 2),
    "utf-8",
  );
  console.log(
    `💾 Kaydedildi: scripts/recovered-articles-en.json (${recovered.length} haber)`,
  );
}

main().catch(console.error);
