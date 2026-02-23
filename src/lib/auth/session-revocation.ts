import { getRedis } from "@/lib/redis";

const USER_REVOKED_AFTER_PREFIX = "auth:revoked-after:";
const REVOCATION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function setUserRevokedAfter(
  userId: string,
  timestampMs: number = Date.now(),
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  await redis.set(
    `${USER_REVOKED_AFTER_PREFIX}${userId}`,
    timestampMs.toString(),
    "EX",
    REVOCATION_TTL_SECONDS,
  );
}

export async function getUserRevokedAfter(
  userId: string,
): Promise<number | null> {
  const redis = getRedis();
  if (!redis) return null;

  const raw = await redis.get(`${USER_REVOKED_AFTER_PREFIX}${userId}`);
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function isJwtRevokedByTimestamp(
  userId: string,
  issuedAtSeconds?: number,
): Promise<boolean> {
  const revokedAfterMs = await getUserRevokedAfter(userId);
  if (!revokedAfterMs) return false;
  if (!issuedAtSeconds) return true;

  return issuedAtSeconds * 1000 <= revokedAfterMs;
}
