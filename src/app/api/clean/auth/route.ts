import { NextRequest, NextResponse } from "next/server";

const CLEAN_PASSWORD = process.env.CLEAN_ACCESS_PASSWORD;
const CLEAN_COOKIE = "clean_access";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = typeof body?.password === "string" ? body.password : "";

    if (!CLEAN_PASSWORD) {
      return NextResponse.json({ success: false, error: "CLEAN_ACCESS_PASSWORD is not configured" }, { status: 500 });
    }

    if (password !== CLEAN_PASSWORD) {
      return NextResponse.json({ success: false, error: "Wrong password" }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(CLEAN_COOKIE, "ok", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch (_error: unknown) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
