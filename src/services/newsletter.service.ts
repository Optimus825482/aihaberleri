/**
 * Newsletter Service
 *
 * Handles automated daily newsletter sending and push notifications
 *
 * Features:
 * - Daily digest at 19:00 Turkey time
 * - Sends today's published articles to all subscribers
 * - Push notification when newsletter is sent
 * - Manual trigger support
 */

import { db } from "@/lib/db";
import { emailService } from "@/lib/email";
import { sendPushNotification } from "@/lib/push";

export interface DailyDigestResult {
  success: boolean;
  articlesCount: number;
  subscribersCount: number;
  sent: number;
  failed: number;
  errors: string[];
  pushSent: boolean;
}

/**
 * Get today's top trending published articles
 * Sorted by views (most-read first), limited to 30 articles
 */
export async function getTodayArticles() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const articles = await db.article.findMany({
    where: {
      status: "PUBLISHED",
      publishedAt: {
        gte: today,
        lt: tomorrow,
      },
    },
    select: {
      title: true,
      excerpt: true,
      slug: true,
      imageUrl: true,
      views: true,
      category: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [
      { views: "desc" }, // Primary: Most viewed (trending)
      { publishedAt: "desc" }, // Secondary: Newest
    ],
    take: 30, // Top 30 most-read articles
  });

  return articles.map((article, index) => ({
    title: article.title,
    excerpt: article.excerpt || "",
    slug: article.slug,
    category: article.category?.name || "Genel",
    imageUrl: article.imageUrl || undefined,
    viewCount: article.views || 0,
    trendRank: index + 1,
  }));
}

/**
 * Get active newsletter subscribers
 */
export async function getActiveSubscribers() {
  return db.newsletter.findMany({
    where: {
      status: "ACTIVE",
    },
    select: {
      email: true,
      token: true,
    },
  });
}

/**
 * Send daily digest newsletter to all subscribers
 * This is called by the scheduled job at 19:00 every day
 */
export async function sendDailyDigest(): Promise<DailyDigestResult> {
  console.log("📧 Starting daily newsletter digest...");

  try {
    // Get today's articles
    const articles = await getTodayArticles();
    console.log(`📰 Found ${articles.length} articles published today`);

    // Get active subscribers
    const subscribers = await getActiveSubscribers();
    console.log(`👥 Found ${subscribers.length} active subscribers`);

    if (subscribers.length === 0) {
      console.log("⚠️ No active subscribers, skipping newsletter");
      return {
        success: true,
        articlesCount: articles.length,
        subscribersCount: 0,
        sent: 0,
        failed: 0,
        errors: [],
        pushSent: false,
      };
    }

    // Send newsletter even if no articles (to keep engagement)
    const result = await emailService.sendDailyDigest(subscribers, articles);

    console.log(
      `✅ Newsletter sent: ${result.sent} successful, ${result.failed} failed`,
    );

    // Update last sent date for all subscribers who received the email
    await db.newsletter.updateMany({
      where: { status: "ACTIVE" },
      data: { lastSentAt: new Date() },
    });

    // Send push notification about the newsletter
    let pushSent = false;
    if (articles.length > 0) {
      try {
        await sendPushNotification(
          "📰 Günün AI Haberleri",
          `${articles.length} yeni haber yayınlandı! Günlük bülteniniz hazır.`,
          "/",
        );
        pushSent = true;
        console.log("📱 Newsletter push notification sent");
      } catch (error) {
        console.error("❌ Failed to send newsletter push:", error);
      }
    }

    // Log the newsletter send (use metadata for type since AgentLog doesn't have type field)
    await db.agentLog.create({
      data: {
        status: result.failed === 0 ? "SUCCESS" : "PARTIAL",
        articlesCreated: result.sent,
        articlesScraped: articles.length,
        duration: 0,
        errors: result.errors,
        metadata: {
          logType: "NEWSLETTER",
          type: "daily-digest",
          articlesCount: articles.length,
          subscribersCount: subscribers.length,
          sent: result.sent,
          failed: result.failed,
          pushSent,
        },
      },
    });

    return {
      success: true,
      articlesCount: articles.length,
      subscribersCount: subscribers.length,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      pushSent,
    };
  } catch (error) {
    console.error("❌ Daily digest failed:", error);

    // Log the failure (use metadata for type since AgentLog doesn't have type field)
    await db.agentLog.create({
      data: {
        status: "FAILED",
        articlesCreated: 0,
        articlesScraped: 0,
        duration: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
        metadata: {
          logType: "NEWSLETTER",
          type: "daily-digest",
          error: true,
        },
      },
    });

    return {
      success: false,
      articlesCount: 0,
      subscribersCount: 0,
      sent: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
      pushSent: false,
    };
  }
}

/**
 * Send push notification to all subscribers
 * Can be used for manual notifications from admin panel
 */
export async function sendBroadcastPush(
  title: string,
  message: string,
  url: string = "/",
): Promise<{ success: boolean; sent: number; error?: string }> {
  try {
    const result = await sendPushNotification(title, message, url);
    return {
      success: true,
      sent: result?.sent || 0,
    };
  } catch (error) {
    console.error("❌ Broadcast push failed:", error);
    return {
      success: false,
      sent: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
