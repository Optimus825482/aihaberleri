/**
 * Social Share Tracking Service
 * Records social media share status to database
 */

import { db } from "@/lib/db";
import { SocialPlatform, ShareStatus } from "@prisma/client";

export interface ShareResult {
  platform: SocialPlatform;
  language: string;
  success: boolean;
  postId?: string | null;
  postUrl?: string | null;
  error?: string;
}

/**
 * Record a successful social share
 */
export async function recordShareSuccess(
  articleId: string,
  platform: SocialPlatform,
  language: string = "tr",
  postId?: string | null,
  postUrl?: string | null,
): Promise<void> {
  try {
    await db.socialShare.upsert({
      where: {
        articleId_platform_language: {
          articleId,
          platform,
          language,
        },
      },
      create: {
        articleId,
        platform,
        language,
        status: "SHARED",
        postId,
        postUrl,
        sharedAt: new Date(),
      },
      update: {
        status: "SHARED",
        postId,
        postUrl,
        sharedAt: new Date(),
        error: null,
      },
    });
    console.log(`   📊 Share recorded: ${platform} (${language})`);
  } catch (error) {
    console.error(`Failed to record share for ${platform}:`, error);
    // Don't throw - this is a tracking operation
  }
}

/**
 * Record a failed social share
 */
export async function recordShareFailure(
  articleId: string,
  platform: SocialPlatform,
  language: string = "tr",
  error: string,
): Promise<void> {
  try {
    await db.socialShare.upsert({
      where: {
        articleId_platform_language: {
          articleId,
          platform,
          language,
        },
      },
      create: {
        articleId,
        platform,
        language,
        status: "FAILED",
        error,
        retryCount: 1,
      },
      update: {
        status: "FAILED",
        error,
        retryCount: { increment: 1 },
      },
    });
  } catch (err) {
    console.error(`Failed to record share failure for ${platform}:`, err);
  }
}

/**
 * Record multiple share results at once
 */
export async function recordShareResults(
  articleId: string,
  results: ShareResult[],
): Promise<void> {
  for (const result of results) {
    if (result.success) {
      await recordShareSuccess(
        articleId,
        result.platform,
        result.language,
        result.postId,
        result.postUrl,
      );
    } else {
      await recordShareFailure(
        articleId,
        result.platform,
        result.language,
        result.error || "Unknown error",
      );
    }
  }
}

/**
 * Get share status for an article
 */
export async function getArticleShareStatus(
  articleId: string,
): Promise<Record<string, any>> {
  const shares = await db.socialShare.findMany({
    where: { articleId },
    select: {
      platform: true,
      language: true,
      status: true,
      postId: true,
      sharedAt: true,
      error: true,
    },
  });

  const result: Record<string, any> = {};
  shares.forEach((share) => {
    const key = `${share.platform}_${share.language}`;
    result[key] = share;
  });

  return result;
}

/**
 * Check if article was shared to a platform
 */
export async function wasSharedTo(
  articleId: string,
  platform: SocialPlatform,
  language: string = "tr",
): Promise<boolean> {
  const share = await db.socialShare.findUnique({
    where: {
      articleId_platform_language: {
        articleId,
        platform,
        language,
      },
    },
    select: { status: true },
  });

  return share?.status === "SHARED";
}

/**
 * Initialize social share records for a newly published article
 * Creates PENDING records for all platforms (TR and EN)
 */
export async function initializeShareRecords(articleId: string): Promise<void> {
  // All platforms that we support
  const platforms: SocialPlatform[] = [
    "FACEBOOK",
    "TWITTER",
    "BLUESKY",
    "MASTODON",
    "TUMBLR",
  ];

  // Languages - TR for Turkish platforms, EN for English platforms
  const languages = ["tr", "en"];

  try {
    const records = [];

    for (const platform of platforms) {
      for (const language of languages) {
        records.push({
          articleId,
          platform,
          language,
          status: "PENDING" as ShareStatus,
        });
      }
    }

    // Use createMany with skipDuplicates to avoid errors if records exist
    await db.socialShare.createMany({
      data: records,
      skipDuplicates: true,
    });

    console.log(
      `   📋 Initialized ${records.length} share records for article`,
    );
  } catch (error) {
    console.error("Failed to initialize share records:", error);
    // Don't throw - this is a tracking operation
  }
}
