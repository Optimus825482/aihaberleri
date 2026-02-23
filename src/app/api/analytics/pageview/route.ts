/**
 * PageView Tracking API
 * Records every page visit with full metrics
 * Optimized for Next.js 14 — synchronous DB writes before response
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCachedGeolocation } from "@/lib/geolocation";
import { parseUserAgent } from "@/lib/ua-parser";
import { RateLimiter, createRateLimitHeaders } from "@/lib/rate-limiter";

const pageViewRateLimiter = new RateLimiter();
const PAGEVIEW_RATE_LIMIT = { maxRequests: 30, windowMs: 60000 };

// In-memory geo cache
const geoCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;
const memoryCache = {
  get: async (key: string) => {
    const cached = geoCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
    return null;
  },
  set: async (key: string, value: string) => {
    geoCache.set(key, { data: value, timestamp: Date.now() });
  },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle sendBeacon updates (sendBeacon only supports POST, not PATCH)
    if (body._update) {
      const {
        visitorId,
        path: updatePath,
        duration,
        scrollDepth,
        exitPage,
      } = body;
      if (!visitorId || !updatePath) {
        return NextResponse.json(
          { error: "visitorId and path required" },
          { status: 400 },
        );
      }
      const pageView = await db.pageView.findFirst({
        where: { visitorId, path: updatePath },
        orderBy: { createdAt: "desc" },
      });
      if (pageView) {
        await db.pageView.update({
          where: { id: pageView.id },
          data: {
            duration: duration || pageView.duration,
            scrollDepth: Math.max(scrollDepth || 0, pageView.scrollDepth),
            exitPage: exitPage || false,
            bounced: (duration || pageView.duration) < 10,
          },
        });
      }
      return NextResponse.json({ success: true });
    }

    const { path, referrer, duration, scrollDepth, articleId, screenWidth } =
      body;

    if (!path) {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    // Get IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const rateLimit = await pageViewRateLimiter.check(
      `analytics:pageview:ip:${ip}`,
      PAGEVIEW_RATE_LIMIT,
    );
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limited", retryAfter: rateLimit.retryAfter },
        { status: 429, headers: createRateLimitHeaders(rateLimit) },
      );
    }

    const existingVisitorToken = request.cookies.get("visitor_token")?.value;
    const visitorToken = existingVisitorToken || crypto.randomUUID();

    const userAgent = request.headers.get("user-agent") || "";
    const { device, browser, os } = parseUserAgent(userAgent);

    // Geo lookup (cached, non-blocking on failure)
    let geo: any = null;
    try {
      geo = await getCachedGeolocation(ip, memoryCache, 86400);
    } catch {
      // Continue without geo
    }

    // Upsert visitor with full data
    const visitor = await db.visitor.upsert({
      where: { visitorToken },
      update: {
        ipAddress: ip,
        userAgent,
        currentPage: path,
        lastActivity: new Date(),
        device,
        browser,
        os,
        totalVisits: { increment: 1 },
        lastReferrer: referrer || undefined,
        ...(geo && {
          country: geo.country,
          countryCode: geo.countryCode,
          city: geo.city,
          region: geo.region,
          isp: geo.isp,
          latitude: geo.latitude,
          longitude: geo.longitude,
          timezone: geo.timezone,
          provider: geo.provider,
        }),
      },
      create: {
        visitorToken,
        ipAddress: ip,
        userAgent,
        currentPage: path,
        device,
        browser,
        os,
        lastReferrer: referrer || null,
        ...(geo && {
          country: geo.country,
          countryCode: geo.countryCode,
          city: geo.city,
          region: geo.region,
          isp: geo.isp,
          latitude: geo.latitude,
          longitude: geo.longitude,
          timezone: geo.timezone,
          provider: geo.provider,
        }),
      },
    });

    // Create PageView record
    await db.pageView.create({
      data: {
        visitorId: visitor.id,
        path,
        referrer: referrer || null,
        duration: duration || 0,
        scrollDepth: scrollDepth || 0,
        articleId: articleId || null,
        device,
        browser,
        os,
        screenWidth: screenWidth || null,
        country: geo?.country || null,
        countryCode: geo?.countryCode || null,
        city: geo?.city || null,
        bounced: !duration || duration < 10,
      },
    });

    const response = NextResponse.json({
      success: true,
      visitorId: visitor.id,
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
    console.error("[PageView] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Update duration/scroll for existing pageview
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { visitorId, path, duration, scrollDepth, exitPage } = body;

    if (!visitorId || !path) {
      return NextResponse.json(
        { error: "visitorId and path required" },
        { status: 400 },
      );
    }

    // Find the most recent pageview for this visitor+path
    const pageView = await db.pageView.findFirst({
      where: { visitorId, path },
      orderBy: { createdAt: "desc" },
    });

    if (pageView) {
      await db.pageView.update({
        where: { id: pageView.id },
        data: {
          duration: duration || pageView.duration,
          scrollDepth: Math.max(scrollDepth || 0, pageView.scrollDepth),
          exitPage: exitPage || false,
          bounced: (duration || pageView.duration) < 10 ? true : false,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PageView PATCH] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
