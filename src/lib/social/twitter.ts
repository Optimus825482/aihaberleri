/**
 * Twitter/X Social Posting Service
 *
 * STATUS: DISABLED
 * Reason: Twitter API Free tier no longer supports posting tweets.
 * Requires Basic plan ($100/month) for write access.
 *
 * ALTERNATIVE OPTIONS:
 * 1. Telegram Bot (Free, unlimited)
 * 2. Discord Webhook (Free, unlimited)
 * 3. Manual sharing via Twitter Intent URL
 */

// Environment variable to enable/disable Twitter posting
const TWITTER_ENABLED = process.env.TWITTER_ENABLED === "true";

/**
 * Post a tweet about a new article
 * Currently disabled due to Twitter API pricing changes.
 */
export async function postTweet(article: {
  title: string;
  slug: string;
  excerpt: string;
  categoryName?: string;
}): Promise<string | null> {
  // Check if Twitter is explicitly enabled
  if (!TWITTER_ENABLED) {
    // Silent skip - no error logs, just return null
    return null;
  }

  // Check if credentials exist
  const appKey = process.env.TWITTER_API_KEY;
  const appSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    console.warn("⚠️ Twitter API credentials missing. Skipping tweet.");
    return null;
  }

  try {
    // Dynamic import to avoid loading twitter-api-v2 when disabled
    const { TwitterApi } = await import("twitter-api-v2");

    const client = new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
    });

    const rwClient = client.readWrite;

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    const articleUrl = `${siteUrl}/news/${article.slug}`;

    // Create hashtags
    const categoryTag = article.categoryName
      ? `#${article.categoryName.replace(/\s+/g, "")}`
      : "#YapayZeka";
    const tags = `${categoryTag} #AI #Teknoloji #Haber`;

    // Format tweet (Max 280 chars)
    let tweetText = `📰 ${article.title}\n\n`;

    if (tweetText.length < 150) {
      tweetText += `${article.excerpt.substring(0, 100)}...\n\n`;
    }

    tweetText += `${tags}\n${articleUrl}`;

    console.log("🐦 Posting to Twitter...");
    const result = await rwClient.v2.tweet(tweetText);
    console.log(`✅ Tweet posted successfully! ID: ${result.data.id}`);

    return result.data.id;
  } catch (error: any) {
    const statusCode = error?.code || error?.status || error?.response?.status;

    if (statusCode === 402 || error?.message?.includes("402")) {
      console.warn("⚠️ Twitter API requires paid plan. Skipping.");
      return null;
    }

    console.error("❌ Tweet failed:", error?.message || error);
    return null;
  }
}

/**
 * Generate a Twitter Intent URL for manual sharing
 * This opens Twitter with pre-filled tweet text
 */
export function generateTwitterIntentUrl(article: {
  title: string;
  slug: string;
  categoryName?: string;
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
  const articleUrl = `${siteUrl}/news/${article.slug}`;

  const categoryTag = article.categoryName
    ? `#${article.categoryName.replace(/\s+/g, "")}`
    : "#YapayZeka";

  const tweetText = `📰 ${article.title}\n\n${categoryTag} #AI #Teknoloji\n${articleUrl}`;

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
}
