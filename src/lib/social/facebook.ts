/**
 * Facebook Page Posting Service
 *
 * Uses Facebook Graph API to post to a Facebook Page
 *
 * SETUP REQUIRED:
 * 1. Create Facebook App at developers.facebook.com
 * 2. Get Page Access Token with pages_manage_posts permission
 * 3. Set environment variables:
 *    - FACEBOOK_PAGE_ID: Your page ID
 *    - FACEBOOK_PAGE_ACCESS_TOKEN: Long-lived page access token
 *    - FACEBOOK_ENABLED: "true" to enable posting
 */

import axios from "axios";

const FACEBOOK_ENABLED = process.env.FACEBOOK_ENABLED === "true";
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

// English Facebook Page (separate page for EN content)
const FACEBOOK_EN_ENABLED = process.env.FACEBOOK_EN_ENABLED === "true";
const FACEBOOK_EN_PAGE_ID = process.env.FACEBOOK_EN_PAGE_ID;
const FACEBOOK_EN_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_EN_PAGE_ACCESS_TOKEN;

const GRAPH_API_URL = "https://graph.facebook.com/v21.0";

/**
 * Post to Facebook Page
 */
export async function postToFacebook(article: {
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string | null;
  categoryName?: string;
}): Promise<string | null> {
  // Check if Facebook is enabled
  if (!FACEBOOK_ENABLED) {
    return null; // Silent skip
  }

  // Check credentials
  if (!FACEBOOK_PAGE_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) {
    console.warn("⚠️ Facebook credentials missing. Skipping post.");
    return null;
  }

  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    const articleUrl = `${siteUrl}/news/${article.slug}`;

    // Create post message
    const hashtags = article.categoryName
      ? `#${article.categoryName.replace(/\s+/g, "")} #YapayZeka #AI`
      : "#YapayZeka #AI #Teknoloji";

    const message = `📰 ${article.title}\n\n${article.excerpt}\n\n${hashtags}`;

    console.log("📘 Posting to Facebook Page...");

    let postId: string;

    // Post as link — Facebook scrapes OG tags from the URL for image/title/description
    // Note: picture param requires domain ownership verification, so we rely on OG tags
    const response = await axios.post(
      `${GRAPH_API_URL}/${FACEBOOK_PAGE_ID}/feed`,
      {
        message,
        link: articleUrl,
        published: 1,
        access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
      },
    );
    postId = response.data.id;

    console.log(`✅ Facebook post successful! ID: ${postId}`);
    return postId;
  } catch (error: any) {
    const errorData = error?.response?.data?.error;

    if (errorData) {
      const errMsg = `Facebook API Error: ${errorData.message} (code: ${errorData.code}, type: ${errorData.type})`;
      console.error(`❌ ${errMsg}`);

      // Handle specific errors
      if (errorData.code === 190) {
        console.warn("   📌 Token expired. Generate a new Page Access Token.");
      } else if (errorData.code === 200) {
        console.warn(
          "   📌 Permission denied. Check pages_manage_posts permission.",
        );
      } else if (errorData.code === 368) {
        console.warn("   📌 Content policy violation. Check post content.");
      }

      throw new Error(errMsg);
    } else {
      const errMsg = `Facebook post failed: ${error?.message || error}`;
      console.error(`❌ ${errMsg}`);
      throw new Error(errMsg);
    }
  }
}

/**
 * Post image to Facebook Page
 */
export async function postImageToFacebook(article: {
  title: string;
  slug: string;
  imageUrl: string;
  categoryName?: string;
}): Promise<string | null> {
  if (!FACEBOOK_ENABLED || !FACEBOOK_PAGE_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) {
    return null;
  }

  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    const articleUrl = `${siteUrl}/news/${article.slug}`;

    const hashtags = article.categoryName
      ? `#${article.categoryName.replace(/\s+/g, "")} #YapayZeka`
      : "#YapayZeka #AI";

    const caption = `📰 ${article.title}\n\n${hashtags}\n\n🔗 ${articleUrl}`;

    console.log("📘 Posting image to Facebook Page...");

    const response = await axios.post(
      `${GRAPH_API_URL}/${FACEBOOK_PAGE_ID}/photos`,
      {
        url: article.imageUrl,
        caption,
        access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
      },
    );

    console.log(`✅ Facebook image post successful! ID: ${response.data.id}`);
    return response.data.id;
  } catch (error: any) {
    console.error("❌ Facebook image post failed:", error?.message || error);
    return null;
  }
}

