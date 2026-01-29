import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await db.pushSubscription.count();

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Push stats error:", error);
    return NextResponse.json(
      { success: false, error: "Bir hata oluştu" },
      { status: 500 },
    );
  }
}
