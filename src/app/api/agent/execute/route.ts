import { NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { executeNewsAgent } from "@/services/agent.service";

export async function POST() {
  try {
    // Check authentication
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session;
    }

    // Execute agent
    const result = await executeNewsAgent();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Agent çalıştırma hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
