/**
 * Social Media Platform Configuration
 * Central configuration for all social media platforms
 *
 * Usage:
 * import { platformConfig, platformRateProfiles } from "@/config/social-platforms";
 */

export type SocialPlatformKey =
  | "FACEBOOK"
  | "FACEBOOK_EN"
  | "BLUESKY"
  | "BLUESKY_EN"
  | "MASTODON"
  | "MASTODON_EN";

export interface PlatformConfig {
  icon: string;
  color: string;
  label: string;
}

/**
 * Platform icons and colors configuration
 */
export const platformConfig: Record<SocialPlatformKey, PlatformConfig> = {
  FACEBOOK: { icon: "📘", color: "bg-blue-600", label: "Facebook TR" },
  FACEBOOK_EN: { icon: "📘", color: "bg-blue-500", label: "Facebook EN" },
  BLUESKY: { icon: "🦋", color: "bg-sky-500", label: "Bluesky TR" },
  BLUESKY_EN: { icon: "🦋", color: "bg-sky-400", label: "Bluesky EN" },
  MASTODON: { icon: "🐘", color: "bg-purple-600", label: "Mastodon TR" },
  MASTODON_EN: { icon: "🐘", color: "bg-purple-500", label: "Mastodon EN" },
};

/**
 * Platform rate limiting profiles
 * Used to calculate safe posting intervals
 */
export const platformRateProfiles: Record<string, { minIntervalSeconds: number }> = {
  FACEBOOK: { minIntervalSeconds: 30 },
  BLUESKY: { minIntervalSeconds: 5 },
  MASTODON: { minIntervalSeconds: 5 },
};

/**
 * Normalize platform key by removing _EN suffix
 * Useful for grouping TR/EN variants
 */
export const normalizePlatformKey = (platform: string): string =>
  platform.replace("_EN", "");

/**
 * Get recommended minimum interval for a set of platforms
 * Returns the maximum of all individual platform requirements
 */
export const getRecommendedMinInterval = (platforms: string[]): number => {
  if (platforms.length === 0) return 10;

  return Math.max(
    ...platforms.map((platform) => {
      const key = normalizePlatformKey(platform);
      return platformRateProfiles[key]?.minIntervalSeconds ?? 10;
    }),
  );
};

/**
 * All available platforms as array
 */
export const ALL_PLATFORMS: SocialPlatformKey[] = [
  "FACEBOOK",
  "FACEBOOK_EN",
  "BLUESKY",
  "BLUESKY_EN",
  "MASTODON",
  "MASTODON_EN",
];

/**
 * Turkish platforms only
 */
export const TURKISH_PLATFORMS: SocialPlatformKey[] = [
  "FACEBOOK",
  "BLUESKY",
  "MASTODON",
];

/**
 * English platforms only
 */
export const ENGLISH_PLATFORMS: SocialPlatformKey[] = [
  "FACEBOOK_EN",
  "BLUESKY_EN",
  "MASTODON_EN",
];
