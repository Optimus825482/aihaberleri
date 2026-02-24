import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    const body = await request.json();
    const { isRead, isReplied } = body;

    const updated = await db.contactMessage.update({
      where: { id: params.id },
      data: {
        ...(isRead !== undefined && { isRead }),
        ...(isReplied !== undefined && { isReplied }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json(
      { error: "Mesaj güncellenemedi" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    await db.contactMessage.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json({ error: "Mesaj silinemedi" }, { status: 500 });
  }
}
