import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type TrackerStatus = "new" | "reviewing" | "saved";

const MAX_TEXT = 500;

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeStatus(value: unknown): TrackerStatus | null {
  if (value === "new" || value === "reviewing" || value === "saved") return value;
  return null;
}

export async function GET() {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  try {
    const items = await db.aiNewsTrackerItem.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: items,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const title = getString(body?.title);
    const url = getString(body?.url);
    const source = getString(body?.source);
    const notes = getString(body?.notes);

    if (!title || !url || !source) {
      return NextResponse.json(
        { success: false, error: "title, url ve source zorunlu" },
        { status: 400 },
      );
    }

    if (!isHttpUrl(url)) {
      return NextResponse.json(
        { success: false, error: "Geçerli bir http/https URL girin" },
        { status: 400 },
      );
    }

    if (title.length > MAX_TEXT || source.length > MAX_TEXT || notes.length > 2000) {
      return NextResponse.json(
        { success: false, error: "Metin alanları limitin üzerinde" },
        { status: 400 },
      );
    }

    const item = await db.aiNewsTrackerItem.create({
      data: {
        title,
        url,
        source,
        notes,
        status: "new",
      },
    });

    return NextResponse.json({
      success: true,
      data: item,
    });
  } catch (error: unknown) {
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
  const session = await requireAdminAuth();
  if (session instanceof NextResponse) return session;

  try {
    const body = await request.json();
    const id = getString(body?.id);
    const status = normalizeStatus(body?.status);
    const notes = body?.notes;

    if (!id) {
      return NextResponse.json({ success: false, error: "id zorunlu" }, { status: 400 });
    }

    if (status === null && notes === undefined) {
      return NextResponse.json(
        { success: false, error: "status veya notes alanı gerekli" },
        { status: 400 },
      );
    }

    if (notes !== undefined && typeof notes !== "string") {
      return NextResponse.json(
        { success: false, error: "notes metin olmalı" },
        { status: 400 },
      );
    }

    const notesValue = typeof notes === "string" ? notes.trim() : undefined;
    if (notesValue !== undefined && notesValue.length > 2000) {
      return NextResponse.json(
        { success: false, error: "notes alanı çok uzun" },
        { status: 400 },
      );
    }

    const exists = await db.aiNewsTrackerItem.findUnique({ where: { id } });
    if (!exists) {
      return NextResponse.json(
        { success: false, error: "Kayıt bulunamadı" },
        { status: 404 },
      );
    }

    const updated = await db.aiNewsTrackerItem.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(notesValue !== undefined ? { notes: notesValue } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      },
      { status: 500 },
    );
  }
}
