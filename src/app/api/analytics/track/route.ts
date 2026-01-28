import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { getClientIP, getLocationFromIP } from "@/lib/geoip";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { articleId, duration } = body;

    if (!articleId) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 },
      );
    }

    // Get client IP
    const ip = getClientIP(request);

    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "unknown";

    // Get location from IP (async, non-blocking)
    let locationData = null;
    try {
      locationData = await getLocationFromIP(ip);
    } catch (geoError) {
      console.warn("GeoIP lookup failed:", geoError);
      // Continue without location data
    }

    // Update or create analytics record for this session
    await db.articleAnalytics.create({
      data: {
        articleId,
        ipAddress: ip,
        userAgent,
        duration: duration || 0,
        country: locationData?.country || null,
        countryCode: locationData?.countryCode || null,
        region: locationData?.region || null,
        city: locationData?.city || null,
        latitude: locationData?.lat || null,
        longitude: locationData?.lon || null,
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
