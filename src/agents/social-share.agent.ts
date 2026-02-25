/**
 * Social Share Agent
 *
 * RESPONSIBILITIES:
 * 1. Post to Twitter (TR)
 * 2. Post to Facebook (TR + EN)
 * 3. Post to Bluesky (TR + EN)
 * 4. Post to Mastodon (TR + EN)
 *
 * Split from DatabasePublisher (2026-02-12) to follow SRP.
 * Social media errors no longer affect article publishing.
 */

import { Job } from "bullmq";
import { BaseAgent, AgentResult } from "./base-agent";
import { QUEUE_NAMES } from "@/lib/queue-manager";
import {
  recordShareSuccess,
  recordShareFailure,
} from "@/services/social-share.service";
import { getAllPlatformSettings } from "@/lib/social-share-settings";

export interface SocialShareInput {
  articleId: string;
  slug: string;
  title: string;
  excerpt: string;
  imageUrl?: string | null;
  categoryName: string;
  enSlug?: string;
  enTitle?: string;
  enExcerpt?: string;
}

export interface SocialShareResult {
  articleId: string;
  platforms: Record<string, { success: boolean; error?: string }>;
}

export class SocialShareAgent extends BaseAgent<
  SocialShareInput[],
  SocialShareResult[]
> {
  protected config = {
    name: "social-share",
    queueName: QUEUE_NAMES.SOCIAL_SHARE,
    enableMetrics: true,
  };

  constructor() {
    super("social-share");
  }

  protected async process(
    job: Job<SocialShareInput[]>,
  ): Promise<AgentResult<SocialShareResult[]>> {
    const articles = job.data;
    const startTime = Date.now();

    this.logger.info(`Sharing ${articles.length} articles to social media...`);

    if (articles.length === 0) {
      return {
        success: true,
        data: [],
        skipNextQueue: true,
        metrics: {
          processingTime: Date.now() - startTime,
          apiCalls: 0,
          itemsProcessed: 0,
        },
      };
    }

    const results: SocialShareResult[] = [];

    // Fetch platform enable/disable settings from DB (single query)
    const platformSettings = await getAllPlatformSettings();
    const disabledPlatforms = Object.entries(platformSettings)
      .filter(([, enabled]) => !enabled)
      .map(([key]) => key);

    if (disabledPlatforms.length > 0) {
      this.logger.info(
        `⚙️ Disabled platforms: ${disabledPlatforms.join(", ")}`,
      );
    }

    for (const article of articles) {
      const platforms: Record<string, { success: boolean; error?: string }> =
        {};

      // ============================================
      // TURKISH SOCIAL MEDIA SHARES
      // ============================================

      // Twitter TR
      if (platformSettings["twitter_tr"]) {
        platforms["twitter_tr"] = await this.shareToTwitter(article);
      } else {
        platforms["twitter_tr"] = {
          success: false,
          error: "Platform disabled",
        };
      }

      // Facebook TR
      if (platformSettings["facebook_tr"]) {
        platforms["facebook_tr"] = await this.shareToFacebook(article, "tr");
      } else {
        platforms["facebook_tr"] = {
          success: false,
          error: "Platform disabled",
        };
      }

      // Bluesky TR
      if (platformSettings["bluesky_tr"]) {
        platforms["bluesky_tr"] = await this.shareToBluesky(article, "tr");
      } else {
        platforms["bluesky_tr"] = {
          success: false,
          error: "Platform disabled",
        };
      }

      // Mastodon TR
      if (platformSettings["mastodon_tr"]) {
        platforms["mastodon_tr"] = await this.shareToMastodon(article, "tr");
      } else {
        platforms["mastodon_tr"] = {
          success: false,
          error: "Platform disabled",
        };
      }

      // ============================================
      // ENGLISH SOCIAL MEDIA SHARES
      // ============================================
      if (article.enSlug && article.enTitle) {
        // Facebook EN
        if (platformSettings["facebook_en"]) {
          platforms["facebook_en"] = await this.shareToFacebook(article, "en");
        } else {
          platforms["facebook_en"] = {
            success: false,
            error: "Platform disabled",
          };
        }

        // Bluesky EN
        if (platformSettings["bluesky_en"]) {
          platforms["bluesky_en"] = await this.shareToBluesky(article, "en");
        } else {
          platforms["bluesky_en"] = {
            success: false,
            error: "Platform disabled",
          };
        }

        // Mastodon EN
        if (platformSettings["mastodon_en"]) {
          platforms["mastodon_en"] = await this.shareToMastodon(article, "en");
        } else {
          platforms["mastodon_en"] = {
            success: false,
            error: "Platform disabled",
          };
        }
      }

      const successCount = Object.values(platforms).filter(
        (p) => p.success,
      ).length;
      const totalCount = Object.keys(platforms).length;
      this.logger.info(
        `📱 ${article.title.substring(0, 40)}... — ${successCount}/${totalCount} platforms shared`,
      );

      results.push({ articleId: article.articleId, platforms });
    }

    this.logger.success(
      `Social sharing complete: ${results.length} articles processed`,
    );

    return {
      success: true,
      data: results,
      skipNextQueue: true, // Final step
      metrics: {
        processingTime: Date.now() - startTime,
        apiCalls: results.reduce(
          (sum, r) =>
            sum +
            Object.values(r.platforms).filter(
              (p) => p.success || (p.error && p.error !== "Platform disabled"),
            ).length,
          0,
        ),
        itemsProcessed: results.length,
      },
    };
  }

  private async shareToTwitter(
    article: SocialShareInput,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { postTweet } = await import("@/lib/social/twitter");
      await postTweet({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        categoryName: article.categoryName,
      });
      this.logger.info(`🐦 Tweet posted: ${article.slug}`);
      return { success: true };
    } catch (err: any) {
      this.logger.warn(`🐦 Tweet failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  private async shareToFacebook(
    article: SocialShareInput,
    locale: "tr" | "en",
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (locale === "en") {
        const { postToFacebookEN } = await import("@/lib/social/facebook");
        const postId = await postToFacebookEN({
          title: article.enTitle || article.title,
          slug: `en/news/${article.enSlug}`,
          excerpt: article.enExcerpt || article.excerpt,
          imageUrl: article.imageUrl || undefined,
          categoryName: "AI News",
        });
        if (postId) {
          await recordShareSuccess(
            article.articleId,
            "FACEBOOK_EN",
            "en",
            postId,
          );
        }
        this.logger.info(`📘 Facebook EN posted: ${article.enSlug}`);
        return { success: true };
      }

      const { postToFacebook } = await import("@/lib/social/facebook");
      const postId = await postToFacebook({
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        imageUrl: article.imageUrl || undefined,
        categoryName: article.categoryName,
      });
      if (postId) {
        await recordShareSuccess(article.articleId, "FACEBOOK", "tr", postId);
      }
      this.logger.info(`📘 Facebook TR posted: ${article.slug}`);
      return { success: true };
    } catch (err: any) {
      await recordShareFailure(
        article.articleId,
        locale === "en" ? "FACEBOOK_EN" : "FACEBOOK",
        locale,
        err.message,
      );
      this.logger.warn(
        `📘 Facebook ${locale.toUpperCase()} failed: ${err.message}`,
      );
      return { success: false, error: err.message };
    }
  }

  private async shareToBluesky(
    article: SocialShareInput,
    locale: "tr" | "en",
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { postToBluesky } = await import("@/lib/social/bluesky");
      const isEn = locale === "en";
      const postId = await postToBluesky({
        title: isEn ? article.enTitle || article.title : article.title,
        slug: isEn ? `en/news/${article.enSlug}` : article.slug,
        excerpt: isEn ? article.enExcerpt || article.excerpt : article.excerpt,
        imageUrl: article.imageUrl || undefined,
        categoryName: isEn ? "AI News" : article.categoryName,
      });
      if (postId) {
        await recordShareSuccess(article.articleId, "BLUESKY", locale, postId);
      }
      this.logger.info(`🦋 Bluesky ${locale.toUpperCase()} posted`);
      return { success: true };
    } catch (err: any) {
      await recordShareFailure(
        article.articleId,
        "BLUESKY",
        locale,
        err.message,
      );
      this.logger.warn(
        `🦋 Bluesky ${locale.toUpperCase()} failed: ${err.message}`,
      );
      return { success: false, error: err.message };
    }
  }

  private async shareToMastodon(
    article: SocialShareInput,
    locale: "tr" | "en",
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { postToMastodon } = await import("@/lib/social/mastodon");
      const isEn = locale === "en";
      const postId = await postToMastodon({
        title: isEn ? article.enTitle || article.title : article.title,
        slug: isEn ? `en/news/${article.enSlug}` : article.slug,
        excerpt: isEn ? article.enExcerpt || article.excerpt : article.excerpt,
        imageUrl: article.imageUrl || undefined,
        categoryName: isEn ? "AI News" : article.categoryName,
      });
      if (postId) {
        await recordShareSuccess(article.articleId, "MASTODON", locale, postId);
      }
      this.logger.info(`🐘 Mastodon ${locale.toUpperCase()} posted`);
      return { success: true };
    } catch (err: any) {
      await recordShareFailure(
        article.articleId,
        "MASTODON",
        locale,
        err.message,
      );
      this.logger.warn(
        `🐘 Mastodon ${locale.toUpperCase()} failed: ${err.message}`,
      );
      return { success: false, error: err.message };
    }
  }
}
