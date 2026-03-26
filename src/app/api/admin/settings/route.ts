import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { scheduleNewsAgentJob } from "@/lib/queue";
import {
  checkSimpleRateLimit as checkRateLimit,
  getSimpleRateLimitHeaders as getRateLimitHeaders,
} from "@/lib/rate-limiter";

export const dynamic = "force-dynamic";

// Rate limit: 30 requests per minute for admin settings
const SETTINGS_RATE_LIMIT = 30;
const SETTINGS_WINDOW = 60; // seconds

/**
 * Get client IP from request
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return "unknown";
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication with JWT
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    const [settings, socialMedia] = await Promise.all([
      db.setting.findMany({
        orderBy: {
          key: "asc",
        },
      }),
      db.socialMedia.findMany({
        orderBy: {
          platform: "asc",
        },
      }),
    ]);

    // Group settings by category
    const groupedSettings = {
      general: settings.filter((s) => s.key.startsWith("site_")),
      seo: settings.filter((s) => s.key.startsWith("seo_")),
      email: settings.filter((s) => s.key.startsWith("email_")),
      agent: settings.filter((s) => s.key.startsWith("agent_")),
      social_share: settings.filter((s) => s.key.startsWith("social_share_")),
      other: settings.filter(
        (s) =>
          !s.key.startsWith("site_") &&
          !s.key.startsWith("seo_") &&
          !s.key.startsWith("email_") &&
          !s.key.startsWith("agent_") &&
          !s.key.startsWith("social_share_"),
      ),
    };

    return NextResponse.json({
      success: true,
      data: {
        settings: groupedSettings,
        socialMedia,
      },
    });
  } catch (error) {
    console.error("Settings fetch error:", error);
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
    // Check rate limit first (before auth to prevent abuse)
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(
      `admin:settings:${clientIp}`,
      SETTINGS_RATE_LIMIT,
      SETTINGS_WINDOW,
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult, SETTINGS_RATE_LIMIT),
        },
      );
    }

    // Check authentication with JWT
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    const body = await request.json();
    const { key, value, encrypted = false } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key ve value gerekli" },
        { status: 400 },
      );
    }

    const setting = await db.setting.upsert({
      where: { key },
      update: { value, encrypted },
      create: { key, value, encrypted },
    });

    // PHASE 2: If agent.intervalHours changed, immediately reschedule the job
    if (key === "agent.intervalHours") {
      console.log(
        `🔄 Agent interval changed to ${value} hours - rescheduling immediately...`,
      );
      try {
        await scheduleNewsAgentJob();
        console.log("✅ Agent rescheduled successfully");
      } catch (error) {
        console.error("⚠️  Failed to reschedule agent:", error);
        // Don't fail the entire request if rescheduling fails
      }
    }

    return NextResponse.json({
      success: true,
      data: setting,
    });
  } catch (error) {
    console.error("Setting save error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check rate limit first (before auth to prevent abuse)
    const clientIp = getClientIp(request);
    const rateLimitResult = await checkRateLimit(
      `admin:settings:${clientIp}`,
      SETTINGS_RATE_LIMIT,
      SETTINGS_WINDOW,
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult, SETTINGS_RATE_LIMIT),
        },
      );
    }

    // Check authentication with JWT
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    const body = await request.json();
    const { platform, url, enabled } = body;

    if (!platform) {
      return NextResponse.json({ error: "Platform gerekli" }, { status: 400 });
    }

    const socialMedia = await db.socialMedia.upsert({
      where: { platform },
      update: {
        ...(url !== undefined && { url }),
        ...(typeof enabled === "boolean" && { enabled }),
      },
      create: {
        platform,
        url: url || "",
        enabled: enabled ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: socialMedia,
    });
  } catch (error) {
    console.error("Social media update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
