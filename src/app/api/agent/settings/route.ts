import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

// Settings schema
const settingsSchema = z.object({
  enabled: z.boolean(),
  intervalHours: z.number().min(1).max(24),
  articlesPerRun: z.number().min(1).max(10),
  categories: z.array(z.string()),
  emailNotifications: z.boolean(),
  adminEmail: z.string().email(),
});

// Default settings
const DEFAULT_SETTINGS = {
  enabled: true,
  intervalHours: 6,
  articlesPerRun: 3,
  categories: [],
  emailNotifications: true,
  adminEmail: "ikinciyenikitap54@gmail.com",
};

// Get agent settings
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Get settings from database
    const settings = await db.setting.findMany({
      where: {
        key: {
          in: [
            "agent.enabled",
            "agent.intervalHours",
            "agent.articlesPerRun",
            "agent.categories",
            "agent.lastRun",
            "agent.nextRun",
            "agent.emailNotifications",
            "agent.adminEmail",
          ],
        },
      },
    });

    // Parse settings
    const settingsMap = settings.reduce(
      (acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      },
      {} as Record<string, string>,
    );

    // Get all categories for selection
    const categories = await db.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    // Parse and return settings
    const agentSettings = {
      enabled:
        settingsMap["agent.enabled"] === "true" || DEFAULT_SETTINGS.enabled,
      intervalHours: parseInt(
        settingsMap["agent.intervalHours"] ||
          String(DEFAULT_SETTINGS.intervalHours),
      ),
      articlesPerRun: parseInt(
        settingsMap["agent.articlesPerRun"] ||
          String(DEFAULT_SETTINGS.articlesPerRun),
      ),
      categories: settingsMap["agent.categories"]
        ? JSON.parse(settingsMap["agent.categories"])
        : DEFAULT_SETTINGS.categories,
      lastRun: settingsMap["agent.lastRun"] || null,
      nextRun: settingsMap["agent.nextRun"] || null,
      emailNotifications:
        settingsMap["agent.emailNotifications"] === "true" ||
        DEFAULT_SETTINGS.emailNotifications,
      adminEmail:
        settingsMap["agent.adminEmail"] || DEFAULT_SETTINGS.adminEmail,
    };

    return NextResponse.json({
      success: true,
      data: {
        settings: agentSettings,
        availableCategories: categories,
      },
    });
  } catch (error) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

// Update agent settings
export async function PUT(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedSettings = settingsSchema.parse(body);

    // Update settings in database
    await Promise.all([
      db.setting.upsert({
        where: { key: "agent.enabled" },
        update: { value: String(validatedSettings.enabled) },
        create: {
          key: "agent.enabled",
          value: String(validatedSettings.enabled),
        },
      }),
      db.setting.upsert({
        where: { key: "agent.intervalHours" },
        update: { value: String(validatedSettings.intervalHours) },
        create: {
          key: "agent.intervalHours",
          value: String(validatedSettings.intervalHours),
        },
      }),
      db.setting.upsert({
        where: { key: "agent.articlesPerRun" },
        update: { value: String(validatedSettings.articlesPerRun) },
        create: {
          key: "agent.articlesPerRun",
          value: String(validatedSettings.articlesPerRun),
        },
      }),
      db.setting.upsert({
        where: { key: "agent.categories" },
        update: { value: JSON.stringify(validatedSettings.categories) },
        create: {
          key: "agent.categories",
          value: JSON.stringify(validatedSettings.categories),
        },
      }),
      db.setting.upsert({
        where: { key: "agent.emailNotifications" },
        update: { value: String(validatedSettings.emailNotifications) },
        create: {
          key: "agent.emailNotifications",
          value: String(validatedSettings.emailNotifications),
        },
      }),
      db.setting.upsert({
        where: { key: "agent.adminEmail" },
        update: { value: validatedSettings.adminEmail },
        create: {
          key: "agent.adminEmail",
          value: validatedSettings.adminEmail,
        },
      }),
    ]);

    // Calculate next run time if enabled
    if (validatedSettings.enabled) {
      const nextRun = new Date();
      nextRun.setHours(nextRun.getHours() + validatedSettings.intervalHours);

      await db.setting.upsert({
        where: { key: "agent.nextRun" },
        update: { value: nextRun.toISOString() },
        create: { key: "agent.nextRun", value: nextRun.toISOString() },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Ayarlar başarıyla güncellendi",
      data: validatedSettings,
    });
  } catch (error) {
    console.error("Update settings error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: "Geçersiz veri formatı",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
