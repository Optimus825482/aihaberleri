/**
 * IP Geolocation Service
 * Single provider: ip-api.com (fast, reliable, 45 req/min)
 */

export interface GeolocationData {
  ip: string;
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  isp: string | null;
  timezone: string | null;
  provider: "ip-api" | "unknown";
}

/**
 * Fetch geolocation from ip-api.com
 * Pros: Very fast, reliable, ISP data
 * Rate limit: 45 req/min on HTTPS (150 req/min on HTTP)
 */
async function fetchFromIpApi(ip: string): Promise<GeolocationData | null> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000), // 3s timeout (faster)
    });

    if (!response.ok) {
      console.warn(`[IP-API] HTTP ${response.status} for IP: ${ip}`);
      return null;
    }

    const data = await response.json();

    // Check if request was successful
    if (data.status !== "success") {
      console.warn(`[IP-API] Request failed for IP: ${ip}`, data.message);
      return null;
    }

    return {
      ip,
      country: data.country || "Unknown",
      countryCode: data.countryCode || "XX",
      region: data.regionName || "Unknown",
      city: data.city || "Unknown",
      latitude: data.lat || null,
      longitude: data.lon || null,
      isp: data.isp || null,
      timezone: data.timezone || null,
      provider: "ip-api",
    };
  } catch (error) {
    console.error("[IP-API] Error:", error);
    return null;
  }
}

/**
 * Get geolocation data
 * Uses ip-api.com directly
 *
 * @param ip - IP address to lookup
 * @returns GeolocationData or null if provider fails
 */
export async function getGeolocation(
  ip: string,
): Promise<GeolocationData | null> {
  // Localhost/private IP fallback
  if (
    !ip ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return {
      ip,
      country: "Local",
      countryCode: "LO",
      region: "Localhost",
      city: "Development",
      latitude: null,
      longitude: null,
      isp: null,
      timezone: null,
      provider: "unknown",
    };
  }

  // Use ip-api.com directly
  const result = await fetchFromIpApi(ip);
  if (result) {
    console.log(`[GEO] Success: ${ip} -> ${result.city}, ${result.country}`);
    return result;
  }

  // Provider failed
  console.error(`[GEO] ip-api.com failed for IP: ${ip}`);
  return null;
}

/**
 * Get geolocation with caching support
 * Use this in API routes with Redis cache to avoid rate limits
 *
 * @param ip - IP address
 * @param cache - Optional cache object with get/set methods
 * @param ttl - Cache TTL in seconds (default: 1 day)
 */
export async function getCachedGeolocation(
  ip: string,
  cache?: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string, ttl: number) => Promise<void>;
  },
  ttl: number = 86400, // 1 day
): Promise<GeolocationData | null> {
  if (!cache) {
    return getGeolocation(ip);
  }

  const cacheKey = `geo:${ip}`;

  // Try cache first
  try {
    const cached = await cache.get(cacheKey);
    if (cached) {
      const data = JSON.parse(cached) as GeolocationData;
      return data;
    }
  } catch (error) {
    console.warn("[GEO] Cache read error:", error);
  }

  // Cache miss - fetch fresh data
  const data = await getGeolocation(ip);

  // Store in cache
  if (data) {
    try {
      await cache.set(cacheKey, JSON.stringify(data), ttl);
    } catch (error) {
      console.warn("[GEO] Cache write error:", error);
    }
  }

  return data;
}

/**
 * Batch geolocation lookup
 * Useful for admin panel visitor list
 *
 * @param ips - Array of IP addresses
 * @returns Map of IP -> GeolocationData
 */
export async function batchGetGeolocation(
  ips: string[],
): Promise<Map<string, GeolocationData>> {
  const uniqueIps = [...new Set(ips)];
  const results = new Map<string, GeolocationData>();

  // Process in parallel with concurrency limit (10 at a time)
  const concurrencyLimit = 10;
  for (let i = 0; i < uniqueIps.length; i += concurrencyLimit) {
    const batch = uniqueIps.slice(i, i + concurrencyLimit);
    const batchResults = await Promise.all(
      batch.map(async (ip) => {
        const data = await getGeolocation(ip);
        return { ip, data };
      }),
    );

    batchResults.forEach(({ ip, data }) => {
      if (data) {
        results.set(ip, data);
      }
    });

    // Rate limiting: wait 1 second between batches
    if (i + concurrencyLimit < uniqueIps.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Test provider (for monitoring)
 * Returns response time and success
 */
export async function testProvider(ip: string) {
  const start = Date.now();
  const result = await fetchFromIpApi(ip);
  const time = Date.now() - start;

  return {
    provider: "ip-api",
    success: !!result,
    responseTime: time,
    data: result,
  };
}
