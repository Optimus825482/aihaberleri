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
import { buildSocialArticleUrl } from "./url";

export interface FacebookRateLimitHeaders {
  xAppUsage?: string;
  xBusinessUseCaseUsage?: string;
  retryAfter?: string;
}

export interface FacebookPostResult {
  postId: string | null;
  rateLimitHeaders?: FacebookRateLimitHeaders;
}

interface FacebookPermissionDiagnosis {
  reason: "missing_scope" | "page_token_mismatch" | "unknown";
  detail: string;
}

const FACEBOOK_ENABLED = process.env.FACEBOOK_ENABLED === "true";
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

// English Facebook Page (separate page for EN content)
const FACEBOOK_EN_ENABLED = process.env.FACEBOOK_EN_ENABLED === "true";
const FACEBOOK_EN_PAGE_ID = process.env.FACEBOOK_EN_PAGE_ID;
const FACEBOOK_EN_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_EN_PAGE_ACCESS_TOKEN;

const GRAPH_API_URL = "https://graph.facebook.com/v21.0";

function extractFacebookRateLimitHeaders(
  headers: any,
): FacebookRateLimitHeaders {
  if (!headers) return {};

  return {
    xAppUsage: headers["x-app-usage"],
    xBusinessUseCaseUsage: headers["x-business-use-case-usage"],
    retryAfter: headers["retry-after"],
  };
}

async function diagnoseFacebookPermissionError(
  pageId: string,
  accessToken: string,
  label: "TR" | "EN",
): Promise<FacebookPermissionDiagnosis> {
  try {
    const response = await axios.get(`${GRAPH_API_URL}/${pageId}`, {
      params: {
        fields: "id,name,tasks",
        access_token: accessToken,
      },
    });

    const tasks = Array.isArray(response.data?.tasks)
      ? response.data.tasks.join(", ")
      : "unknown";

    return {
      reason: "missing_scope",
      detail: `Facebook ${label} token page'e erişebiliyor (${response.data?.name || pageId}) ama paylaşım izni eksik olabilir. Meta tarafında app için pages_manage_posts, pages_read_engagement ve ilgili page task yetkilerini kontrol et. Mevcut tasks: ${tasks}.`,
    };
  } catch (diagnosisError: any) {
    const diagnosisData = diagnosisError?.response?.data?.error;

    if (diagnosisData?.code === 200 || diagnosisData?.code === 190) {
      return {
        reason: "page_token_mismatch",
        detail: `Facebook ${label} token bu page ID ile eşleşmiyor olabilir ya da token süresi/bağlantısı bozulmuş olabilir. FACEBOOK_${label}_PAGE_ID ile FACEBOOK_${label}_PAGE_ACCESS_TOKEN çiftini aynı sayfadan yeniden üret.`,
      };
    }

    return {
      reason: "unknown",
      detail: `Facebook ${label} izin teşhisi tamamlanamadı: ${diagnosisData?.message || diagnosisError?.message || "unknown error"}`,
    };
  }
}

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
  const result = await postToFacebookWithMetadata(article);
  return result.postId;
}

export async function postToFacebookWithMetadata(article: {
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string | null;
  categoryName?: string;
}): Promise<FacebookPostResult> {
  // Check if Facebook is enabled
  if (!FACEBOOK_ENABLED) {
    return { postId: null }; // Silent skip
  }

  // Check credentials
  if (!FACEBOOK_PAGE_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) {
    console.warn("⚠️ Facebook credentials missing. Skipping post.");
    return { postId: null };
  }

  try {
    const articleUrl = buildSocialArticleUrl(article.slug, "tr");

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
    return {
      postId,
      rateLimitHeaders: extractFacebookRateLimitHeaders(response.headers),
    };
  } catch (error: any) {
    const errorData = error?.response?.data?.error;

    if (errorData) {
      const errMsg = `Facebook API Error: ${errorData.message} (code: ${errorData.code}, type: ${errorData.type})`;
      console.error(`❌ ${errMsg}`);

      // Handle specific errors
      if (errorData.code === 190) {
        console.error(
          "🔑 FACEBOOK TOKEN EXPIRED (code 190) — Yeni token almanız gerekiyor!\n" +
          "   Adımlar:\n" +
          "   1. https://developers.facebook.com/tools/explorer adresine git\n" +
          "   2. 'Get User Access Token' seç → pages_manage_posts + pages_read_engagement izinleri\n" +
          "   3. Token'ı long-lived token'a çevir (graph.facebook.com/oauth/access_token)\n" +
          "   4. /me/accounts ile Page Access Token al\n" +
          "   5. Coolify'da FACEBOOK_PAGE_ACCESS_TOKEN değerini güncelle",
        );
      } else if (errorData.code === 200) {
        const diagnosis = await diagnoseFacebookPermissionError(
          FACEBOOK_PAGE_ID!,
          FACEBOOK_PAGE_ACCESS_TOKEN!,
          "TR",
        );
        console.warn(
          "   📌 Permission denied. Check pages_manage_posts permission.",
        );
        console.warn(`   📌 ${diagnosis.detail}`);
      } else if (errorData.code === 368) {
        console.warn("   📌 Content policy violation. Check post content.");
      } else if (errorData.code === 4 || errorData.code === 17 || errorData.code === 32) {
        console.warn(`   📌 Rate limit hit (code ${errorData.code}). Backing off.`);
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
    const articleUrl = buildSocialArticleUrl(article.slug, "tr");

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
  const result = await postToFacebookENWithMetadata(article);
  return result.postId;
}

export async function postToFacebookENWithMetadata(article: {
  title: string;
  slug: string;
  excerpt: string;
  imageUrl?: string | null;
  categoryName?: string;
}): Promise<FacebookPostResult> {
  // Check if Facebook EN is enabled
  if (!FACEBOOK_EN_ENABLED) {
    return { postId: null }; // Silent skip
  }

  // Check credentials
  if (!FACEBOOK_EN_PAGE_ID || !FACEBOOK_EN_PAGE_ACCESS_TOKEN) {
    console.warn("⚠️ Facebook EN credentials missing. Skipping post.");
    return { postId: null };
  }

  try {
    const articleUrl = buildSocialArticleUrl(article.slug, "en");

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
    return {
      postId,
      rateLimitHeaders: extractFacebookRateLimitHeaders(response.headers),
    };
  } catch (error: any) {
    const errorData = error?.response?.data?.error;

    if (errorData) {
      const errMsg = `Facebook EN API Error: ${errorData.message} (code: ${errorData.code}, type: ${errorData.type})`;
      console.error(`❌ ${errMsg}`);

      if (errorData.code === 190) {
        console.warn(
          "   📌 Facebook EN token expired. Generate a new EN Page Access Token.",
        );
      } else if (errorData.code === 200) {
        const diagnosis = await diagnoseFacebookPermissionError(
          FACEBOOK_EN_PAGE_ID!,
          FACEBOOK_EN_PAGE_ACCESS_TOKEN!,
          "EN",
        );
        console.warn(
          "   📌 Permission denied. Check pages_manage_posts permission.",
        );
        console.warn(`   📌 ${diagnosis.detail}`);
      } else if (errorData.code === 368) {
        console.warn(
          "   📌 Facebook EN content policy violation. Check post content.",
        );
      }

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
  postToFacebookWithMetadata,
  postImageToFacebook,
  verifyFacebookCredentials,
  postToFacebookEN,
  postToFacebookENWithMetadata,
  isFacebookENConfigured,
};
