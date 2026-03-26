import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminAuth } from "@/lib/admin-auth";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    // Auth check
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

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
