import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission, Permission } from "@/lib/permissions";

/**
 * GET /api/admin/templates
 * Get all article templates
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.VIEW_ARTICLE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const templates = await prisma.articleTemplate.findMany({
      where: { isActive: true },
      orderBy: { usageCount: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[GET_TEMPLATES_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/admin/templates
 * Create a new article template
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(session.user.role, Permission.CREATE_ARTICLE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, description, content, category } = await req.json();

    if (!name || !content) {
      return NextResponse.json(
        { error: "Name and content are required" },
        { status: 400 },
      );
    }

    const template = await prisma.articleTemplate.create({
      data: {
        name,
        description,
        content,
        category,
        createdBy: session.user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      template,
      message: "Template created successfully",
    });
  } catch (error) {
    console.error("[CREATE_TEMPLATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
