/**
 * GeoIP Cache Layer with Rate Limit Protection
 * Prevents ip-api.com rate limit issues (45 req/min free tier)
 */

import { getRedis } from "./redis";

interface GeoIPData {
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
}

const RATE_LIMIT_KEY = "geoip:ratelimit";
const RATE_LIMIT_MAX = 40; // Leave 5 req buffer
const RATE_LIMIT_WINDOW = 60; // 1 minute

/**
 * Get GeoIP data with caching and rate limit protection
 */
export async function getCachedGeoIP(ip: string): Promise<GeoIPData | null> {
  const redis = getRedis();
  if (!redis) {
    return fetchGeoIPDirect(ip);
  }

  // Check cache first (24 hour TTL)
  const cacheKey = `geoip:${ip}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached as string);
    }
  } catch (error) {
    console.warn("GeoIP cache read failed:", error);
  }

  // Check rate limit
  try {
    const count = await redis.incr(RATE_LIMIT_KEY);

    if (count === 1) {
      await redis.expire(RATE_LIMIT_KEY, RATE_LIMIT_WINDOW);
    }

    if (count > RATE_LIMIT_MAX) {
      console.warn(`GeoIP rate limit reached (${count}/${RATE_LIMIT_MAX})`);
      return null; // Skip lookup to prevent rate limit
    }
  } catch (error) {
    console.warn("Rate limit check failed:", error);
  }

  // Fetch from API
  const data = await fetchGeoIPDirect(ip);

  // Cache for 24 hours
  if (data) {
    try {
      await redis.setex(cacheKey, 86400, JSON.stringify(data));
    } catch (error) {
      console.warn("GeoIP cache write failed:", error);
    }
  }

  return data;
}

/**
 * Batch GeoIP lookup with rate limit protection
 */
export async function getCachedGeoIPBatch(
  ips: string[],
): Promise<Map<string, GeoIPData>> {
  const redis = getRedis();
  const results = new Map<string, GeoIPData>();
  const uncachedIPs: string[] = [];

  // Check cache for all IPs
  if (redis) {
    for (const ip of ips) {
      const cacheKey = `geoip:${ip}`;
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          results.set(ip, JSON.parse(cached as string));
        } else {
          uncachedIPs.push(ip);
        }
      } catch (error) {
        uncachedIPs.push(ip);
      }
    }
  } else {
    uncachedIPs.push(...ips);
  }

  // If all cached, return
  if (uncachedIPs.length === 0) {
    return results;
  }

  // Check rate limit for batch
  if (redis) {
    try {
      const count = await redis.incr(RATE_LIMIT_KEY);

      if (count === 1) {
        await redis.expire(RATE_LIMIT_KEY, RATE_LIMIT_WINDOW);
      }

      if (count > RATE_LIMIT_MAX) {
        console.warn(
          `GeoIP batch rate limit reached (${count}/${RATE_LIMIT_MAX})`,
        );
        return results; // Return only cached results
      }
    } catch (error) {
      console.warn("Rate limit check failed:", error);
    }
  }

  // Fetch uncached IPs (max 100 per batch)
  const batchIPs = uncachedIPs.slice(0, 100);

  try {
    const response = await fetch(
      "http://ip-api.com/batch?fields=country,countryCode,city,region",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchIPs),
      },
    );

    if (response.ok) {
      const geoData: GeoIPData[] = await response.json();

      // Cache and store results
      for (let i = 0; i < batchIPs.length; i++) {
        const ip = batchIPs[i];
        const data = geoData[i];

        if (data && data.country) {
          results.set(ip, data);

          // Cache for 24 hours
          if (redis) {
            try {
              const cacheKey = `geoip:${ip}`;
              await redis.setex(cacheKey, 86400, JSON.stringify(data));
            } catch (error) {
              console.warn("GeoIP cache write failed:", error);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("GeoIP batch fetch failed:", error);
  }

  return results;
}

/**
 * Direct GeoIP fetch (no cache)
 */
async function fetchGeoIPDirect(ip: string): Promise<GeoIPData | null> {
  try {
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=country,countryCode,city,region`,
    );

    if (response.ok) {
      const data = await response.json();
      return data.country ? data : null;
    }
  } catch (error) {
    console.error("GeoIP fetch failed:", error);
  }

  return null;
}

/**
 * Get current rate limit status
 */
export async function getGeoIPRateLimitStatus(): Promise<{
  current: number;
  max: number;
  remaining: number;
}> {
  const redis = getRedis();

  if (!redis) {
    return { current: 0, max: RATE_LIMIT_MAX, remaining: RATE_LIMIT_MAX };
  }

  try {
    const count = await redis.get(RATE_LIMIT_KEY);
    const current = count ? parseInt(count as string) : 0;

    return {
      current,
      max: RATE_LIMIT_MAX,
      remaining: Math.max(0, RATE_LIMIT_MAX - current),
    };
  } catch (error) {
    return { current: 0, max: RATE_LIMIT_MAX, remaining: RATE_LIMIT_MAX };
  }
}
