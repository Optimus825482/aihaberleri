import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedGeolocation } from "@/lib/geolocation";

// Force dynamic rendering
export const dynamic = "force-dynamic";

// In-memory cache for geolocation to avoid repeated API calls
const geoCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode === "XX") return "🌍";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Simple in-memory cache adapter for geolocation
const memoryCache = {
  get: async (key: string) => {
    const cached = geoCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  },
  set: async (key: string, value: string, ttl: number) => {
    geoCache.set(key, { data: value, timestamp: Date.now() });
  },
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Get visitors from last 5 minutes (active visitors)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Optimized query with select to reduce data transfer
    const visitors = await db.visitor.findMany({
      where: {
        lastActivity: {
          gte: fiveMinutesAgo,
        },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        currentPage: true,
        country: true,
        countryCode: true,
        city: true,
        region: true,
        isp: true,
        latitude: true,
        longitude: true,
        timezone: true,
        provider: true,
        lastActivity: true,
        createdAt: true,
      },
      orderBy: {
        lastActivity: "desc",
      },
    });

    // Enrich with flag emoji and location string
    const enrichedVisitors = visitors.map((visitor) => ({
      ...visitor,
      flag: visitor.countryCode ? getFlagEmoji(visitor.countryCode) : "🌍",
      location: [visitor.city, visitor.country].filter(Boolean).join(", "),
    }));

    // Get stats efficiently
    const totalVisitors = await db.visitor.count();
    const activeVisitors = visitors.length;
    const uniqueCountries = new Set(
      visitors.map((v) => v.country).filter(Boolean),
    ).size;

    return NextResponse.json({
      success: true,
      data: {
        visitors: enrichedVisitors,
        stats: {
          total: totalVisitors,
          active: activeVisitors,
          uniqueCountries,
          lastUpdate: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("Visitors fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint is called from client-side to track visitors
    const body = await request.json();
    const { ipAddress, userAgent, currentPage } = body;

    if (!ipAddress) {
      return NextResponse.json({ error: "IP adresi gerekli" }, { status: 400 });
    }

    // Get location from IP with caching (dual-provider: ipwho.is + ip-api.com)
    const location = await getCachedGeolocation(ipAddress, memoryCache, 86400);

    // Upsert visitor (update if exists, create if not)
    const visitor = await db.visitor.upsert({
      where: { ipAddress },
      update: {
        userAgent,
        currentPage,
        lastActivity: new Date(),
        ...(location && {
          country: location.country,
          countryCode: location.countryCode,
          city: location.city,
          region: location.region,
          isp: location.isp,
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: location.timezone,
          provider: location.provider,
        }),
      },
      create: {
        ipAddress,
        userAgent,
        currentPage,
        ...(location && {
          country: location.country,
          countryCode: location.countryCode,
          city: location.city,
          region: location.region,
          isp: location.isp,
          latitude: location.latitude,
          longitude: location.longitude,
          timezone: location.timezone,
          provider: location.provider,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: visitor,
    });
  } catch (error) {
    console.error("Visitor track error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

// Cleanup old visitors (called periodically by cron or manually)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Use the cron service for cleanup
    const { triggerVisitorCleanup } = await import("@/lib/cron");
    const result = await triggerVisitorCleanup();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `${result.count} eski ziyaretçi silindi`,
        count: result.count,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Cleanup failed",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Visitor cleanup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
