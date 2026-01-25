import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// Default settings
const DEFAULT_SETTINGS = {
  heroCarouselCount: 5,
  heroCarouselInterval: 6000, // 6 seconds
};

// GET - Fetch settings
export async function GET() {
  try {
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: ["heroCarouselCount", "heroCarouselInterval"],
        },
      },
    });

    const settingsMap = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = parseInt(setting.value);
        return acc;
      },
      {} as Record<string, number>,
    );

    // Merge with defaults
    const result = {
      ...DEFAULT_SETTINGS,
      ...settingsMap,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch settings",
      },
      { status: 500 },
    );
  }
}

// POST - Update settings
export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { heroCarouselCount, heroCarouselInterval } = body;

    // Validate
    if (
      heroCarouselCount < 1 ||
      heroCarouselCount > 10 ||
      heroCarouselInterval < 2000 ||
      heroCarouselInterval > 15000
    ) {
      return NextResponse.json({ error: "Geçersiz değerler" }, { status: 400 });
    }

    // Update or create settings
    await Promise.all([
      db.setting.upsert({
        where: { key: "heroCarouselCount" },
        update: { value: heroCarouselCount.toString() },
        create: {
          key: "heroCarouselCount",
          value: heroCarouselCount.toString(),
        },
      }),
      db.setting.upsert({
        where: { key: "heroCarouselInterval" },
        update: { value: heroCarouselInterval.toString() },
        create: {
          key: "heroCarouselInterval",
          value: heroCarouselInterval.toString(),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Ayarlar kaydedildi",
    });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update settings",
      },
      { status: 500 },
    );
  }
}
