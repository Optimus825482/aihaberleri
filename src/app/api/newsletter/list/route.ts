import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check authentication - support both NextAuth and admin-session JWT
    const [session, adminSession] = await Promise.all([
      auth(),
      getAdminSession(),
    ]);
    if (!session && !adminSession) {
      return NextResponse.json(
        { success: false, error: "Yetkisiz erişim" },
        { status: 401 },
      );
    }

    const subscribers = await db.newsletter.findMany({
      orderBy: { subscribedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      subscribers,
    });
  } catch (error) {
    console.error("Newsletter list error:", error);
    return NextResponse.json(
      { success: false, error: "Bir hata oluştu" },
      { status: 500 },
    );
  }
}
