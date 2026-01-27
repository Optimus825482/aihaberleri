import { TwitterApi } from "twitter-api-v2";

/**
 * Post a tweet about a new article
 */
export async function postTweet(article: {
  title: string;
  slug: string;
  excerpt: string;
  categoryName?: string;
}) {
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
    const client = new TwitterApi({
      appKey,
      appSecret,
      accessToken,
      accessSecret,
    });

    const rwClient = client.readWrite;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://aihaberleri.org";
    const articleUrl = `${siteUrl}/news/${article.slug}`;
    
    // Create hashtags
    const categoryTag = article.categoryName 
      ? `#${article.categoryName.replace(/\s+/g, "")}` 
      : "#YapayZeka";
    const tags = `${categoryTag} #AI #Teknoloji #Haber`;

    // Format tweet (Max 280 chars)
    // URL takes ~23 chars. Hashtags ~30-40.
    // Allow ~200 chars for title + excerpt
    
    let tweetText = `📰 ${article.title}\n\n`;
    
    // Add brief excerpt if space permits
    if (tweetText.length < 150) {
      tweetText += `${article.excerpt.substring(0, 100)}...\n\n`;
    }

    tweetText += `${tags}\n${articleUrl}`;

    console.log("🐦 Posting to Twitter...");
    const result = await rwClient.v2.tweet(tweetText);
    console.log(`✅ Tweet posted successfully! ID: ${result.data.id}`);
    
    return result.data.id;

  } catch (error) {
    console.error("❌ Failed to post tweet:", error);
    return null;
  }
}
