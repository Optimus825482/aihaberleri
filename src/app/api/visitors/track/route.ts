/**
 * Public Visitor Tracking API
 *
 * This endpoint is called from client-side to track visitors.
 * No authentication required - public endpoint.
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCachedGeolocation } from "@/lib/geolocation";

// Rate limit tracking (in-memory, per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute per IP

// In-memory geolocation cache
const geoCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

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

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
      const existingVisitorToken = request.cookies.get("visitor_token")?.value;
      const visitorToken = existingVisitorToken || crypto.randomUUID();

      const body = await request.json();
      const { userAgent, currentPage } = body;

      // Get IP from request headers (server-side) — no need for client-side external API
      const ipAddress =
        body.ipAddress || // backward compat
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown";

      if (!ipAddress || ipAddress === "unknown") {
        return NextResponse.json(
          { success: false, error: "IP address required" },
          { status: 400 },
        );
      }

      // Rate limit check
      if (!checkRateLimit(ipAddress)) {
        return NextResponse.json(
          { success: false, error: "Rate limit exceeded" },
          { status: 429 },
        );
      }

      // Get location from IP with caching
      let location = null;
      try {
        location = await getCachedGeolocation(ipAddress, memoryCache, 86400);
      } catch (error) {
        console.warn("Failed to get geolocation for", ipAddress, error);
      }

      // Upsert visitor — handle ipAddress race condition (P2002)
      let visitor;
      try {
        visitor = await db.visitor.upsert({
          where: { visitorToken },
          update: {
            ipAddress,
            userAgent: userAgent || undefined,
            currentPage: currentPage || "/",
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
            visitorToken,
            ipAddress,
            userAgent: userAgent || null,
            currentPage: currentPage || "/",
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
      } catch (upsertError: any) {
        // P2002 = unique constraint violation (ipAddress race condition)
        if (upsertError?.code === "P2002") {
          const existing = await db.visitor.findFirst({
            where: { ipAddress },
          });
          if (existing) {
            visitor = await db.visitor.update({
              where: { id: existing.id },
              data: {
                userAgent: userAgent || undefined,
                currentPage: currentPage || "/",
                lastActivity: new Date(),
                totalVisits: { increment: 1 },
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
          } else {
            throw upsertError;
          }
        } else {
          throw upsertError;
        }
      }

      const response = NextResponse.json({
        success: true,
        data: { id: visitor.id },
      });

      if (!existingVisitorToken) {
        response.cookies.set("visitor_token", visitorToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365,
          path: "/",
        });
      }

      return response;
  } catch (error) {
    console.error("Visitor track error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to track visitor" },
      { status: 500 },
    );
  }
}
