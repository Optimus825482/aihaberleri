import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executeNewsAgent } from "@/services/agent.service";

export async function POST() {
  try {
    // Check authentication
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
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
