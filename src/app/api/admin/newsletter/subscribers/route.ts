import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch newsletter subscribers
export async function GET() {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    // Get all newsletter subscribers
    const subscribers = await prisma.newsletter.findMany({
      orderBy: {
        subscribedAt: "desc",
      },
      select: {
        id: true,
        email: true,
        status: true,
        subscribedAt: true,
      },
    });

    // Get stats
    const activeCount = subscribers.filter((s) => s.status === "ACTIVE").length;
    const unsubscribedCount = subscribers.filter(
      (s) => s.status === "UNSUBSCRIBED",
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        subscribers: subscribers.map((s) => ({
          id: s.id,
          email: s.email,
          status: s.status,
          subscribedAt: s.subscribedAt.toISOString(),
        })),
        stats: {
          total: subscribers.length,
          active: activeCount,
          unsubscribed: unsubscribedCount,
        },
      },
    });
  } catch (error) {
    console.error("Newsletter subscribers error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch newsletter subscribers" },
      { status: 500 },
    );
  }
}

// DELETE - Remove a subscriber
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdminAuth();
    if (session instanceof NextResponse) {
      return session; // Return 401 response
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Subscriber ID required" },
        { status: 400 },
      );
    }

    await prisma.newsletter.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Subscriber deleted successfully",
    });
  } catch (error) {
    console.error("Delete subscriber error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete subscriber" },
      { status: 500 },
    );
  }
}
