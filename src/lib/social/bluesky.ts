/**
 * Bluesky Social Posting Service
 *
 * Uses AT Protocol (Authenticated Transfer Protocol) to post to Bluesky
 *
 * SETUP REQUIRED:
 * 1. Create Bluesky account at bsky.app
 * 2. Generate App Password: Settings → App Passwords → Add
 * 3. Set environment variables:
 *    - BLUESKY_ENABLED: "true" to enable posting
 *    - BLUESKY_HANDLE: Your handle (e.g., username.bsky.social)
 *    - BLUESKY_APP_PASSWORD: App-specific password (xxxx-xxxx-xxxx-xxxx)
 *
 * @see https://docs.bsky.app
 * @see https://atproto.com/docs
 */

import { BskyAgent, RichText } from "@atproto/api";

// Configuration from environment
const BLUESKY_ENABLED = process.env.BLUESKY_ENABLED === "true";
const BLUESKY_HANDLE = process.env.BLUESKY_HANDLE;
const BLUESKY_APP_PASSWORD = process.env.BLUESKY_APP_PASSWORD;

// Bluesky character limit
const MAX_CHARS = 300;

// Singleton agent instance (reuse session)
let agentInstance: BskyAgent | null = null;
let sessionExpiry: number | null = null;

/**
 * Get or create authenticated Bluesky agent
 */
async function getAgent(): Promise<BskyAgent | null> {
  if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) {
    return null;
  }

  // Check if we have a valid session (sessions last ~2 hours)
  const now = Date.now();
  if (agentInstance && sessionExpiry && now < sessionExpiry) {
    return agentInstance;
  }

  try {
    const agent = new BskyAgent({
      service: "https://bsky.social",
    });

    await agent.login({
      identifier: BLUESKY_HANDLE,
      password: BLUESKY_APP_PASSWORD,
    });

    // Session valid for ~2 hours, refresh at 1.5 hours
    sessionExpiry = now + 90 * 60 * 1000;
    agentInstance = agent;

    console.log("🦋 Bluesky session created successfully");
    return agent;
  } catch (error: any) {
    console.error("❌ Bluesky login failed:", error?.message || error);
    agentInstance = null;
    sessionExpiry = null;
    return null;
  }
}

/**
 * Fetch Open Graph data for link card
 */
async function fetchLinkCard(
  agent: BskyAgent,
  url: string,
  title: string,
  description: string,
  imageUrl?: string | null,
): Promise<any | null> {
  try {
    // If we have an image, upload it for the card
    let thumb: any = undefined;

    if (imageUrl) {
      try {
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          const imageBuffer = await imageResponse.arrayBuffer();
          const uint8Array = new Uint8Array(imageBuffer);

          // Get content type
          const contentType =
            imageResponse.headers.get("content-type") || "image/jpeg";

          const uploadResponse = await agent.uploadBlob(uint8Array, {
            encoding: contentType,
          });

          thumb = uploadResponse.data.blob;
        }
      } catch (imgError) {
        console.warn("⚠️ Could not upload image for Bluesky card:", imgError);
      }
    }

    return {
      $type: "app.bsky.embed.external",
      external: {
        uri: url,
        title: title.substring(0, 100),
        description: description.substring(0, 300),
        ...(thumb && { thumb }),
      },
    };
  } catch (error) {
    console.warn("⚠️ Could not create link card:", error);
    return null;
  }
}

/**
 * Post to Bluesky
 *
 * @param article - Article data to post
 * @returns Post URI if successful, null otherwise
 */
export async function postToBluesky(article: {
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string | null;
  categoryName?: string;
}): Promise<string | null> {
  // Check if Bluesky is enabled
  if (!BLUESKY_ENABLED) {
    return null; // Silent skip
  }

  // Check credentials
  if (!BLUESKY_HANDLE || !BLUESKY_APP_PASSWORD) {
    console.warn("⚠️ Bluesky credentials missing. Skipping post.");
    return null;
  }

  try {
    // Get authenticated agent
    const agent = await getAgent();
    if (!agent) {
      return null;
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    const articleUrl = `${siteUrl}/news/${article.slug}`;

    // Create hashtags
    const categoryTag = article.categoryName
      ? `#${article.categoryName.replace(/\s+/g, "")}`
      : "#YapayZeka";
    const tags = `${categoryTag} #AI #Teknoloji`;

    // Build post text (max 300 chars)
    let postText = `📰 ${article.title}\n\n`;

    // Add excerpt if there's room
    const remainingChars = MAX_CHARS - postText.length - tags.length - 5;
    if (remainingChars > 50 && article.excerpt) {
      const excerptLength = Math.min(article.excerpt.length, remainingChars);
      postText += `${article.excerpt.substring(0, excerptLength)}...\n\n`;
    }

    postText += tags;

    // Ensure we don't exceed character limit
    if (postText.length > MAX_CHARS) {
      postText = postText.substring(0, MAX_CHARS - 3) + "...";
    }

    // Create rich text with facets (for hashtags and links)
    const rt = new RichText({ text: postText });
    await rt.detectFacets(agent);

    // Create link embed card
    const embed = await fetchLinkCard(
      agent,
      articleUrl,
      article.title,
      article.excerpt || "",
      article.imageUrl,
    );

    console.log("🦋 Posting to Bluesky...");

    // Create the post
    const response = await agent.post({
      text: rt.text,
      facets: rt.facets,
      ...(embed && { embed }),
      createdAt: new Date().toISOString(),
    });

    console.log(`✅ Bluesky post successful! URI: ${response.uri}`);
    return response.uri;
  } catch (error: any) {
    // Handle specific errors
    if (error?.status === 429) {
      console.warn("⚠️ Bluesky rate limit exceeded. Try again later.");
      return null;
    }

    if (error?.message?.includes("Invalid identifier or password")) {
      console.error(
        "❌ Bluesky authentication failed. Check BLUESKY_HANDLE and BLUESKY_APP_PASSWORD.",
      );
      return null;
    }

    console.error("❌ Bluesky post failed:", error?.message || error);
    return null;
  }
}

/**
 * Generate a Bluesky Intent URL for manual sharing
 * Opens Bluesky with pre-filled post text
 */
export function generateBlueskyIntentUrl(article: {
  title: string;
  slug: string;
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  const articleUrl = `${siteUrl}/news/${article.slug}`;
  const text = encodeURIComponent(`📰 ${article.title}\n\n${articleUrl}`);

  return `https://bsky.app/intent/compose?text=${text}`;
}

/**
 * Check if Bluesky posting is properly configured
 */
export function isBlueskyConfigured(): boolean {
  return !!(BLUESKY_ENABLED && BLUESKY_HANDLE && BLUESKY_APP_PASSWORD);
}

/**
 * Get Bluesky configuration status for admin panel
 */
export function getBlueskyStatus(): {
  enabled: boolean;
  configured: boolean;
  handle: string | null;
} {
  return {
    enabled: BLUESKY_ENABLED,
    configured: isBlueskyConfigured(),
    handle: BLUESKY_HANDLE || null,
  };
}
