import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params;

    await prisma.sEORecommendation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete recommendation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Öneri silinemedi",
      },
      { status: 500 },
    );
  }
}
