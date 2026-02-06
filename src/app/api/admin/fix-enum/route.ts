import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/fix-enum
 * SocialPlatform enum'una eksik değerleri ekler
 * Sadece admin kullanabilir
 */
export async function POST() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // PostgreSQL'de enum değerlerini tek tek ekle
    const enumValues = ["BLUESKY_EN", "MASTODON_EN", "FACEBOOK_EN", "TUMBLR_EN"];
    const results: string[] = [];

    for (const value of enumValues) {
      try {
        await prisma.$executeRawUnsafe(
          `ALTER TYPE "SocialPlatform" ADD VALUE IF NOT EXISTS '${value}'`
        );
        results.push(`✅ ${value} eklendi`);
      } catch (error: any) {
        if (error.message?.includes("already exists")) {
          results.push(`⚠️ ${value} zaten mevcut`);
        } else {
          results.push(`❌ ${value} eklenemedi: ${error.message}`);
        }
      }
    }

    // Mevcut enum değerlerini kontrol et
    const currentEnums = await prisma.$queryRaw<{ enum_range: string }[]>`
      SELECT enum_range(NULL::"SocialPlatform") as enum_range
    `;

    return NextResponse.json({
      success: true,
      results,
      currentEnums: currentEnums[0]?.enum_range,
    });
  } catch (error: any) {
    console.error("Enum fix error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fix enum" },
      { status: 500 }
    );
  }
}
