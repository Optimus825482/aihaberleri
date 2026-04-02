export const SOCIAL_SHARE_PLATFORMS = [
  "FACEBOOK",
  "FACEBOOK_EN",
  "BLUESKY",
  "BLUESKY_EN",
  "MASTODON",
  "MASTODON_EN",
] as const;

export const PENDING_SHARE_STATUSES = new Set([
  "PENDING",
  "SCHEDULED",
  "PROCESSING",
]);

export const ACTIVE_SHARE_STATUSES = new Set([
  "SHARED",
  "PENDING",
  "SCHEDULED",
  "PROCESSING",
]);

export type AdminShareRecord = {
  id?: string;
  platform: string;
  language: string;
  status: string;
  postId?: string | null;
  sharedAt?: Date | null;
  error?: string | null;
  retryCount?: number | null;
};

export function normalizeSocialSharePlatform(
  platform: string,
  language: string,
) {
  if (!platform.endsWith("_EN") && language === "en") {
    return `${platform}_EN`;
  }

  return platform;
}

export function buildAdminShareMap(shares: AdminShareRecord[]) {
  const shareMap: Record<string, any> = {};

  SOCIAL_SHARE_PLATFORMS.forEach((platform) => {
    shareMap[platform] = { status: "NOT_CREATED", platform };
  });

  shares.forEach((share) => {
    shareMap[normalizeSocialSharePlatform(share.platform, share.language)] = share;
  });

  return shareMap;
}

export function getEffectiveShareStatus(
  status: string | null,
  visibility: string | null,
) {
  if (status) {
    return status;
  }

  if (visibility === "shared") return "SHARED";
  if (visibility === "failed") return "FAILED";
  if (visibility === "pending") return "PENDING";

  return null;
}

export function matchesShareStatus(
  currentStatus: string,
  expectedStatus: string | null,
) {
  if (!expectedStatus) {
    return true;
  }

  if (expectedStatus === "PENDING") {
    return PENDING_SHARE_STATUSES.has(currentStatus);
  }

  return currentStatus === expectedStatus;
}

export function shareNeedsPosting(currentStatus: string | undefined) {
  return !currentStatus || !ACTIVE_SHARE_STATUSES.has(currentStatus);
}
