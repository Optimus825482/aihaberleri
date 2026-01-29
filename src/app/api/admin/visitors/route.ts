import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLocationFromIP, getFlagEmoji } from "@/lib/geoip";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Get visitors from last 5 minutes (active visitors)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const visitors = await db.visitor.findMany({
      where: {
        lastActivity: {
          gte: fiveMinutesAgo,
        },
      },
      orderBy: {
        lastActivity: "desc",
      },
    });

    // Enrich with flag emoji
    const enrichedVisitors = visitors.map((visitor) => ({
      ...visitor,
      flag: visitor.countryCode ? getFlagEmoji(visitor.countryCode) : "🌍",
      location: [visitor.city, visitor.country].filter(Boolean).join(", "),
    }));

    // Get stats
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

    // Get location from IP
    const location = await getLocationFromIP(ipAddress);

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

// Cleanup old visitors (called periodically)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Delete visitors older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const result = await db.visitor.deleteMany({
      where: {
        lastActivity: {
          lt: oneHourAgo,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} eski ziyaretçi silindi`,
    });
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