/**
 * Verify Facebook credentials are working
 */
export async function verifyFacebookCredentials(): Promise<boolean> {
  if (!FACEBOOK_PAGE_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) {
    console.error("❌ Facebook credentials not configured");
    return false;
  }

  try {
    const response = await axios.get(`${GRAPH_API_URL}/${FACEBOOK_PAGE_ID}`, {
      params: {
        fields: "name,id,access_token",
        access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
      },
    });

    console.log(
      `✅ Facebook connected to page: ${response.data.name} (ID: ${response.data.id})`,
    );
    return true;
  } catch (error: any) {
    console.error(
      "❌ Facebook verification failed:",
      error?.response?.data?.error?.message || error?.message,
    );
    return false;
  }
}

/**
 * Post to Facebook EN Page (English content)
 * Uses photo post for reliable image display
 */
export async function postToFacebookEN(article: {
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string | null;
  categoryName?: string;
}): Promise<string | null> {
  // Check if Facebook EN is enabled
  if (!FACEBOOK_EN_ENABLED) {
    return null; // Silent skip
  }

  // Check credentials
  if (!FACEBOOK_EN_PAGE_ID || !FACEBOOK_EN_PAGE_ACCESS_TOKEN) {
    console.warn("⚠️ Facebook EN credentials missing. Skipping post.");
    return null;
  }

  try {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    // Fix: slug already contains 'en/news/' prefix, so just use it directly
    const articleUrl = article.slug.startsWith("en/")
      ? `${siteUrl}/${article.slug}`
      : `${siteUrl}/en/news/${article.slug}`;

    // Create post message (English)
    const hashtags = article.categoryName
      ? `#${article.categoryName.replace(/\s+/g, "")} #AI #ArtificialIntelligence`
      : "#AI #ArtificialIntelligence #Tech";

    console.log("📘 Posting to Facebook EN Page...");

    let postId: string;

    // Use link post for clickable preview card — Facebook scrapes OG tags for image
    const message = `📰 ${article.title}\n\n${article.excerpt}\n\n${hashtags}`;

    const response = await axios.post(
      `${GRAPH_API_URL}/${FACEBOOK_EN_PAGE_ID}/feed`,
      {
        message,
        link: articleUrl,
        published: 1,
        access_token: FACEBOOK_EN_PAGE_ACCESS_TOKEN,
      },
    );
    postId = response.data.id;

    console.log(`✅ Facebook EN post successful! ID: ${postId}`);
    return postId;
  } catch (error: any) {
    const errorData = error?.response?.data?.error;

    if (errorData) {
      const errMsg = `Facebook EN API Error: ${errorData.message} (code: ${errorData.code}, type: ${errorData.type})`;
      console.error(`❌ ${errMsg}`);
      throw new Error(errMsg);
    } else {
      const errMsg = `Facebook EN post failed: ${error?.message || error}`;
      console.error(`❌ ${errMsg}`);
      throw new Error(errMsg);
    }
  }
}

/**
 * Check if Facebook EN is configured
 */
export function isFacebookENConfigured(): boolean {
  return !!(
    FACEBOOK_EN_ENABLED &&
    FACEBOOK_EN_PAGE_ID &&
    FACEBOOK_EN_PAGE_ACCESS_TOKEN
  );
}

export default {
  postToFacebook,
  postImageToFacebook,
  verifyFacebookCredentials,
  postToFacebookEN,
  isFacebookENConfigured,
};
