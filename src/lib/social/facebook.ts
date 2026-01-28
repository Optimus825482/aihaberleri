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
const GRAPH_API_URL = "https://graph.facebook.com/v18.0";

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

    // If we have an image, post with image (link post)
    if (article.imageUrl) {
      // Post as link with image preview
      const response = await axios.post(
        `${GRAPH_API_URL}/${FACEBOOK_PAGE_ID}/feed`,
        {
          message,
          link: articleUrl,
          access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
        },
      );
      postId = response.data.id;
    } else {
      // Post as text with link
      const response = await axios.post(
        `${GRAPH_API_URL}/${FACEBOOK_PAGE_ID}/feed`,
        {
          message: `${message}\n\n🔗 ${articleUrl}`,
          access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
        },
      );
      postId = response.data.id;
    }

    console.log(`✅ Facebook post successful! ID: ${postId}`);
    return postId;
  } catch (error: any) {
    const errorData = error?.response?.data?.error;

    if (errorData) {
      console.error("❌ Facebook API Error:", {
        message: errorData.message,
        type: errorData.type,
        code: errorData.code,
      });

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
    } else {
      console.error("❌ Facebook post failed:", error?.message || error);
    }

    return null;
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

export default {
  postToFacebook,
  postImageToFacebook,
  verifyFacebookCredentials,
};
