import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-this",
);

/**
 * GET /api/admin/me
 * Get current user from session
 */
export async function GET() {
  try {
    const token = cookies().get("admin-session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    const { payload } = await jwtVerify(token, JWT_SECRET);

    return NextResponse.json({
      success: true,
      user: payload,
    });
  } catch (error) {
    console.error("[GET_ME] Error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
