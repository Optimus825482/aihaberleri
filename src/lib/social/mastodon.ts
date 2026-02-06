/**
 * Mastodon Social Posting Service
 *
 * Uses Mastodon API to post to a Mastodon instance
 *
 * SETUP REQUIRED:
 * 1. Create account on a Mastodon instance (e.g., mastodon.social)
 * 2. Go to Preferences → Development → New Application
 * 3. Create app with read + write:statuses scopes
 * 4. Copy the access token
 * 5. Set environment variables:
 *    - MASTODON_ENABLED: "true" to enable posting
 *    - MASTODON_INSTANCE_URL: Your instance URL (e.g., https://mastodon.social)
 *    - MASTODON_ACCESS_TOKEN: Your access token
 *
 * @see https://docs.joinmastodon.org/api/
 */

import { createRestAPIClient, mastodon } from "masto";

// Configuration from environment
const MASTODON_ENABLED = process.env.MASTODON_ENABLED === "true";
const MASTODON_INSTANCE_URL = process.env.MASTODON_INSTANCE_URL;
const MASTODON_ACCESS_TOKEN = process.env.MASTODON_ACCESS_TOKEN;

// Mastodon character limit (default, can vary by instance)
const MAX_CHARS = 500;

// Singleton client instance
let clientInstance: mastodon.rest.Client | null = null;

/**
 * Get or create Mastodon client
 */
function getClient(): mastodon.rest.Client | null {
  if (!MASTODON_INSTANCE_URL || !MASTODON_ACCESS_TOKEN) {
    return null;
  }

  if (clientInstance) {
    return clientInstance;
  }

  try {
    clientInstance = createRestAPIClient({
      url: MASTODON_INSTANCE_URL,
      accessToken: MASTODON_ACCESS_TOKEN,
    });

    console.log("🐘 Mastodon client created successfully");
    return clientInstance;
  } catch (error: any) {
    console.error(
      "❌ Mastodon client creation failed:",
      error?.message || error,
    );
    return null;
  }
}

/**
 * Upload media to Mastodon
 */
async function uploadMedia(
  client: mastodon.rest.Client,
  imageUrl: string,
  description?: string,
): Promise<mastodon.v1.MediaAttachment | null> {
  try {
    // Fetch image
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const blob = await response.blob();

    // Upload to Mastodon
    const media = await client.v2.media.create({
      file: blob,
      description: description || "AI Haberleri görseli",
    });

    return media;
  } catch (error) {
    console.warn("⚠️ Could not upload media to Mastodon:", error);
    return null;
  }
}

/**
 * Post to Mastodon (Toot)
 *
 * @param article - Article data to post
 * @returns Status ID if successful, null otherwise
 */
export async function postToMastodon(article: {
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string | null;
  categoryName?: string;
}): Promise<string | null> {
  // Check if Mastodon is enabled
  if (!MASTODON_ENABLED) {
    return null; // Silent skip
  }

  // Check credentials
  if (!MASTODON_INSTANCE_URL || !MASTODON_ACCESS_TOKEN) {
    console.warn("⚠️ Mastodon credentials missing. Skipping post.");
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

    // Create hashtags (Mastodon hashtags are important for discovery)
    const categoryTag = article.categoryName
      ? `#${article.categoryName.replace(/\s+/g, "")}`
      : "#YapayZeka";
    const tags = `${categoryTag} #AI #Teknoloji #MachineLearning #Haber`;

    // Build post text (max 500 chars default)
    let postText = `📰 ${article.title}\n\n`;

    // Add excerpt if there's room
    const linkAndTags = `\n\n${tags}\n\n🔗 ${articleUrl}`;
    const remainingChars = MAX_CHARS - postText.length - linkAndTags.length;

    if (remainingChars > 50 && article.excerpt) {
      const excerptLength = Math.min(
        article.excerpt.length,
        remainingChars - 3,
      );
      postText += `${article.excerpt.substring(0, excerptLength)}...`;
    }

    postText += linkAndTags;

    // Ensure we don't exceed character limit
    if (postText.length > MAX_CHARS) {
      postText = postText.substring(0, MAX_CHARS - 3) + "...";
    }

    // Upload media if available
    let mediaIds: string[] = [];
    if (article.imageUrl) {
      const media = await uploadMedia(client, article.imageUrl, article.title);
      if (media) {
        mediaIds = [media.id];
      }
    }

    console.log("🐘 Posting to Mastodon...");

    // Create the status (toot)
    const status = await client.v1.statuses.create({
      status: postText,
      visibility: "public",
      language: "tr",
      ...(mediaIds.length > 0 && { mediaIds }),
    });

    console.log(`✅ Mastodon toot successful! ID: ${status.id}`);
    return status.id;
  } catch (error: any) {
    // Handle specific errors
    if (error?.statusCode === 429) {
      console.warn("⚠️ Mastodon rate limit exceeded. Try again later.");
      return null;
    }

    if (error?.statusCode === 401) {
      console.error(
        "❌ Mastodon authentication failed. Check MASTODON_ACCESS_TOKEN.",
      );
      return null;
    }

    console.error("❌ Mastodon post failed:", error?.message || error);
    return null;
  }
}

