import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { headers } from "next/headers";
import { getGeolocation } from "@/lib/geolocation";

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
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwarded?.split(",")[0] || realIp || "127.0.0.1";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Get location from IP (dual-provider: ipwho.is + ip-api.com)
    let locationData = null;
    try {
      locationData = await getGeolocation(ip);
    } catch (geoError) {
      console.warn("[TRACK] GeoIP lookup failed:", geoError);
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
