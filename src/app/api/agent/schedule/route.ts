import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { scheduleNewsAgentJob, getUpcomingJobs } from "@/lib/queue";

export async function POST() {
  try {
    // Check authentication
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    // Schedule next job
    const result = await scheduleNewsAgentJob();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Zamanlama hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    // Check authentication
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    // Get upcoming jobs
    const jobs = await getUpcomingJobs();

    return NextResponse.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    console.error("İş listesi hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
