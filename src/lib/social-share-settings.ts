/**
 * Social Share Platform Settings
 *
 * DB-based toggles for enabling/disabling auto-sharing per platform.
 * Keys stored in Setting model with prefix "social_share_".
 * Default: all platforms enabled (backward compatible).
 */

import { db } from "@/lib/db";

export const SOCIAL_SHARE_PLATFORMS = [
  {
    key: "social_share_twitter_tr",
    platform: "twitter_tr",
    label: "Twitter (TR)",
    emoji: "🐦",
    description: "Türkçe tweet paylaşımı",
  },
  {
    key: "social_share_facebook_tr",
    platform: "facebook_tr",
    label: "Facebook (TR)",
    emoji: "📘",
    description: "Türkçe Facebook sayfasına paylaşım",
  },
  {
    key: "social_share_facebook_en",
    platform: "facebook_en",
    label: "Facebook (EN)",
    emoji: "📘",
    description: "İngilizce Facebook sayfasına paylaşım",
  },
  {
    key: "social_share_bluesky_tr",
    platform: "bluesky_tr",
    label: "Bluesky (TR)",
    emoji: "🦋",
    description: "Türkçe Bluesky paylaşımı",
  },
  {
    key: "social_share_bluesky_en",
    platform: "bluesky_en",
    label: "Bluesky (EN)",
    emoji: "🦋",
    description: "İngilizce Bluesky paylaşımı",
  },
  {
    key: "social_share_mastodon_tr",
    platform: "mastodon_tr",
    label: "Mastodon (TR)",
    emoji: "🐘",
    description: "Türkçe Mastodon paylaşımı",
  },
  {
    key: "social_share_mastodon_en",
    platform: "mastodon_en",
    label: "Mastodon (EN)",
    emoji: "🐘",
    description: "İngilizce Mastodon paylaşımı",
  },
] as const;

export type SocialSharePlatformKey =
  (typeof SOCIAL_SHARE_PLATFORMS)[number]["platform"];

/**
 * Check if a specific platform is enabled for auto-sharing.
 * Returns true by default (backward compatible) if no setting exists.
 */
export async function isPlatformEnabled(platform: string): Promise<boolean> {
  try {
    const settingKey = `social_share_${platform}`;
    const setting = await db.setting.findUnique({
      where: { key: settingKey },
      select: { value: true },
    });

    // Default: enabled (backward compatible)
    if (!setting) return true;

    return setting.value === "true";
  } catch (error) {
    console.error(`Failed to check platform setting for ${platform}:`, error);
    // On error, default to enabled to not block sharing
    return true;
  }
}

/**
 * Get all platform enable/disable statuses at once.
 * More efficient than calling isPlatformEnabled for each platform.
 */
export async function getAllPlatformSettings(): Promise<
  Record<string, boolean>
> {
  try {
    const settings = await db.setting.findMany({
      where: {
        key: {
          startsWith: "social_share_",
        },
      },
      select: { key: true, value: true },
    });

    const result: Record<string, boolean> = {};

    // Initialize all platforms as enabled (default)
    for (const p of SOCIAL_SHARE_PLATFORMS) {
      result[p.platform] = true;
    }

    // Override with DB values
    for (const setting of settings) {
      const platform = setting.key.replace("social_share_", "");
      result[platform] = setting.value === "true";
    }

    return result;
  } catch (error) {
    console.error("Failed to fetch platform settings:", error);
    // On error, return all enabled
    const result: Record<string, boolean> = {};
    for (const p of SOCIAL_SHARE_PLATFORMS) {
      result[p.platform] = true;
    }
    return result;
  }
}
