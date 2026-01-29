/**
 * Scheduled Publishing Service
 * Automatically publishes articles at scheduled times
 */

import { prisma } from "./prisma";
import { logAudit } from "./audit";

/**
 * Check and publish scheduled articles
 */
export async function checkScheduledArticles() {
  try {
    const now = new Date();

    // Find articles scheduled for publishing
    const scheduledArticles = await prisma.article.findMany({
      where: {
        status: "DRAFT",
        scheduledPublishAt: {
          lte: now,
        },
      },
      include: {
        category: true,
      },
    });

    if (scheduledArticles.length === 0) {
      return { published: 0, failed: 0 };
    }

    let published = 0;
    let failed = 0;

    for (const article of scheduledArticles) {
      try {
        await prisma.article.update({
          where: { id: article.id },
          data: {
            status: "PUBLISHED",
            publishedAt: now,
            scheduledPublishAt: null, // Clear schedule
          },
        });

        // Log audit
        await logAudit({
          userId: "system",
          action: "SCHEDULED_PUBLISH",
          resource: "ARTICLE",
          resourceId: article.id,
          details: {
            title: article.title,
            scheduledFor: article.scheduledPublishAt,
            publishedAt: now,
          },
        });

        published++;
      } catch (error) {
        console.error(`Failed to publish article ${article.id}:`, error);
        failed++;
      }
    }

    return { published, failed };
  } catch (error) {
    console.error("[SCHEDULED_PUBLISHER_ERROR]", error);
    throw error;
  }
}

/**
 * Schedule an article for future publishing
 */
export async function scheduleArticle(
  articleId: string,
  publishAt: Date,
  userId: string,
) {
  try {
    const article = await prisma.article.update({
      where: { id: articleId },
      data: {
        scheduledPublishAt: publishAt,
        status: "DRAFT",
      },
    });

    // Log audit
    await logAudit({
      userId,
      action: "SCHEDULE_PUBLISH",
      resource: "ARTICLE",
      resourceId: articleId,
      details: {
        title: article.title,
        scheduledFor: publishAt,
      },
    });

    return article;
  } catch (error) {
    console.error("[SCHEDULE_ARTICLE_ERROR]", error);
    throw error;
  }
}

/**
 * Cancel scheduled publishing
 */
export async function cancelScheduledPublish(
  articleId: string,
  userId: string,
) {
  try {
    const article = await prisma.article.update({
      where: { id: articleId },
      data: {
        scheduledPublishAt: null,
      },
    });

    // Log audit
    await logAudit({
      userId,
      action: "CANCEL_SCHEDULE",
      resource: "ARTICLE",
      resourceId: articleId,
      details: {
        title: article.title,
      },
    });

    return article;
  } catch (error) {
    console.error("[CANCEL_SCHEDULE_ERROR]", error);
    throw error;
  }
}

/**
 * Get all scheduled articles
 */
export async function getScheduledArticles() {
  try {
    return await prisma.article.findMany({
      where: {
        status: "DRAFT",
        scheduledPublishAt: {
          not: null,
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        scheduledPublishAt: "asc",
      },
    });
  } catch (error) {
    console.error("[GET_SCHEDULED_ARTICLES_ERROR]", error);
    throw error;
  }
}
