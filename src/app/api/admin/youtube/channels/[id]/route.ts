import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/youtube/channels/[id]
 * Update a YouTube channel
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    const body = await request.json();
    const { name, language, category, priority, isActive } = body;

    const channel = await (db as any).youTubeChannel.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(language !== undefined && { language }),
        ...(category !== undefined && { category }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, data: channel });
  } catch (error) {
    console.error("YouTube channel update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/admin/youtube/channels/[id]
 * Delete a YouTube channel
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) return session;

    await (db as any).youTubeChannel.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("YouTube channel delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
