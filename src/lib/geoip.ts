/**
 * GeoIP Service - IP bazlı konum tespiti
 * Ücretsiz servis: ip-api.com (45 req/min limit)
 */

interface GeoIPResponse {
  status: "success" | "fail";
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
  message?: string;
}

interface LocationData {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
}

// Cache için basit in-memory store (production'da Redis kullanılabilir)
const geoCache = new Map<string, { data: LocationData; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 saat

/**
 * IP adresinden konum bilgisi al
 */
export async function getLocationFromIP(
  ip: string,
): Promise<LocationData | null> {
  // Localhost veya private IP kontrolü
  if (
    !ip ||
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return {
      country: "Turkey",
      countryCode: "TR",
      region: "Istanbul",
      city: "Istanbul",
      lat: 41.0082,
      lon: 28.9784,
      timezone: "Europe/Istanbul",
      isp: "Local Network",
    };
  }

  // Cache kontrolü
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // IP-API.com ücretsiz endpoint (45 req/min limit)
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      {
        headers: {
          "User-Agent": "AIHaberleri/1.0",
        },
        // 5 saniye timeout
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      console.error(`GeoIP API error: ${response.status}`);
      return null;
    }

    const data: GeoIPResponse = await response.json();

    if (data.status === "fail") {
      console.error(`GeoIP lookup failed: ${data.message}`);
      return null;
    }

    const locationData: LocationData = {
      country: data.country || "Unknown",
      countryCode: data.countryCode || "XX",
      region: data.regionName || data.region || "Unknown",
      city: data.city || "Unknown",
      lat: data.lat || 0,
      lon: data.lon || 0,
      timezone: data.timezone || "UTC",
      isp: data.isp || "Unknown",
    };

    // Cache'e kaydet
    geoCache.set(ip, {
      data: locationData,
      timestamp: Date.now(),
    });

    return locationData;
  } catch (error) {
    console.error("GeoIP lookup error:", error);
    return null;
  }
}

/**
 * Request'ten IP adresini al (Cloudflare, Vercel, nginx proxy desteği)
 */
export function getClientIP(request: Request): string {
  // Cloudflare
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP;

  // Vercel
  const vercelIP = request.headers.get("x-real-ip");
  if (vercelIP) return vercelIP;

  // Standard proxy headers
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // İlk IP'yi al (client IP)
    return forwardedFor.split(",")[0].trim();
  }

  // Fallback
  return "127.0.0.1";
}

/**
 * Cache temizleme (opsiyonel, memory yönetimi için)
 */
export function clearGeoCache() {
  const now = Date.now();
  for (const [ip, cached] of geoCache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      geoCache.delete(ip);
    }
  }
}

/**
 * Ülke kodundan bayrak emoji al
 */
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";

  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * Konum verilerini formatla (UI için)
 */
export function formatLocation(location: LocationData | null): string {
  if (!location) return "Unknown Location";

  const parts = [location.city, location.region, location.country].filter(
    Boolean,
  );
  return parts.join(", ");
}
