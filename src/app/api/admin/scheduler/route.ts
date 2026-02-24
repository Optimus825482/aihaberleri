/**
 * Smart Scheduler API
 *
 * Endpoints:
 * - GET: Get current schedule info
 * - POST: Update scheduler settings or trigger breaking news mode
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  getSchedulerSettings,
  setBreakingNewsMode,
  updateSchedulerSetting,
  type SchedulerConfig,
} from "@/lib/smart-scheduler";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/scheduler
 * Returns current scheduler status and configuration
 */
export async function GET() {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    const settings = await getSchedulerSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Failed to get scheduler settings:", error);
    return NextResponse.json(
      { error: "Failed to get scheduler settings" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/scheduler
 * Update scheduler settings or trigger breaking news mode
 *
 * Body options:
 * 1. { action: "breakingNews", enabled: boolean, durationMinutes?: number }
 * 2. { action: "updateSetting", key: string, value: any }
 * 3. { action: "updateConfig", config: Partial<SchedulerConfig> }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "breakingNews": {
        const { enabled, durationMinutes = 60 } = body;
        const success = await setBreakingNewsMode(enabled, durationMinutes);

        return NextResponse.json({
          success,
          message: enabled
            ? `Breaking news mode enabled for ${durationMinutes} minutes`
            : "Breaking news mode disabled",
        });
      }

      case "updateSetting": {
        const { key, value } = body;
        if (!key) {
          return NextResponse.json(
            { error: "Setting key is required" },
            { status: 400 },
          );
        }

        await updateSchedulerSetting(key as keyof SchedulerConfig, value);

        return NextResponse.json({
          success: true,
          message: `Setting ${key} updated to ${value}`,
        });
      }

      case "updateConfig": {
        const { config } = body;
        if (!config || typeof config !== "object") {
          return NextResponse.json(
            { error: "Config object is required" },
            { status: 400 },
          );
        }

        for (const [key, value] of Object.entries(config)) {
          await updateSchedulerSetting(
            key as keyof SchedulerConfig,
            value as any,
          );
        }

        return NextResponse.json({
          success: true,
          message: "Config updated successfully",
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Invalid action. Use: breakingNews, updateSetting, or updateConfig",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("Failed to update scheduler:", error);
    return NextResponse.json(
      { error: "Failed to update scheduler" },
      { status: 500 },
    );
  }
}
