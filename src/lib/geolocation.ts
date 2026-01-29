/**
 * IP Geolocation Service
 * Dual-provider system for reliable IP-to-location conversion
 *
 * Providers:
 * 1. ipwho.is - Primary (no API key, unlimited)
 * 2. ip-api.com - Fallback (fast, 45 req/min HTTPS)
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
  provider: "ipwho" | "ip-api" | "unknown";
}

/**
 * Fetch geolocation from ipwho.is
 * Pros: No API key, HTTPS, unlimited, clean JSON
 * Cons: Sometimes slower
 */
async function fetchFromIpwho(ip: string): Promise<GeolocationData | null> {
  try {
    const response = await fetch(`https://ipwho.is/${ip}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      console.warn(`[IPWHO] HTTP ${response.status} for IP: ${ip}`);
      return null;
    }

    const data = await response.json();

    // Check if request was successful
    if (!data.success) {
      console.warn(`[IPWHO] Request failed for IP: ${ip}`, data.message);
      return null;
    }

    return {
      ip,
      country: data.country || "Unknown",
      countryCode: data.country_code || "XX",
      region: data.region || "Unknown",
      city: data.city || "Unknown",
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      isp: data.connection?.isp || null,
      timezone: data.timezone?.id || null,
      provider: "ipwho",
    };
  } catch (error) {
    console.error("[IPWHO] Error:", error);
    return null;
  }
}

/**
 * Fetch geolocation from ip-api.com
 * Pros: Very fast, reliable, ISP data
 * Cons: 45 req/min on HTTPS (150 req/min on HTTP)
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
 * Get geolocation data with automatic fallback
 * Strategy: Try ipwho.is first, fallback to ip-api.com
 *
 * @param ip - IP address to lookup
 * @returns GeolocationData or null if both providers fail
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

  // Try ipwho.is first (primary)
  const ipwhoResult = await fetchFromIpwho(ip);
  if (ipwhoResult) {
    console.log(
      `[GEO] Success via ipwho.is: ${ip} -> ${ipwhoResult.city}, ${ipwhoResult.country}`,
    );
    return ipwhoResult;
  }

  // Fallback to ip-api.com
  console.warn(`[GEO] ipwho.is failed, trying ip-api.com for ${ip}`);
  const ipApiResult = await fetchFromIpApi(ip);
  if (ipApiResult) {
    console.log(
      `[GEO] Success via ip-api.com: ${ip} -> ${ipApiResult.city}, ${ipApiResult.country}`,
    );
    return ipApiResult;
  }

  // Both providers failed
  console.error(`[GEO] All providers failed for IP: ${ip}`);
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
      console.log(`[GEO] Cache hit for ${ip}`);
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
      console.log(`[GEO] Cached data for ${ip} (TTL: ${ttl}s)`);
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
 * Compare providers (for testing/monitoring)
 * Returns response time and success for both
 */
export async function compareProviders(ip: string) {
  const start1 = Date.now();
  const ipwho = await fetchFromIpwho(ip);
  const time1 = Date.now() - start1;

  const start2 = Date.now();
  const ipApi = await fetchFromIpApi(ip);
  const time2 = Date.now() - start2;

  return {
    ipwho: {
      success: !!ipwho,
      responseTime: time1,
      data: ipwho,
    },
    ipApi: {
      success: !!ipApi,
      responseTime: time2,
      data: ipApi,
    },
  };
}
