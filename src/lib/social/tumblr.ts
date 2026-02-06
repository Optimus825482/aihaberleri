/**
 * Tumblr Social Posting Service
 *
 * Uses Tumblr API v2 to post to a Tumblr blog
 *
 * SETUP REQUIRED:
 * 1. Create Tumblr account at tumblr.com
 * 2. Register app at https://www.tumblr.com/oauth/apps
 * 3. Get OAuth tokens (use OAuth 2.0 flow)
 * 4. Set environment variables:
 *    - TUMBLR_ENABLED: "true" to enable posting
 *    - TUMBLR_CONSUMER_KEY: OAuth consumer key
 *    - TUMBLR_CONSUMER_SECRET: OAuth consumer secret
 *    - TUMBLR_ACCESS_TOKEN: OAuth access token
 *    - TUMBLR_ACCESS_TOKEN_SECRET: OAuth access token secret
 *    - TUMBLR_BLOG_NAME: Your blog name (without .tumblr.com)
 *
 * @see https://www.tumblr.com/docs/en/api/v2
 */

import Tumblr from "tumblr.js";

// Configuration from environment
const TUMBLR_ENABLED = process.env.TUMBLR_ENABLED === "true";
const TUMBLR_CONSUMER_KEY = process.env.TUMBLR_CONSUMER_KEY;
const TUMBLR_CONSUMER_SECRET = process.env.TUMBLR_CONSUMER_SECRET;
const TUMBLR_ACCESS_TOKEN = process.env.TUMBLR_ACCESS_TOKEN;
const TUMBLR_ACCESS_TOKEN_SECRET = process.env.TUMBLR_ACCESS_TOKEN_SECRET;
const TUMBLR_BLOG_NAME = process.env.TUMBLR_BLOG_NAME;

// Singleton client instance
let clientInstance: any = null;

/**
 * Get or create Tumblr client
 */
function getClient(): any {
  if (
    !TUMBLR_CONSUMER_KEY ||
    !TUMBLR_CONSUMER_SECRET ||
    !TUMBLR_ACCESS_TOKEN ||
    !TUMBLR_ACCESS_TOKEN_SECRET
  ) {
    return null;
  }

  if (clientInstance) {
    return clientInstance;
  }

  try {
    clientInstance = Tumblr.createClient({
      consumer_key: TUMBLR_CONSUMER_KEY,
      consumer_secret: TUMBLR_CONSUMER_SECRET,
      token: TUMBLR_ACCESS_TOKEN,
      token_secret: TUMBLR_ACCESS_TOKEN_SECRET,
    });

    console.log("📝 Tumblr client created successfully");
    return clientInstance;
  } catch (error: any) {
    console.error("❌ Tumblr client creation failed:", error?.message || error);
    return null;
  }
}

/**
 * Post to Tumblr as a link post
 *
 * @param article - Article data to post
 * @returns Post ID if successful, null otherwise
 */
export async function postToTumblr(article: {
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string | null;
  categoryName?: string;
}): Promise<string | null> {
  // Check if Tumblr is enabled
  if (!TUMBLR_ENABLED) {
    return null; // Silent skip
  }

  // Check credentials
  if (
    !TUMBLR_CONSUMER_KEY ||
    !TUMBLR_CONSUMER_SECRET ||
    !TUMBLR_ACCESS_TOKEN ||
    !TUMBLR_ACCESS_TOKEN_SECRET ||
    !TUMBLR_BLOG_NAME
  ) {
    console.warn("⚠️ Tumblr credentials missing. Skipping post.");
    return null;
  }

  try {
    // Get client
    const client = getClient();
    if (!client) {
      return null;
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    const articleUrl = `${siteUrl}/news/${article.slug}`;

    // Create tags (Tumblr tags don't use # prefix)
    const tags: string[] = ["yapay zeka", "AI", "teknoloji", "haber"];
    if (article.categoryName) {
      tags.unshift(article.categoryName.toLowerCase());
    }

    console.log("📝 Posting to Tumblr...");

    // Use legacy API format (type-based)
    const blogIdentifier = `${TUMBLR_BLOG_NAME}.tumblr.com`;

    return new Promise((resolve, reject) => {
      // Legacy link post format with thumbnail
      const postData: any = {
        type: "link",
        title: `📰 ${article.title}`,
        url: articleUrl,
        description: article.excerpt,
        tags: tags.join(","),
      };

      // Add thumbnail if image URL is provided
      if (article.imageUrl) {
        postData.thumbnail = article.imageUrl;
      }

      client.createLegacyPost(
        blogIdentifier,
        postData,
        (err: any, data: any) => {
          if (err) {
            console.error("❌ Tumblr post failed:", err?.message || err);

            // Handle specific errors
            if (err?.statusCode === 401) {
              console.error("   📌 Token might be expired. Refresh the token.");
            } else if (err?.statusCode === 429) {
              console.warn("   📌 Rate limit exceeded. Try again later.");
            }

            resolve(null);
            return;
          }

          const postId = data?.id?.toString() || data?.id_string;
          console.log(`✅ Tumblr post successful! ID: ${postId}`);
          resolve(postId);
        },
      );
    });
  } catch (error: any) {
    console.error("❌ Tumblr post error:", error?.message || error);
    return null;
  }
}

/**
 * Post to Tumblr as a text post (for longer content)
 */
export async function postTextToTumblr(article: {
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  imageUrl?: string | null;
  categoryName?: string;
}): Promise<string | null> {
  if (!TUMBLR_ENABLED) return null;

  const client = getClient();
  if (!client || !TUMBLR_BLOG_NAME) return null;

  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    const articleUrl = `${siteUrl}/news/${article.slug}`;

    // Create tags
    const tags: string[] = ["yapay zeka", "AI", "teknoloji", "haber"];
    if (article.categoryName) {
      tags.unshift(article.categoryName.toLowerCase());
    }

    // Build HTML body
    let body = `<h2>${article.title}</h2>`;

    if (article.imageUrl) {
      body += `<img src="${article.imageUrl}" alt="${article.title}" />`;
    }

    body += `<p>${article.excerpt}</p>`;

    if (article.content) {
      // Add truncated content
      const truncatedContent = article.content.substring(0, 500);
      body += `<p>${truncatedContent}...</p>`;
    }

    body += `<p><a href="${articleUrl}">Devamını oku →</a></p>`;

    console.log("📝 Posting text to Tumblr...");

    const blogIdentifier = `${TUMBLR_BLOG_NAME}.tumblr.com`;

    return new Promise((resolve) => {
      // Use legacy text post format
      client.createLegacyPost(
        blogIdentifier,
        {
          type: "text",
          title: `📰 ${article.title}`,
          body: body,
          tags: tags.join(","),
          format: "html",
        },
        (err: any, data: any) => {
          if (err) {
            console.error("❌ Tumblr text post failed:", err?.message || err);
            resolve(null);
            return;
          }

          const postId = data?.id?.toString() || data?.id_string;
          console.log(`✅ Tumblr text post successful! ID: ${postId}`);
          resolve(postId);
        },
      );
    });
  } catch (error: any) {
    console.error("❌ Tumblr text post error:", error?.message || error);
    return null;
  }
}