/**
 * Generate a Mastodon share URL for manual sharing
 */
export function generateMastodonShareUrl(article: {
  title: string;
  slug: string;
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  const articleUrl = `${siteUrl}/news/${article.slug}`;
  const text = encodeURIComponent(`📰 ${article.title}\n\n${articleUrl}`);

  // Generic Mastodon share URL (works with any instance)
  return `https://mastodonshare.com/?text=${text}`;
}

/**
 * Check if Mastodon posting is properly configured
 */
export function isMastodonConfigured(): boolean {
  return !!(MASTODON_ENABLED && MASTODON_INSTANCE_URL && MASTODON_ACCESS_TOKEN);
}

/**
 * Get Mastodon configuration status for admin panel
 */
export function getMastodonStatus(): {
  enabled: boolean;
  configured: boolean;
  instanceUrl: string | null;
} {
  return {
    enabled: MASTODON_ENABLED,
    configured: isMastodonConfigured(),
    instanceUrl: MASTODON_INSTANCE_URL || null,
  };
}

/**
 * Post to Mastodon in English (Toot)
 *
 * @param article - Article data to post (English content)
 * @returns Status ID if successful, null otherwise
 */
export async function postToMastodonEN(article: {
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string | null;
  categoryName?: string;
}): Promise<string | null> {
  // Check if Mastodon is enabled
  if (!MASTODON_ENABLED) {
    return null; // Silent skip
  }

  // Check credentials
  if (!MASTODON_INSTANCE_URL || !MASTODON_ACCESS_TOKEN) {
    console.warn("⚠️ Mastodon credentials missing. Skipping EN post.");
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

    // Create English hashtags (Mastodon hashtags are important for discovery)
    const categoryTag = article.categoryName
      ? `#${article.categoryName.replace(/\s+/g, "")}`
      : "#ArtificialIntelligence";
    const tags = `${categoryTag} #AI #Technology #MachineLearning #TechNews`;

    // Build post text (max 500 chars default)
    let postText = `📰 ${article.title}\n\n`;

    // Add excerpt if there's room
    const linkAndTags = `\n\n${tags}\n\n🔗 ${articleUrl}`;
    const remainingChars = MAX_CHARS - postText.length - linkAndTags.length;

    if (remainingChars > 50 && article.excerpt) {
      const excerptLength = Math.min(
        article.excerpt.length,
        remainingChars - 3,
      );
      postText += `${article.excerpt.substring(0, excerptLength)}...`;
    }

    postText += linkAndTags;

    // Ensure we don't exceed character limit
    if (postText.length > MAX_CHARS) {
      postText = postText.substring(0, MAX_CHARS - 3) + "...";
    }

    // Upload media if available
    let mediaIds: string[] = [];
    if (article.imageUrl) {
      const media = await uploadMedia(client, article.imageUrl, article.title);
      if (media) {
        mediaIds = [media.id];
      }
    }

    console.log("🐘 Posting to Mastodon (EN)...");

    // Create the status (toot) - language is 'en' for English
    const status = await client.v1.statuses.create({
      status: postText,
      visibility: "public",
      language: "en",
      ...(mediaIds.length > 0 && { mediaIds }),
    });

    console.log(`✅ Mastodon EN toot successful! ID: ${status.id}`);
    return status.id;
  } catch (error: any) {
    // Handle specific errors
    if (error?.statusCode === 429) {
      console.warn("⚠️ Mastodon rate limit exceeded. Try again later.");
      return null;
    }

    if (error?.statusCode === 401) {
      console.error(
        "❌ Mastodon authentication failed. Check MASTODON_ACCESS_TOKEN.",
      );
      return null;
    }

    console.error("❌ Mastodon EN post failed:", error?.message || error);
    return null;
  }
}
