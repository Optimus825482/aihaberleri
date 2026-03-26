import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    // Auth check
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

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
