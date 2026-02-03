import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    const recommendation = await prisma.sEORecommendation.update({
      where: { id },
      data: {
        isResolved: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: recommendation,
    });
  } catch (error) {
    console.error("Resolve recommendation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Öneri güncellenemedi",
      },
      { status: 500 },
    );
  }
}
