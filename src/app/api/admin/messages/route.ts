import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter") || "all"; // all, unread, read

    const where =
      filter === "unread"
        ? { isRead: false }
        : filter === "read"
          ? { isRead: true }
          : {};

    const messages = await db.contactMessage.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    const stats = await db.contactMessage.groupBy({
      by: ["isRead"],
      _count: true,
    });

    const unreadCount = stats.find((s) => s.isRead === false)?._count || 0;
    const readCount = stats.find((s) => s.isRead === true)?._count || 0;

    return NextResponse.json({
      success: true,
      data: {
        messages,
        stats: {
          total: messages.length,
          unread: unreadCount,
          read: readCount,
        },
      },
    });
  } catch (error) {
    console.error("Messages fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const body = await request.json();
    const { id, isRead, isReplied } = body;

    const message = await db.contactMessage.update({
      where: { id },
      data: {
        ...(typeof isRead === "boolean" && { isRead }),
        ...(typeof isReplied === "boolean" && { isReplied }),
      },
    });

    return NextResponse.json({
      success: true,
      data: message,
    });
  } catch (error) {
    console.error("Message update error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Mesaj ID gerekli" }, { status: 400 });
    }

    await db.contactMessage.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Mesaj silindi",
    });
  } catch (error) {
    console.error("Message delete error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