/**
 * Generate a Tumblr share URL for manual sharing
 */
export function generateTumblrShareUrl(article: {
  title: string;
  slug: string;
  excerpt: string;
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  const articleUrl = `${siteUrl}/news/${article.slug}`;

  const params = new URLSearchParams({
    posttype: "link",
    title: article.title,
    url: articleUrl,
    caption: article.excerpt,
    tags: "yapay zeka,AI,teknoloji",
  });

  return `https://www.tumblr.com/widgets/share/tool?${params.toString()}`;
}

/**
 * Check if Tumblr posting is properly configured
 */
export function isTumblrConfigured(): boolean {
  return !!(
    TUMBLR_ENABLED &&
    TUMBLR_CONSUMER_KEY &&
    TUMBLR_CONSUMER_SECRET &&
    TUMBLR_ACCESS_TOKEN &&
    TUMBLR_ACCESS_TOKEN_SECRET &&
    TUMBLR_BLOG_NAME
  );
}

/**
 * Get Tumblr configuration status for admin panel
 */
export function getTumblrStatus(): {
  enabled: boolean;
  configured: boolean;
  blogName: string | null;
} {
  return {
    enabled: TUMBLR_ENABLED,
    configured: isTumblrConfigured(),
    blogName: TUMBLR_BLOG_NAME || null,
  };
}

/**
 * Post to Tumblr as a link post (English content)
 *
 * @param article - Article data to post (English)
 * @returns Post ID if successful, null otherwise
 */
export async function postToTumblrEN(article: {
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string | null;
  categoryName?: string;
}): Promise<string | null> {
  // Check if Tumblr is enabled
  if (!TUMBLR_ENABLED) {
    return null; // Silent skip
  }

  // Check credentials
  if (
    !TUMBLR_CONSUMER_KEY ||
    !TUMBLR_CONSUMER_SECRET ||
    !TUMBLR_ACCESS_TOKEN ||
    !TUMBLR_ACCESS_TOKEN_SECRET ||
    !TUMBLR_BLOG_NAME
  ) {
    console.warn("⚠️ Tumblr credentials missing. Skipping EN post.");
    return null;
  }

  try {
    // Get client
    const client = getClient();
    if (!client) {
      return null;
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    // EN articles use /en/news/ path
    const articleUrl = article.slug.startsWith("en/")
      ? `${siteUrl}/${article.slug}`
      : `${siteUrl}/en/news/${article.slug}`;

    // Create English tags (Tumblr tags don't use # prefix)
    const tags: string[] = [
      "artificial intelligence",
      "AI",
      "technology",
      "tech news",
    ];
    if (article.categoryName) {
      tags.unshift(article.categoryName.toLowerCase());
    }

    console.log("📝 Posting to Tumblr (EN)...");

    // Use legacy API format (type-based)
    const blogIdentifier = `${TUMBLR_BLOG_NAME}.tumblr.com`;

    return new Promise((resolve, reject) => {
      // Legacy link post format with thumbnail
      const postData: any = {
        type: "link",
        title: `📰 ${article.title}`,
        url: articleUrl,
        description: article.excerpt,
        tags: tags.join(","),
      };

      // Add thumbnail if image URL is provided
      if (article.imageUrl) {
        postData.thumbnail = article.imageUrl;
      }

      client.createLegacyPost(
        blogIdentifier,
        postData,
        (err: any, data: any) => {
          if (err) {
            console.error("❌ Tumblr EN post failed:", err?.message || err);

            // Handle specific errors
            if (err?.statusCode === 401) {
              console.error("   📌 Token might be expired. Refresh the token.");
            } else if (err?.statusCode === 429) {
              console.warn("   📌 Rate limit exceeded. Try again later.");
            }

            resolve(null);
            return;
          }

          const postId = data?.id?.toString() || data?.id_string;
          console.log(`✅ Tumblr EN post successful! ID: ${postId}`);
          resolve(postId);
        },
      );
    });
  } catch (error: any) {
    console.error("❌ Tumblr EN post error:", error?.message || error);
    return null;
  }
}
