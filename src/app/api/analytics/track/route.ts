/**
 * Article Analytics Tracking API
 * Enhanced with scroll depth, device info, referrer
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { getGeolocation } from "@/lib/geolocation";
import { parseUserAgent } from "@/lib/ua-parser";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { articleId, duration, scrollDepth, referrer, screenWidth } = body;

    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 },
      );
    }

    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwarded?.split(",")[0] || realIp || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "unknown";
    const { device, browser, os } = parseUserAgent(userAgent);

    let locationData = null;
    try {
      locationData = await getGeolocation(ip);
    } catch {
      // Continue without location
    }

    await db.articleAnalytics.create({
      data: {
        articleId,
        ipAddress: ip,
        userAgent,
        duration: duration || 0,
        scrollDepth: scrollDepth || 0,
        device,
        browser,
        os,
        referrer: referrer || null,
        screenWidth: screenWidth || null,
        country: locationData?.country || null,
        countryCode: locationData?.countryCode || null,
        region: locationData?.region || null,
        city: locationData?.city || null,
        latitude: locationData?.latitude || null,
        longitude: locationData?.longitude || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
