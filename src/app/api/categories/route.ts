import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET - List all categories
export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Kategori listesi hatası:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
